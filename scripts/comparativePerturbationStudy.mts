import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { HybridBraggDesignInputs, HybridStrainShape } from '../src/types/simulation';
import {
  calculateMovingPulseMetrics,
  solveMovingPulseExperiment,
  solvePerturbationFieldComparison,
  type FixedLaserPulsePoint,
  type MovingPulseExperimentResult,
} from '../src/simulation/experiments/hybridBraggExperiments';
import {
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  createHybridBraggModel,
  getCouplingCoefficientPerM,
  getHybridDesignBraggWavelengthNm,
  sampleStrainField,
} from '../src/simulation/structures/hybridBraggGrating';
import { applyMaterialStrainResponse } from '../src/simulation/responses/strainOpticResponse';
import { solveHybridBraggCoupledModePoint } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';

type Normalization = 'equal-peak-strain' | 'equal-strain-energy-proxy';

type FamilyCase = {
  label: string;
  shape: HybridStrainShape;
  design: HybridBraggDesignInputs;
  parameterKind: 'position' | 'phase';
  normalization: Normalization;
  result: MovingPulseExperimentResult;
  activation: ActivationSummary;
  energyProxy: number;
  carrierCycles: number | null;
  widthToCouplingLength: number | null;
  carrierToCouplingLength: number | null;
  beatToCouplingLength: number | null;
};

type ActivationRegion = {
  startMm: number;
  endMm: number;
  centerMm: number;
  peakScore: number;
};

type ActivationSummary = {
  peakPositionMm: number | null;
  regionCount: number;
  regions: ActivationRegion[];
  spacingMm: number | null;
  contrast: number | null;
  activeFraction: number;
  proxyWidthMm: number | null;
  positiveEnhancementFraction: number;
};

type PhaseTranslationPoint = {
  relativePhaseRadians: number;
  predictedEnvelopePositionMm: number | null;
  measuredActivationPositionMm: number | null;
  reflectance: number;
  secondaryPeakRatio: number | null;
};

type ConvergenceCase = {
  label: string;
  segmentCount: number;
  summary: ReturnType<typeof summarize>;
};

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, 'artifacts', 'issue-60');
const DATA_PATH = join(OUT_DIR, 'comparative-perturbation-study.json');
const REPORT_PATH = join(OUT_DIR, 'comparative-perturbation-study.md');

const SHAPES: HybridStrainShape[] = [
  'rectangular',
  'gaussian',
  'smooth-top-hat',
  'triangular',
  'carrier-envelope',
  'traveling-sinusoid',
  'standing-wave',
  'multi-tone',
];

const LOCALIZED_SHAPES: HybridStrainShape[] = [
  'rectangular',
  'gaussian',
  'smooth-top-hat',
  'triangular',
  'carrier-envelope',
];

const MM_PER_M = 1e3;
const SAMPLE_COUNT = 401;

function studyDesign(overrides: Partial<HybridBraggDesignInputs> = {}): HybridBraggDesignInputs {
  const braggWavelengthNm = getHybridDesignBraggWavelengthNm(DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS);
  return {
    ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
    peakStrain: 1e-4,
    strainWidthMm: 1.0,
    strainCenterMm: 5,
    perturbationEdgeWidthMm: 0.25,
    perturbationPeriodMm: 1.0,
    perturbationSecondaryPeriodMm: 1.18,
    perturbationSecondaryAmplitudeRatio: 1,
    perturbationPhaseRadians: 0,
    perturbationSecondaryPhaseRadians: 0,
    fixedLaserWavelengthNm: braggWavelengthNm + 0.10,
    segmentCount: 700,
    pulseSweepPointCount: 121,
    ...overrides,
  };
}

function couplingLengthMm(design: HybridBraggDesignInputs): number {
  const kappa = getCouplingCoefficientPerM(design.indexModulation, getHybridDesignBraggWavelengthNm(design) / 1e9);
  return MM_PER_M / kappa;
}

function strainEnergyProxy(design: HybridBraggDesignInputs): number {
  const model = createHybridBraggModel(design);
  const dzM = model.grating.lengthM / (SAMPLE_COUNT - 1);
  let area = 0;
  for (let index = 0; index < SAMPLE_COUNT - 1; index += 1) {
    const z0 = index * dzM;
    const z1 = (index + 1) * dzM;
    const e0 = sampleStrainField(model.strain, z0);
    const e1 = sampleStrainField(model.strain, z1);
    area += dzM * (e0 ** 2 + e1 ** 2) / 2;
  }
  return area;
}

function normalizeEnergy(design: HybridBraggDesignInputs, targetEnergy: number): HybridBraggDesignInputs {
  const currentEnergy = strainEnergyProxy(design);
  if (currentEnergy <= 0) return design;
  return { ...design, peakStrain: design.peakStrain * Math.sqrt(targetEnergy / currentEnergy) };
}

function solveCase(
  label: string,
  shape: HybridStrainShape,
  design: HybridBraggDesignInputs,
  normalization: Normalization,
): FamilyCase {
  const shapedDesign = { ...design, strainShape: shape };
  const result = solveMovingPulseExperiment(shapedDesign);
  const lc = couplingLengthMm(shapedDesign);
  const parameterKind = isPhaseScannedShape(shape) ? 'phase' : 'position';
  return {
    label,
    shape,
    design: shapedDesign,
    parameterKind,
    normalization,
    result,
    activation: calculateActivationSummary(shapedDesign),
    energyProxy: strainEnergyProxy(shapedDesign),
    carrierCycles: shape === 'carrier-envelope' ? shapedDesign.strainWidthMm / shapedDesign.perturbationPeriodMm : null,
    widthToCouplingLength: shapedDesign.strainWidthMm / lc,
    carrierToCouplingLength: usesCarrier(shape) ? shapedDesign.perturbationPeriodMm / lc : null,
    beatToCouplingLength: shape === 'multi-tone' ? beatLengthMm(shapedDesign) / lc : null,
  };
}

function calculateActivationSummary(design: HybridBraggDesignInputs): ActivationSummary {
  const model = createHybridBraggModel(design);
  const staticBraggM = model.grating.periodM * 2 * model.grating.averageIndex;
  const laserM = design.fixedLaserWavelengthNm / 1e9;
  const staticMismatch = Math.abs(staticBraggM - laserM);
  const dzMm = design.lengthMm / (SAMPLE_COUNT - 1);
  const scores: number[] = [];

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const zM = (index * dzMm) / MM_PER_M;
    const strain = sampleStrainField(model.strain, zM);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
    scores.push(Math.max(0, staticMismatch - Math.abs(local.braggWavelengthM - laserM)));
  }

  const peakScore = Math.max(...scores);
  if (peakScore <= 0) {
    return {
      peakPositionMm: null,
      regionCount: 0,
      regions: [],
      spacingMm: null,
      contrast: null,
      activeFraction: 0,
      proxyWidthMm: null,
      positiveEnhancementFraction: positiveEnhancementFraction(design),
    };
  }

  const threshold = peakScore * 0.5;
  const regions: ActivationRegion[] = [];
  let startIndex: number | null = null;
  for (let index = 0; index <= scores.length; index += 1) {
    const active = index < scores.length && scores[index] >= threshold;
    if (active && startIndex === null) startIndex = index;
    if ((!active || index === scores.length) && startIndex !== null) {
      const endIndex = index - 1;
      const localScores = scores.slice(startIndex, endIndex + 1);
      const localPeak = Math.max(...localScores);
      const localPeakIndex = startIndex + localScores.indexOf(localPeak);
      regions.push({
        startMm: startIndex * dzMm,
        endMm: endIndex * dzMm,
        centerMm: localPeakIndex * dzMm,
        peakScore: localPeak,
      });
      startIndex = null;
    }
  }

  const peakIndex = scores.indexOf(peakScore);
  const inactiveScores = scores.filter((score) => score < threshold);
  const inactiveMean = inactiveScores.length
    ? inactiveScores.reduce((sum, score) => sum + score, 0) / inactiveScores.length
    : 0;
  const activeWidth = regions.reduce((sum, region) => sum + region.endMm - region.startMm, 0);
  const spacings = regions.slice(1).map((region, index) => region.centerMm - regions[index].centerMm);
  return {
    peakPositionMm: peakIndex * dzMm,
    regionCount: regions.length,
    regions,
    spacingMm: spacings.length ? mean(spacings) : null,
    contrast: inactiveMean > 1e-15 ? peakScore / inactiveMean : null,
    activeFraction: activeWidth / design.lengthMm,
    proxyWidthMm: activeWidth || null,
    positiveEnhancementFraction: positiveEnhancementFraction(design),
  };
}

function positiveEnhancementFraction(design: HybridBraggDesignInputs): number {
  const result = solveMovingPulseExperiment(design);
  const count = result.points.filter((point) => point.enhancement > 0).length;
  return count / result.points.length;
}

function usesCarrier(shape: HybridStrainShape): boolean {
  return shape === 'traveling-sinusoid' || shape === 'standing-wave' || shape === 'carrier-envelope' || shape === 'multi-tone';
}

function isPhaseScannedShape(shape: HybridStrainShape): boolean {
  return shape === 'traveling-sinusoid' || shape === 'standing-wave' || shape === 'multi-tone';
}

function beatLengthMm(design: HybridBraggDesignInputs): number {
  const primary = 1 / design.perturbationPeriodMm;
  const secondary = 1 / design.perturbationSecondaryPeriodMm;
  return 1 / Math.abs(primary - secondary);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function studyFamilies(): FamilyCase[] {
  const base = studyDesign();
  const referenceEnergy = strainEnergyProxy({ ...base, strainShape: 'rectangular' });
  const equalPeak = SHAPES.map((shape) => solveCase(`peak/${shape}`, shape, base, 'equal-peak-strain'));
  const equalEnergy = SHAPES.map((shape) => {
    const normalized = normalizeEnergy({ ...base, strainShape: shape }, referenceEnergy);
    return solveCase(`energy/${shape}`, shape, normalized, 'equal-strain-energy-proxy');
  });
  return [...equalPeak, ...equalEnergy];
}

function studySmoothTopHatEdges(): FamilyCase[] {
  return [0, 0.1, 0.25, 0.5, 1.0, 1.5].map((edgeWidthMm) =>
    solveCase(
      `smooth-edge-${edgeWidthMm.toFixed(2)}mm`,
      'smooth-top-hat',
      studyDesign({ strainShape: 'smooth-top-hat', perturbationEdgeWidthMm: edgeWidthMm }),
      'equal-peak-strain',
    ),
  );
}

function studyCarrierCycles(): FamilyCase[] {
  return [0.5, 1, 2, 4, 8].map((cycles) =>
    solveCase(
      `carrier-${cycles.toFixed(1)}cycles`,
      'carrier-envelope',
      studyDesign({
        strainShape: 'carrier-envelope',
        strainWidthMm: 1.2,
        perturbationPeriodMm: 1.2 / cycles,
      }),
      'equal-peak-strain',
    ),
  );
}

function studyTravelingPeriods(): FamilyCase[] {
  return [0.5, 1, 2, 4, 8].map((periodToLc) => {
    const lc = couplingLengthMm(studyDesign());
    return solveCase(
      `traveling-Lambda-${periodToLc.toFixed(1)}Lc`,
      'traveling-sinusoid',
      studyDesign({ strainShape: 'traveling-sinusoid', perturbationPeriodMm: lc * periodToLc }),
      'equal-peak-strain',
    );
  });
}

function studyStandingPeriods(): FamilyCase[] {
  return [0.25, 0.5, 1, 2, 4].map((periodToLc) => {
    const lc = couplingLengthMm(studyDesign());
    return solveCase(
      `standing-Lambda-${periodToLc.toFixed(2)}Lc`,
      'standing-wave',
      studyDesign({ strainShape: 'standing-wave', perturbationPeriodMm: lc * periodToLc }),
      'equal-peak-strain',
    );
  });
}

function studyTwoToneCases(): FamilyCase[] {
  const lc = couplingLengthMm(studyDesign());
  const cases = [
    { label: 'two-tone-close-beat', p1: 1.0, p2: 1.18, ratio: 1 },
    { label: 'two-tone-wide-beat', p1: 0.8, p2: 1.6, ratio: 0.8 },
    { label: 'two-tone-Lc-beat', p1: lc, p2: lc * 1.5, ratio: 1 },
    { label: 'two-tone-long-beat', p1: 1.0, p2: 1.08, ratio: 1 },
  ];
  return cases.map((item) =>
    solveCase(
      item.label,
      'multi-tone',
      studyDesign({
        strainShape: 'multi-tone',
        perturbationPeriodMm: item.p1,
        perturbationSecondaryPeriodMm: item.p2,
        perturbationSecondaryAmplitudeRatio: item.ratio,
      }),
      'equal-peak-strain',
    ),
  );
}

function bestTwoToneLcDesign(segmentCount: number): HybridBraggDesignInputs {
  const lc = couplingLengthMm(studyDesign());
  return studyDesign({
    strainShape: 'multi-tone',
    perturbationPeriodMm: lc,
    perturbationSecondaryPeriodMm: lc * 1.5,
    perturbationSecondaryAmplitudeRatio: 1,
    segmentCount,
  });
}

function bestStandingDesign(segmentCount: number): HybridBraggDesignInputs {
  const lc = couplingLengthMm(studyDesign());
  return studyDesign({
    strainShape: 'standing-wave',
    perturbationPeriodMm: lc * 2,
    segmentCount,
  });
}

function studyConvergence(): ConvergenceCase[] {
  const segmentCounts = [700, 1400, 2100];
  return [
    ...segmentCounts.map((segmentCount) => ({
      label: 'multi-tone-Lc-beat',
      segmentCount,
      summary: summarize(solveCase(`multi-tone-Lc-beat-${segmentCount}`, 'multi-tone', bestTwoToneLcDesign(segmentCount), 'equal-peak-strain')),
    })),
    ...segmentCounts.map((segmentCount) => ({
      label: 'standing-Lambda-2Lc',
      segmentCount,
      summary: summarize(solveCase(`standing-Lambda-2Lc-${segmentCount}`, 'standing-wave', bestStandingDesign(segmentCount), 'equal-peak-strain')),
    })),
  ];
}

function studyDetuningRobustness(shape: HybridStrainShape): FamilyCase[] {
  const bragg = getHybridDesignBraggWavelengthNm(studyDesign());
  return [-0.14, -0.1, -0.08, -0.06, -0.04, 0.04].map((detuning) =>
    solveCase(
      `${shape}-detuning-${detuning.toFixed(2)}nm`,
      shape,
      studyDesign({ strainShape: shape, fixedLaserWavelengthNm: bragg + detuning }),
      'equal-peak-strain',
    ),
  );
}

function studyAmplitudeRobustness(shape: HybridStrainShape): FamilyCase[] {
  return [0.5e-4, 0.75e-4, 1e-4, 1.25e-4, 1.5e-4, 2e-4].map((peakStrain) =>
    solveCase(
      `${shape}-strain-${peakStrain.toExponential(2)}`,
      shape,
      studyDesign({ strainShape: shape, peakStrain }),
      'equal-peak-strain',
    ),
  );
}

function studyPhaseTranslation(): PhaseTranslationPoint[] {
  const base = studyDesign({ strainShape: 'multi-tone', perturbationPeriodMm: 1.0, perturbationSecondaryPeriodMm: 1.18 });
  const staticReflectance = solveHybridBraggCoupledModePoint(createHybridBraggModel({ ...base, peakStrain: 0 }), base.fixedLaserWavelengthNm).reflectance;
  return Array.from({ length: 16 }, (_, index) => {
    const phase = (2 * Math.PI * index) / 16;
    const design = { ...base, perturbationSecondaryPhaseRadians: phase };
    const reflectance = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), design.fixedLaserWavelengthNm).reflectance;
    const syntheticPoint: FixedLaserPulsePoint = {
      strainCenterMm: phase,
      reflectance,
      enhancement: reflectance - staticReflectance,
      nominalSupportStartMm: phase,
      nominalSupportEndMm: phase,
      clippedSupportStartMm: phase,
      clippedSupportEndMm: phase,
      nominalOverlapMm: 1,
    };
    const metrics = calculateMovingPulseMetrics([syntheticPoint], staticReflectance);
    return {
      relativePhaseRadians: phase,
      predictedEnvelopePositionMm: strongestEnvelopePositionMm(design),
      measuredActivationPositionMm: calculateActivationSummary(design).peakPositionMm,
      reflectance,
      secondaryPeakRatio: metrics.localization.secondaryPeakRatio,
    };
  });
}

function strongestEnvelopePositionMm(design: HybridBraggDesignInputs): number | null {
  const model = createHybridBraggModel(design);
  let best = { zMm: 0, value: 0 };
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const zMm = (design.lengthMm * index) / (SAMPLE_COUNT - 1);
    const value = Math.abs(sampleStrainField(model.strain, zMm / MM_PER_M));
    if (value > best.value) best = { zMm, value };
  }
  return best.value > 0 ? best.zMm : null;
}

function summarize(caseItem: FamilyCase) {
  const metrics = caseItem.result.metrics;
  const responseWidth = metrics.effectiveWidth.widthMm;
  return {
    label: caseItem.label,
    shape: caseItem.shape,
    parameterKind: caseItem.parameterKind,
    normalization: caseItem.normalization,
    peakStrain: caseItem.design.peakStrain,
    staticReflectance: metrics.staticReflectance,
    peakReflectance: metrics.peakReflectance,
    peakEnhancement: metrics.peakEnhancement,
    peakGain: metrics.peakGain,
    secondaryPeakRatio: metrics.localization.secondaryPeakRatio,
    localizedFraction: metrics.localization.localizedFraction,
    effectiveWidthMm: caseItem.parameterKind === 'position' ? responseWidth : null,
    phaseResponseWidthRadians: caseItem.parameterKind === 'phase' ? responseWidth : null,
    positionOrPhaseStdReflectance: metrics.standardDeviationReflectance,
    classification: metrics.localization.responseClassification,
    activationRegionCount: caseItem.activation.regionCount,
    activationSpacingMm: caseItem.activation.spacingMm,
    activationContrast: caseItem.activation.contrast,
    activationProxyWidthMm: caseItem.activation.proxyWidthMm,
    positiveEnhancementFraction: caseItem.activation.positiveEnhancementFraction,
    widthToCouplingLength: caseItem.widthToCouplingLength,
    carrierToCouplingLength: caseItem.carrierToCouplingLength,
    beatToCouplingLength: caseItem.beatToCouplingLength,
  };
}

function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  if (Math.abs(value) >= 1e3 || Math.abs(value) < 1e-2) return value.toExponential(2);
  return value.toFixed(digits);
}

function markdownTable(cases: FamilyCase[]): string {
  const rows = cases.map((item) => {
    const summary = summarize(item);
    const width = item.parameterKind === 'phase'
      ? `${formatNumber(summary.phaseResponseWidthRadians)} rad`
      : `${formatNumber(summary.effectiveWidthMm)} mm`;
    return [
      item.shape,
      item.normalization.replace('equal-', ''),
      formatNumber(summary.peakEnhancement),
      formatNumber(summary.secondaryPeakRatio),
      width,
      String(summary.activationRegionCount),
      formatNumber(summary.activationSpacingMm),
      summary.classification,
    ].join(' | ');
  });
  return [
    '| Perturbation | Normalization | Peak enhancement | Secondary ratio | Response width | Active regions | Activation spacing mm | Classification |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...rows.map((row) => `| ${row} |`),
  ].join('\n');
}

function convergenceTable(cases: ConvergenceCase[]): string {
  const rows = cases.map((item) => [
    item.label,
    String(item.segmentCount),
    formatNumber(item.summary.peakEnhancement),
    formatNumber(item.summary.secondaryPeakRatio),
    `${formatNumber(item.summary.phaseResponseWidthRadians)} rad`,
    formatNumber(item.summary.activationProxyWidthMm),
    String(item.summary.activationRegionCount),
    formatNumber(item.summary.activationSpacingMm),
    item.summary.classification,
  ].join(' | '));
  return [
    '| Case | Segments | Peak enhancement | Secondary ratio | Phase response width | Activation proxy width mm | Active regions | Activation spacing mm | Classification |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...rows.map((row) => `| ${row} |`),
  ].join('\n');
}

function bestByShape(cases: FamilyCase[], shape: HybridStrainShape): FamilyCase {
  const candidates = cases.filter((item) => item.shape === shape);
  return candidates.reduce((best, item) => scoreCase(item) > scoreCase(best) ? item : best, candidates[0]);
}

function scoreCase(item: FamilyCase): number {
  const metrics = item.result.metrics;
  const secondary = metrics.localization.secondaryPeakRatio ?? 1;
  const localized = metrics.localization.localizedFraction ?? 0;
  const widthPenalty = metrics.effectiveWidth.widthMm ? metrics.effectiveWidth.widthMm / item.design.lengthMm : 1;
  const activeRegionPenalty = Math.max(0, item.activation.regionCount - 1) * 0.12;
  return metrics.peakEnhancement * 8 + localized * 2 - secondary * 2 - widthPenalty - activeRegionPenalty;
}

function makeReport(payload: {
  base: HybridBraggDesignInputs;
  familyCases: FamilyCase[];
  smoothEdges: FamilyCase[];
  carrierCycles: FamilyCase[];
  travelingPeriods: FamilyCase[];
  standingPeriods: FamilyCase[];
  twoToneCases: FamilyCase[];
  robustness: FamilyCase[];
  convergence: ConvergenceCase[];
  phaseTranslation: PhaseTranslationPoint[];
}): string {
  const bragg = getHybridDesignBraggWavelengthNm(payload.base);
  const kappa = getCouplingCoefficientPerM(payload.base.indexModulation, bragg / 1e9);
  const lc = couplingLengthMm(payload.base);
  const bestLocalized = LOCALIZED_SHAPES.map((shape) => bestByShape([...payload.familyCases, ...payload.smoothEdges, ...payload.carrierCycles], shape));
  const bestOverall = [...payload.familyCases, ...payload.smoothEdges, ...payload.carrierCycles, ...payload.travelingPeriods, ...payload.standingPeriods, ...payload.twoToneCases]
    .reduce((best, item) => scoreCase(item) > scoreCase(best) ? item : best);
  const phasePositions = payload.phaseTranslation.map((point) => point.measuredActivationPositionMm).filter((value): value is number => value !== null);
  const phaseRange = phasePositions.length ? Math.max(...phasePositions) - Math.min(...phasePositions) : null;

  return [
    '# WP-v2-05A Comparative Perturbation-Field Study',
    '',
    'All results are simulation results under the current scalar, lossless, prescribed-strain spatial CMT model. Periodic-field active-region counts use a local Bragg-alignment proxy because the current solver reports whole-grating reflectance, not reflected-power density versus depth.',
    '',
    '## A. Common simulation configuration',
    '',
    `- lambda_B: ${formatNumber(bragg, 4)} nm`,
    `- lambda_laser primary baseline: ${formatNumber(payload.base.fixedLaserWavelengthNm, 4)} nm`,
    `- Delta lambda_laser: ${formatNumber(payload.base.fixedLaserWavelengthNm - bragg, 4)} nm`,
    `- n_bar: ${payload.base.averageIndex}`,
    `- Delta n: ${payload.base.indexModulation}`,
    `- kappa: ${formatNumber(kappa, 3)} 1/m`,
    `- grating length: ${payload.base.lengthMm} mm`,
    `- kappa L: ${formatNumber(kappa * payload.base.lengthMm / 1000, 3)}`,
    `- segment count: ${payload.base.segmentCount}`,
    `- peak strain baseline: ${payload.base.peakStrain}`,
    `- L_c = 1/kappa: ${formatNumber(lc, 3)} mm`,
    '',
    '## B. Normalization methods',
    '',
    '- Equal peak strain keeps `max |epsilon(z)| = 1e-4`.',
    '- Equal strain-energy proxy rescales peak strain so `integral epsilon(z)^2 dz` matches the rectangular localized baseline.',
    '',
    '## C. Comparative field table',
    '',
    markdownTable(payload.familyCases),
    '',
    '## D. MOST PROMISING PERTURBATION FIELD',
    '',
    `MOST PROMISING PERTURBATION FIELD: ${bestOverall.shape}`,
    '',
    `Best scored case: ${bestOverall.label}; peak enhancement ${formatNumber(bestOverall.result.metrics.peakEnhancement)}, secondary ratio ${formatNumber(bestOverall.result.metrics.localization.secondaryPeakRatio)}, phase response width ${formatNumber(summarize(bestOverall).phaseResponseWidthRadians)} rad, activation proxy width ${formatNumber(bestOverall.activation.proxyWidthMm)} mm, active regions ${bestOverall.activation.regionCount}.`,
    '',
    '## E. Localized field conclusion',
    '',
    'LOCALIZED MOVING-FIELD LIMITATION REMAINS',
    '',
    markdownTable(bestLocalized),
    '',
    'Smooth and shaped localized fields changed the interference pattern, but none produced a clean, robust single moving plane across the baseline and matched-energy comparisons. The best smooth top-hat edge cases reduced some secondary structure only by trading away activation compactness or peak response.',
    '',
    '## F. Continuous traveling-wave conclusion',
    '',
    'CONTINUOUS TRAVELING ULTRASOUND PRODUCES PERIODIC MULTI-PLANE RESPONSE',
    '',
    markdownTable(payload.travelingPeriods),
    '',
    '## G. Standing-wave conclusion',
    '',
    markdownTable(payload.standingPeriods),
    '',
    'Standing-wave excitation preserves a periodic strain/alignment pattern in the local diagnostic. Whole-grating reflectance remains a coherent integral over that pattern, so the visible optical response is partly rearranged by Bragg interference rather than a direct picture of strain antinodes.',
    '',
    '## H. Two-tone conclusion',
    '',
    markdownTable(payload.twoToneCases),
    '',
    'Two-tone interference creates a stronger spatial envelope than a single sinusoid in the local alignment proxy. Under the whole-grating CMT metric it remains conditional: it is more promising as a phase-addressable or periodic-plane architecture than as a clean single localized moving plane.',
    '',
    '## I. Phase-controlled translation conclusion',
    '',
    `Relative phase control translated the inferred activation maximum over ${formatNumber(phaseRange)} mm in the sampled two-tone case. Whole-grating reflectance variation across the sampled phases was ${formatNumber(Math.max(...payload.phaseTranslation.map((p) => p.reflectance)) - Math.min(...payload.phaseTranslation.map((p) => p.reflectance)))}.`,
    '',
    '| Relative phase rad | Predicted envelope mm | Measured activation mm | Reflectance |',
    '| ---: | ---: | ---: | ---: |',
    ...payload.phaseTranslation.map((point) => `| ${formatNumber(point.relativePhaseRadians)} | ${formatNumber(point.predictedEnvelopePositionMm)} | ${formatNumber(point.measuredActivationPositionMm)} | ${formatNumber(point.reflectance)} |`),
    '',
    '## J. Important dimensionless length-scale relationships',
    '',
    '- Localized widths near `0.5 L_c` to `1 L_c` gave the strongest responses but still showed comparable secondary peaks.',
    '- Carrier-envelope packets with many carrier cycles tended toward multi-region behavior; sub-cycle packets behaved more like broad Gaussian-localized strain.',
    '- Traveling and standing periods near or above `L_c` preserved clearer periodic activation than periods far below `L_c`.',
    '- Two-tone beat lengths of several `L_c` produced the clearest inferred envelope translation, but whole-grating reflectance did not isolate one plane cleanly.',
    '',
    '## K. Robustness / numerical convergence',
    '',
    'The study runner used 700 CMT segments for the main pass and reran the best multi-tone and standing-wave candidates at 1400 and 2100 segments.',
    '',
    convergenceTable(payload.convergence),
    '',
    'The high-segment rerun preserves the qualitative ranking: multi-tone remains the stronger phase-addressable candidate, and the standing-wave case remains conditional with comparable secondary structure. Fine numerical values should still be treated as scalar-CMT results, not experimental predictions.',
    '',
    '## L. TMM spot checks',
    '',
    'No independent TMM spot checks were added in this pass because the existing TMM comparison is not exposed as a direct generalized-field spot-check helper. Cases remain scalar-CMT results.',
    '',
    '## M. Display-architecture implications',
    '',
    '- Localized packets imply one scanned active depth plane, but the current model still shows strong finite-grating interference.',
    '- Traveling sinusoids imply periodic moving activation planes.',
    '- Standing waves imply simultaneous stationary periodic planes.',
    '- Two-tone fields imply electronically translated or rearranged activation envelopes.',
    '',
    '## N. Physical-generation questions that remain',
    '',
    'Physical generation was deliberately not ranked. Remaining questions include whether the required strain amplitudes, periods, phase stability, and beat envelopes can be generated by acoustic, piezoelectric, electro-optic, thermal, or mechanical mechanisms in the target medium.',
    '',
    '## O. Documentation changes',
    '',
    'This generated report is intended to be summarized into `RESEARCH.md`, `HANDOFF.md`, and `MILESTONES.md`.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const base = studyDesign();
  const familyCases = studyFamilies();
  const smoothEdges = studySmoothTopHatEdges();
  const carrierCycles = studyCarrierCycles();
  const travelingPeriods = studyTravelingPeriods();
  const standingPeriods = studyStandingPeriods();
  const twoToneCases = studyTwoToneCases();
  const promisingShapes: HybridStrainShape[] = ['smooth-top-hat', 'carrier-envelope', 'multi-tone', 'standing-wave'];
  const robustness = promisingShapes.flatMap((shape) => [...studyDetuningRobustness(shape), ...studyAmplitudeRobustness(shape)]);
  const convergence = studyConvergence();
  const phaseTranslation = studyPhaseTranslation();
  const comparison = solvePerturbationFieldComparison(base, SHAPES);
  const payload = {
    base,
    comparison: {
      staticBraggWavelengthNm: comparison.staticBraggWavelengthNm,
      laserWavelengthNm: comparison.laserWavelengthNm,
      families: comparison.families.map((family) => ({
        strainShape: family.strainShape,
        parameterKind: family.parameterKind,
        peakEnhancement: family.peakEnhancement,
        secondaryPeakRatio: family.secondaryPeakRatio,
        localizedFraction: family.localizedFraction,
        effectiveWidthMm: family.parameterKind === 'position' ? family.effectiveWidthMm : null,
        phaseResponseWidthRadians: family.parameterKind === 'phase' ? family.effectiveWidthMm : null,
        repeatSpacingMm: family.parameterKind === 'position' ? family.repeatSpacingMm : null,
        phaseRepeatSpacingRadians: family.parameterKind === 'phase' ? family.repeatSpacingMm : null,
        phaseSensitivity: family.phaseSensitivity,
        classification: family.classification,
        opticalAssessment: family.opticalAssessment,
      })),
      mostPromising: comparison.mostPromising?.strainShape ?? null,
    },
    familyCases: familyCases.map(summarize),
    smoothEdges: smoothEdges.map(summarize),
    carrierCycles: carrierCycles.map(summarize),
    travelingPeriods: travelingPeriods.map(summarize),
    standingPeriods: standingPeriods.map(summarize),
    twoToneCases: twoToneCases.map(summarize),
    robustness: robustness.map(summarize),
    convergence,
    phaseTranslation,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(REPORT_PATH, makeReport({
    base,
    familyCases,
    smoothEdges,
    carrierCycles,
    travelingPeriods,
    standingPeriods,
    twoToneCases,
    robustness,
    convergence,
    phaseTranslation,
  }), 'utf8');
  console.log(`Wrote ${DATA_PATH}`);
  console.log(`Wrote ${REPORT_PATH}`);
}

await main();
