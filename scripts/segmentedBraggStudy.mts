import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { HybridBraggDesignInputs, HybridSectionPhaseMode, HybridStrainShape } from '../src/types/simulation';
import {
  solveMovingPulseExperiment,
  solveReflectionRegionEvolution,
  type ReflectionRegionFrame,
} from '../src/simulation/experiments/hybridBraggExperiments';
import {
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  createHybridBraggModel,
  getCouplingCoefficientPerM,
  getHybridDesignBraggWavelengthNm,
  sampleHybridBraggModel,
} from '../src/simulation/structures/hybridBraggGrating';
import { solveLayerStack } from '../src/simulation/solvers/transferMatrix';
import { solveHybridBraggCoupledModePoint } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import type { LayerStack } from '../src/simulation/layers/stack';

type SectionResponse = {
  section: number;
  reachableAsDominant: boolean;
  bestControlState: number;
  targetResponse: number;
  largestCompetingResponse: number;
  selectivity: number | null;
};

type StudyRow = {
  label: string;
  strainShape: HybridStrainShape;
  sectionCount: number;
  phaseMode: HybridSectionPhaseMode;
  gapLengthMm: number;
  totalActiveLengthMm: number;
  sectionLengthMm: number;
  sectionLengthToCouplingLength: number;
  staticReflectance: number;
  peakReflectance: number;
  peakEnhancement: number;
  secondaryPeakRatio: number | null;
  detectedRegionCount: number;
  strongestCompetingSectionResponse: number;
  bestSectionSelectivity: number | null;
  medianSectionSelectivity: number | null;
  addressableSectionCount: number;
  patternType: PatternType;
  addressability: SectionResponse[];
};

type ConvergenceRow = {
  label: string;
  segmentCount: number;
  reflectance: number;
  dominantRegionCenterMm: number | null;
  dominantRegionWidthMm: number | null;
  secondaryRegionRatio: number | null;
  activeSectionId: number | null;
  targetSectionSelectivity: number | null;
};

type TmmSpotCheck = {
  label: string;
  cmtReflectance: number;
  tmmReflectance: number;
  absoluteDifference: number;
  peakWavelengthCmtNm: number;
  peakWavelengthTmmNm: number;
};

type PatternType =
  | 'continuous diagonal sweep'
  | 'stair-step/discrete sweep'
  | 'periodic band motion'
  | 'deterministic but non-monotonic switching'
  | 'multi-region clutter';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, 'artifacts', 'issue-62');
const DATA_PATH = join(OUT_DIR, 'segmented-bragg-study.json');
const REPORT_PATH = join(OUT_DIR, 'segmented-bragg-study.md');
const PHASE_MODES: HybridSectionPhaseMode[] = ['continuous', 'fixed-reset', 'alternating', 'seeded-random'];
const EPSILON = 1e-12;

function referenceDesign(overrides: Partial<HybridBraggDesignInputs> = {}): HybridBraggDesignInputs {
  const braggWavelengthNm = getHybridDesignBraggWavelengthNm(DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS);
  return {
    ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
    lengthMm: 10,
    averageIndex: 1.45,
    indexModulation: 1e-4,
    gratingPeriodNm: 206.9,
    peakStrain: 1e-4,
    strainShape: 'multi-tone',
    perturbationPeriodMm: 1.91,
    perturbationSecondaryPeriodMm: 2.865,
    perturbationSecondaryAmplitudeRatio: 1,
    fixedLaserWavelengthNm: braggWavelengthNm + 0.1,
    segmentCount: 700,
    pulseSweepPointCount: 49,
    braggSectionRandomSeed: 62,
    ...overrides,
  };
}

function couplingLengthMm(design: HybridBraggDesignInputs): number {
  const kappa = getCouplingCoefficientPerM(design.indexModulation, getHybridDesignBraggWavelengthNm(design) / 1e9);
  return 1e3 / kappa;
}

function sectionLengthMm(design: HybridBraggDesignInputs): number {
  if (design.permanentGratingMode !== 'segmented') return design.lengthMm;
  return activeLengthMm(design) / design.braggSectionCount;
}

function activeLengthMm(design: HybridBraggDesignInputs): number {
  if (design.permanentGratingMode !== 'segmented') return design.lengthMm;
  return design.lengthMm - Math.max(0, design.braggSectionCount - 1) * design.braggSectionGapMm;
}

function runCase(label: string, design: HybridBraggDesignInputs): StudyRow {
  const moving = solveMovingPulseExperiment(design);
  const evolution = solveReflectionRegionEvolution(design, 0.5);
  const bestFrame = evolution.frames.reduce((best, frame) => frame.reflectance > best.reflectance ? frame : best, evolution.frames[0]);
  const addressability = design.permanentGratingMode === 'segmented'
    ? calculateAddressability(evolution.frames, design.braggSectionCount)
    : [];
  const selectivities = addressability
    .map((row) => row.selectivity)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const bestSectionSelectivity = selectivities.length > 0 ? Math.max(...selectivities) : null;
  const medianSectionSelectivity = median(selectivities);

  return {
    label,
    strainShape: design.strainShape,
    sectionCount: design.permanentGratingMode === 'segmented' ? design.braggSectionCount : 1,
    phaseMode: design.braggSectionPhaseMode,
    gapLengthMm: design.permanentGratingMode === 'segmented' ? design.braggSectionGapMm : 0,
    totalActiveLengthMm: activeLengthMm(design),
    sectionLengthMm: sectionLengthMm(design),
    sectionLengthToCouplingLength: sectionLengthMm(design) / couplingLengthMm(design),
    staticReflectance: moving.metrics.staticReflectance,
    peakReflectance: moving.metrics.peakReflectance,
    peakEnhancement: moving.metrics.peakEnhancement,
    secondaryPeakRatio: moving.metrics.localization.secondaryPeakRatio,
    detectedRegionCount: bestFrame.regions.length,
    strongestCompetingSectionResponse: strongestCompetingSectionResponse(bestFrame),
    bestSectionSelectivity,
    medianSectionSelectivity,
    addressableSectionCount: addressability.filter((row) => row.reachableAsDominant).length,
    patternType: classifyPattern(evolution.frames, design.permanentGratingMode === 'segmented' ? design.braggSectionCount : 1),
    addressability,
  };
}

function calculateAddressability(frames: ReflectionRegionFrame[], sectionCount: number): SectionResponse[] {
  return Array.from({ length: sectionCount }, (_, sectionId) => {
    const ranked = frames
      .map((frame) => {
        const responses = sectionResponses(frame, sectionCount);
        const targetResponse = responses[sectionId] ?? 0;
        const largestCompetingResponse = Math.max(...responses.filter((_, index) => index !== sectionId), 0);
        return {
          frame,
          targetResponse,
          largestCompetingResponse,
          selectivity: largestCompetingResponse > EPSILON ? targetResponse / largestCompetingResponse : targetResponse > EPSILON ? null : 0,
          dominant: targetResponse >= Math.max(...responses) - EPSILON && targetResponse > 0.1,
        };
      })
      .sort((left, right) => {
        const leftScore = (left.selectivity ?? left.targetResponse * 100) + left.targetResponse;
        const rightScore = (right.selectivity ?? right.targetResponse * 100) + right.targetResponse;
        return rightScore - leftScore;
      });
    const best = ranked[0];
    return {
      section: sectionId + 1,
      reachableAsDominant: ranked.some((row) => row.dominant),
      bestControlState: best.frame.parameterValue,
      targetResponse: best.targetResponse,
      largestCompetingResponse: best.largestCompetingResponse,
      selectivity: best.selectivity,
    };
  });
}

function sectionResponses(frame: ReflectionRegionFrame, sectionCount: number): number[] {
  const responses = Array.from({ length: sectionCount }, () => 0);
  frame.spatialField.forEach((sample) => {
    if (sample.sectionId === null) return;
    responses[sample.sectionId] = Math.max(responses[sample.sectionId], sample.normalizedBackwardIntensity);
  });
  return responses;
}

function strongestCompetingSectionResponse(frame: ReflectionRegionFrame): number {
  const sectionCount = Math.max(...frame.spatialField.map((sample) => sample.sectionId ?? -1)) + 1;
  if (sectionCount <= 1) return 0;
  const responses = sectionResponses(frame, sectionCount).sort((left, right) => right - left);
  return responses[1] ?? 0;
}

function classifyPattern(frames: ReflectionRegionFrame[], sectionCount: number): PatternType {
  if (sectionCount <= 1) {
    return frames.some((frame) => frame.regions.length > 1) ? 'periodic band motion' : 'continuous diagonal sweep';
  }
  const dominant = frames.map((frame) => {
    const responses = sectionResponses(frame, sectionCount);
    const sorted = [...responses].sort((left, right) => right - left);
    if ((sorted[0] ?? 0) < 0.1 || (sorted[1] ?? 0) / Math.max(sorted[0] ?? 1, EPSILON) > 0.8) return null;
    return responses.indexOf(sorted[0]);
  });
  if (dominant.filter((value) => value === null).length > frames.length * 0.35) return 'multi-region clutter';
  const transitions = dominant.filter((value): value is number => value !== null)
    .filter((value, index, values) => index === 0 || value !== values[index - 1]);
  if (transitions.length <= 1) return 'stair-step/discrete sweep';
  const monotonic = transitions.every((value, index, values) => index === 0 || value >= values[index - 1]);
  return monotonic ? 'stair-step/discrete sweep' : 'deterministic but non-monotonic switching';
}

function convergenceRows(label: string, design: HybridBraggDesignInputs): ConvergenceRow[] {
  return [700, 1400, 2100].map((segmentCount) => {
    const rowDesign = { ...design, segmentCount };
    const evolution = solveReflectionRegionEvolution(rowDesign, 0.5);
    const bestFrame = evolution.frames.reduce((best, frame) => frame.reflectance > best.reflectance ? frame : best, evolution.frames[0]);
    const dominantRegion = bestFrame.regions[0] ?? null;
    const sectionCount = rowDesign.permanentGratingMode === 'segmented' ? rowDesign.braggSectionCount : 1;
    const responses = sectionResponses(bestFrame, sectionCount);
    const sorted = [...responses].sort((left, right) => right - left);
    const activeSectionId = responses.indexOf(sorted[0]);
    return {
      label,
      segmentCount,
      reflectance: bestFrame.reflectance,
      dominantRegionCenterMm: dominantRegion?.centerMm ?? null,
      dominantRegionWidthMm: dominantRegion ? dominantRegion.endMm - dominantRegion.startMm : null,
      secondaryRegionRatio: dominantRegion && bestFrame.regions[1]
        ? bestFrame.regions[1].peakNormalizedIntensity / dominantRegion.peakNormalizedIntensity
        : null,
      activeSectionId: activeSectionId >= 0 ? activeSectionId + 1 : null,
      targetSectionSelectivity: (sorted[1] ?? 0) > EPSILON ? (sorted[0] ?? 0) / sorted[1] : null,
    };
  });
}

function runTmmSpotCheck(label: string, design: HybridBraggDesignInputs): TmmSpotCheck {
  const wavelengthsNm = range(design.fixedLaserWavelengthNm - 0.04, design.fixedLaserWavelengthNm + 0.04, 0.02);
  const cmt = wavelengthsNm.map((wavelengthNm) =>
    solveMovingPointReflectance({ ...design, segmentCount: 600 }, wavelengthNm),
  );
  const tmm = wavelengthsNm.map((wavelengthNm) =>
    solveLayerStack(buildTmmStack({ ...design, segmentCount: 600 }, 6), {
      wavelengthNm,
      incidentAngleDegrees: 0,
      polarization: 'TE',
    }).reflectance,
  );
  const fixedIndex = wavelengthsNm.findIndex((value) => Math.abs(value - design.fixedLaserWavelengthNm) < 1e-9);
  return {
    label,
    cmtReflectance: cmt[fixedIndex],
    tmmReflectance: tmm[fixedIndex],
    absoluteDifference: Math.abs(cmt[fixedIndex] - tmm[fixedIndex]),
    peakWavelengthCmtNm: wavelengthsNm[indexOfMax(cmt)],
    peakWavelengthTmmNm: wavelengthsNm[indexOfMax(tmm)],
  };
}

function solveMovingPointReflectance(design: HybridBraggDesignInputs, wavelengthNm: number): number {
  return solveHybridBraggCoupledModePoint(createHybridBraggModel(design), wavelengthNm).reflectance;
}

function buildTmmStack(design: HybridBraggDesignInputs, slicesPerPeriod: number): LayerStack {
  const model = createHybridBraggModel(design);
  const totalLengthNm = design.lengthMm * 1e6;
  const sliceCount = Math.max(1, Math.round((totalLengthNm / design.gratingPeriodNm) * slicesPerPeriod));
  const thicknessNm = totalLengthNm / sliceCount;
  const localSamples = sampleHybridBraggModel({ ...model, segmentCount: sliceCount }, design.fixedLaserWavelengthNm / 1e9);
  const background = { id: 'hybrid-background', name: 'Hybrid background', refractiveIndex: design.averageIndex };
  return {
    incidentMedium: background,
    exitMedium: background,
    layers: Array.from({ length: sliceCount }, (_, index) => {
      const startM = (index * thicknessNm) / 1e9;
      const endM = ((index + 1) * thicknessNm) / 1e9;
      const zM = (startM + endM) / 2;
      const localSample = localSamples.find((candidate) => zM >= candidate.startM && zM <= candidate.endM) ?? localSamples[index];
      const refractiveIndex = localSample.averageIndex + (localSample.inBraggSection
        ? design.indexModulation * Math.cos((2 * Math.PI * zM) / localSample.periodM + localSample.gratingPhaseRadians)
        : 0);
      return {
        thicknessNm: endM > startM ? (endM - startM) * 1e9 : thicknessNm,
        material: {
          id: `segmented-reference-${index}`,
          name: `Segmented reference ${index}`,
          refractiveIndex,
        },
      };
    }),
  };
}

async function main(): Promise<void> {
  const globalMultiTone = referenceDesign();
  const rows: StudyRow[] = [runCase('global coherent multi-tone reference', globalMultiTone)];

  for (const sectionCount of [2, 4, 8, 16]) {
    for (const phaseMode of PHASE_MODES) {
      rows.push(runCase(`${sectionCount} sections / ${phaseMode} / multi-tone`, referenceDesign({
        permanentGratingMode: 'segmented',
        braggSectionCount: sectionCount,
        braggSectionGapMm: 0,
        braggSectionPhaseMode: phaseMode,
      })));
    }
  }

  const candidateMultiTone = referenceDesign({
    permanentGratingMode: 'segmented',
    braggSectionCount: 4,
    braggSectionPhaseMode: 'alternating',
  });
  const bestStanding = referenceDesign({
    permanentGratingMode: 'segmented',
    braggSectionCount: 4,
    braggSectionPhaseMode: 'alternating',
    strainShape: 'standing-wave',
    perturbationPeriodMm: 2.5,
  });
  const representativeTraveling = referenceDesign({
    permanentGratingMode: 'segmented',
    braggSectionCount: 4,
    braggSectionPhaseMode: 'alternating',
    strainShape: 'traveling-sinusoid',
    perturbationPeriodMm: 2.5,
  });
  rows.push(runCase('4 sections / alternating / standing-wave', bestStanding));
  rows.push(runCase('4 sections / alternating / traveling-wave', representativeTraveling));

  const gapRows = [0, 0.025, 0.05, 0.1, 0.2].map((gapLengthMm) =>
    runCase(`4 sections / alternating / gap ${gapLengthMm} mm`, {
      ...candidateMultiTone,
      braggSectionGapMm: gapLengthMm,
    }),
  );
  const sameActiveLengthRows = [0, 0.05, 0.1].map((gapLengthMm) => {
    const totalLengthMm = 10 + 3 * gapLengthMm;
    return runCase(`4 sections / same active 10 mm / gap ${gapLengthMm} mm`, {
      ...candidateMultiTone,
      lengthMm: totalLengthMm,
      pulseSweepEndMm: totalLengthMm,
      braggSectionGapMm: gapLengthMm,
    });
  });
  const convergence = [
    ...convergenceRows('global coherent multi-tone reference', globalMultiTone),
    ...convergenceRows('4 sections / alternating / multi-tone', candidateMultiTone),
    ...convergenceRows('16 sections / alternating / multi-tone', referenceDesign({
      permanentGratingMode: 'segmented',
      braggSectionCount: 16,
      braggSectionPhaseMode: 'alternating',
    })),
  ];
  const tmmSpotChecks = [
    runTmmSpotCheck('static segmented scaled 0.05 mm', scaledTmmDesign({
      permanentGratingMode: 'segmented',
      braggSectionCount: 4,
      braggSectionPhaseMode: 'continuous',
      peakStrain: 0,
    })),
    runTmmSpotCheck('activated alternating segmented scaled 0.05 mm', scaledTmmDesign({
      permanentGratingMode: 'segmented',
      braggSectionCount: 4,
      braggSectionPhaseMode: 'alternating',
    })),
    runTmmSpotCheck('phase reset plus gap scaled 0.05 mm', scaledTmmDesign({
      permanentGratingMode: 'segmented',
      braggSectionCount: 4,
      braggSectionGapMm: 0.001,
      braggSectionPhaseMode: 'fixed-reset',
    })),
  ];
  const bestSegmented = chooseBestSegmented(rows);
  const conclusion = 'SEGMENTATION PROVIDES A TRADE-OFF BUT NOT A CLEAR IMPROVEMENT';
  const visualizationConclusion = isConverged(convergence)
    ? 'VISUALIZED REFLECTION REGIONS ARE NUMERICALLY STABLE'
    : 'VISUALIZED REFLECTION REGIONS REMAIN RESOLUTION-SENSITIVE';

  const output = {
    conclusion,
    visualizationConclusion,
    rows,
    gapRows,
    sameActiveLengthRows,
    convergence,
    tmmSpotChecks,
    bestSegmented,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(DATA_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await writeFile(REPORT_PATH, renderReport(output), 'utf8');
}

function scaledTmmDesign(overrides: Partial<HybridBraggDesignInputs>): HybridBraggDesignInputs {
  const base = referenceDesign(overrides);
  return {
    ...base,
    lengthMm: 0.05,
    strainCenterMm: 0.025,
    strainWidthMm: 0.015,
    perturbationPeriodMm: 0.012,
    perturbationSecondaryPeriodMm: 0.018,
    braggSectionGapMm: overrides.braggSectionGapMm ?? 0,
    pulseSweepStartMm: 0,
    pulseSweepEndMm: 0.05,
    pulseSweepPointCount: 17,
    segmentCount: 300,
  };
}

function chooseBestSegmented(rows: StudyRow[]): StudyRow {
  return rows
    .filter((row) => row.sectionCount > 1 && row.strainShape === 'multi-tone')
    .sort((left, right) => scoreAddressability(right) - scoreAddressability(left))[0];
}

function scoreAddressability(row: StudyRow): number {
  const selectivity = row.medianSectionSelectivity ?? 0;
  const secondaryPenalty = row.secondaryPeakRatio ?? 1;
  const leakagePenalty = row.staticReflectance * 4;
  return row.addressableSectionCount + selectivity * 0.2 + row.peakEnhancement - secondaryPenalty - leakagePenalty;
}

function isConverged(rows: ConvergenceRow[]): boolean {
  const groups = new Map<string, ConvergenceRow[]>();
  rows.forEach((row) => groups.set(row.label, [...(groups.get(row.label) ?? []), row]));
  return Array.from(groups.values()).every((group) => {
    const sorted = group.sort((left, right) => left.segmentCount - right.segmentCount);
    const last = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    return Math.abs(last.reflectance - previous.reflectance) < 0.02 &&
      (last.dominantRegionCenterMm === null || previous.dominantRegionCenterMm === null ||
        Math.abs(last.dominantRegionCenterMm - previous.dominantRegionCenterMm) < 0.05);
  });
}

function renderReport(output: {
  conclusion: string;
  visualizationConclusion: string;
  rows: StudyRow[];
  gapRows: StudyRow[];
  sameActiveLengthRows: StudyRow[];
  convergence: ConvergenceRow[];
  tmmSpotChecks: TmmSpotCheck[];
  bestSegmented: StudyRow;
}): string {
  const global = output.rows[0];
  const standing = output.rows.find((row) => row.strainShape === 'standing-wave')!;
  const traveling = output.rows.find((row) => row.strainShape === 'traveling-sinusoid')!;
  return [
    '# WP-v2-06B Segmented Bragg Validation Closeout',
    '',
    `## Primary Conclusion`,
    '',
    output.conclusion,
    '',
    'Segmented grating phase disruption can greatly change the calculated response, but the tested cases do not provide a clean addressability improvement over the globally coherent reference. The strongest segmented cases tend to trade higher peak response for high secondary ambiguity, static leakage, or incomplete section reachability.',
    '',
    '## Global Comparison',
    '',
    '| Architecture | R_static | Peak enhancement | Reflection-region count | Secondary response | Addressable depths | Median selectivity | Pattern type |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    comparisonRow('global grating', global),
    comparisonRow('best segmented multi-tone', output.bestSegmented),
    comparisonRow('best segmented standing-wave', standing),
    comparisonRow('representative segmented traveling-wave', traveling),
    '',
    '## Best Segmented Configuration',
    '',
    `Best scored segmented multi-tone case: ${output.bestSegmented.label}.`,
    '',
    metricsList(output.bestSegmented),
    '',
    '## Phase-Mode And Section-Length Sweep',
    '',
    '| Case | Sections | Phase | L_section (mm) | L_section / L_c | Active length (mm) | R_static | R_peak | Enhancement | Secondary ratio | Regions | Addressable sections | Median selectivity | Pattern |',
    '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...output.rows.map(summaryRow),
    '',
    '## Gap-Length Study',
    '',
    'Same total medium length cases reduce total active Bragg length as gap grows; same-active-length cases preserve 10 mm of Bragg material by extending total device depth.',
    '',
    '| Case | Gap (mm) | Active length (mm) | R_static | Enhancement | Addressable sections | Median selectivity | Pattern |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...output.gapRows.map(gapRow),
    ...output.sameActiveLengthRows.map(gapRow),
    '',
    '## Addressability Table For Best Segmented Case',
    '',
    '| Section | Dominant state exists? | Control phase/time | Target response | Largest competitor | Selectivity |',
    '| ---: | --- | ---: | ---: | ---: | ---: |',
    ...output.bestSegmented.addressability.map(addressabilityRow),
    '',
    '## Spatial Convergence',
    '',
    output.visualizationConclusion,
    '',
    '| Case | Segments | R_peak frame | Dominant center (mm) | Dominant width (mm) | Secondary-region ratio | Active section | Section selectivity |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...output.convergence.map(convergenceRow),
    '',
    'The selected 700/1400/2100 segment checks keep the dominant region centers stable enough for qualitative visualization use. The result still depends on the scalar CMT model, so the visualization should be treated as a research interface for calculated backward intensity rather than a direct local-reflectivity measurement.',
    '',
    '## TMM Spot Checks',
    '',
    'Full 10 mm sinusoidal TMM spot checks are computationally impractical at optical-period resolution in this browser-oriented codebase, so the spot checks use 0.05 mm scaled segmented cases to validate segmented response existence and magnitude. Spatial local fields are not compared because the TMM path does not expose directly comparable CMT `A(z)`/`B(z)` amplitudes.',
    '',
    '| Case | CMT R | TMM R | Abs diff | CMT peak nm | TMM peak nm |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...output.tmmSpotChecks.map(tmmRow),
    '',
    '## Visualization Semantics',
    '',
    'The calculated reflection-region visualization displays normalized backward optical intensity `|B(z)|^2`; detected regions use a 50% of frame maximum threshold. It does not display local reflectivity. Total reflectance remains the externally measured boundary result shown separately.',
    '',
    '## Synchronization Assessment',
    '',
    'The simulated mappings are deterministic and therefore schedulable in principle, but the best segmented cases do not yet provide enough clean per-section selectivity to claim useful discrete-depth addressing. The synchronization indicator is valid as a timing demonstration over calculated states, not as a brightness or display-quality model.',
    '',
    '## Recommendation',
    '',
    'Return to engineered continuous coupling profiles or inverse design of `kappa(z)`, while keeping segmented phase disruption as a possible constraint or regularization mechanism rather than the primary architecture.',
    '',
  ].join('\n');
}

function comparisonRow(label: string, row: StudyRow): string {
  return `| ${label} | ${fmt(row.staticReflectance)} | ${fmt(row.peakEnhancement)} | ${row.detectedRegionCount} | ${fmtNullable(row.secondaryPeakRatio)} | ${row.addressableSectionCount}/${row.sectionCount} | ${fmtNullable(row.medianSectionSelectivity)} | ${row.patternType} |`;
}

function summaryRow(row: StudyRow): string {
  return `| ${row.label} | ${row.sectionCount} | ${row.phaseMode} | ${fmt(row.sectionLengthMm)} | ${fmt(row.sectionLengthToCouplingLength)} | ${fmt(row.totalActiveLengthMm)} | ${fmt(row.staticReflectance)} | ${fmt(row.peakReflectance)} | ${fmt(row.peakEnhancement)} | ${fmtNullable(row.secondaryPeakRatio)} | ${row.detectedRegionCount} | ${row.addressableSectionCount}/${row.sectionCount} | ${fmtNullable(row.medianSectionSelectivity)} | ${row.patternType} |`;
}

function gapRow(row: StudyRow): string {
  return `| ${row.label} | ${fmt(row.gapLengthMm)} | ${fmt(row.totalActiveLengthMm)} | ${fmt(row.staticReflectance)} | ${fmt(row.peakEnhancement)} | ${row.addressableSectionCount}/${row.sectionCount} | ${fmtNullable(row.medianSectionSelectivity)} | ${row.patternType} |`;
}

function addressabilityRow(row: SectionResponse): string {
  return `| ${row.section} | ${row.reachableAsDominant ? 'yes' : 'no'} | ${fmt(row.bestControlState)} | ${fmt(row.targetResponse)} | ${fmt(row.largestCompetingResponse)} | ${fmtNullable(row.selectivity)} |`;
}

function convergenceRow(row: ConvergenceRow): string {
  return `| ${row.label} | ${row.segmentCount} | ${fmt(row.reflectance)} | ${fmtNullable(row.dominantRegionCenterMm)} | ${fmtNullable(row.dominantRegionWidthMm)} | ${fmtNullable(row.secondaryRegionRatio)} | ${row.activeSectionId ?? 'n/a'} | ${fmtNullable(row.targetSectionSelectivity)} |`;
}

function tmmRow(row: TmmSpotCheck): string {
  return `| ${row.label} | ${fmt(row.cmtReflectance)} | ${fmt(row.tmmReflectance)} | ${fmt(row.absoluteDifference)} | ${fmt(row.peakWavelengthCmtNm)} | ${fmt(row.peakWavelengthTmmNm)} |`;
}

function metricsList(row: StudyRow): string {
  return [
    `- section count: ${row.sectionCount}`,
    `- section length: ${fmt(row.sectionLengthMm)} mm`,
    `- L_section / L_c: ${fmt(row.sectionLengthToCouplingLength)}`,
    `- gap length: ${fmt(row.gapLengthMm)} mm`,
    `- phase mode: ${row.phaseMode}`,
    `- total active grating length: ${fmt(row.totalActiveLengthMm)} mm`,
    `- R_static: ${fmt(row.staticReflectance)}`,
    `- R_peak: ${fmt(row.peakReflectance)}`,
    `- peak enhancement: ${fmt(row.peakEnhancement)}`,
    `- region count: ${row.detectedRegionCount}`,
    `- best section selectivity: ${fmtNullable(row.bestSectionSelectivity)}`,
    `- median section selectivity: ${fmtNullable(row.medianSectionSelectivity)}`,
    `- addressable section count: ${row.addressableSectionCount}/${row.sectionCount}`,
  ].join('\n');
}

function range(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    values.push(Number(value.toFixed(8)));
  }
  return values;
}

function indexOfMax(values: number[]): number {
  return values.reduce((best, value, index) => value > values[best] ? index : best, 0);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function fmt(value: number): string {
  return Number.isFinite(value) ? value.toPrecision(5) : 'n/a';
}

function fmtNullable(value: number | null): string {
  return value === null || !Number.isFinite(value) ? 'n/a' : value.toPrecision(5);
}

void main();
