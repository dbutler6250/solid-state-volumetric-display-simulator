import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import {
  evaluateMultiStateObjective,
  evaluateTargetReflectionState,
  type ObjectiveMetrics,
} from '../src/simulation/optimization/targetReflectionState';
import { detectReflectionRegions } from '../src/simulation/experiments/hybridBraggExperiments';
import { solveHybridBraggCoupledModePoint } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import { createHybridBraggModel, DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS, getHybridDesignBraggWavelengthNm } from '../src/simulation/structures/hybridBraggGrating';

type StudyCase = {
  label: string;
  design: HybridBraggDesignInputs;
  targetDepthMm: number;
  targetWidthMm: number;
  metrics: ObjectiveMetrics;
  dominantRegionCenterMm: number | null;
};

const OUT_DIR = join(process.cwd(), 'artifacts', 'issue-66');
const JSON_PATH = join(OUT_DIR, 'piezo-strain-window-study.json');
const REPORT_PATH = join(OUT_DIR, 'piezo-strain-window-study.md');

const baseDesign: HybridBraggDesignInputs = {
  ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  indexModulation: 1e-4,
  peakStrain: 0.003,
  strainShape: 'piezo-window',
  strainCenterMm: 5,
  strainWidthMm: 1.2,
  perturbationEdgeWidthMm: 0.25,
  strainBias: 0,
  fixedLaserWavelengthNm: 600.11,
  segmentCount: 360,
  pulseSweepPointCount: 17,
};

const targetWidthMm = 1;
const windowWidthsMm = [0.5, 0.8, 1.2, 1.8, 2.5];
const transitionWidthsMm = [0.02, 0.1, 0.25, 0.5, 0.9];
const strainAmplitudes = [0.0015, 0.003, 0.0045];
const biasStrains = [0, 0.0015, 0.003, 0.0045];
const targetDepthsMm = [1.25, 2.5, 3.75, 5, 6.25, 7.5, 8.75];

const singleWindowCases = enumerateSingleWindowCases('piezo-window');
const troughCases = enumerateSingleWindowCases('piezo-trough');
const transitionCases = transitionWidthsMm.map((edge) => runCase(`transition-${edge}mm`, {
  ...baseDesign,
  perturbationEdgeWidthMm: edge,
}, 5));
const arrayCases = [4, 8, 16].map(runArrayCase);
const interpolationCases = [0, 0.25, 0.5, 0.75, 1].map(runInterpolationCase);
const comparisonCases = [
  runCase('best standing-wave reference', {
    ...baseDesign,
    strainShape: 'standing-wave',
    perturbationPeriodMm: 2,
    strainBias: 0,
  }, 5),
  runCase('best multi-tone reference', {
    ...baseDesign,
    strainShape: 'multi-tone',
    perturbationPeriodMm: 1,
    perturbationSecondaryPeriodMm: 1.18,
    perturbationSecondaryAmplitudeRatio: 1,
    strainBias: 0,
  }, 5),
];

const bestWindow = bestBySelectivity(singleWindowCases);
const bestTrough = bestBySelectivity(troughCases);
const bestArray = arrayCases.sort((left, right) =>
  (right.multi.minimumSelectivity ?? 0) - (left.multi.minimumSelectivity ?? 0),
)[0];
const payload = {
  baseDesign,
  staticBraggWavelengthNm: getHybridDesignBraggWavelengthNm(baseDesign),
  singleWindowCases,
  troughCases,
  transitionCases,
  arrayCases,
  interpolationCases,
  comparisonCases,
  bestWindow,
  bestTrough,
  bestArray,
  conclusions: {
    overall: chooseOverallConclusion(),
    windowVsTrough: chooseWindowVsTroughConclusion(),
    array: chooseArrayConclusion(),
    interpolation: 'PARTIAL / NONLINEAR INTERPOLATION',
  },
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function enumerateSingleWindowCases(shape: 'piezo-window' | 'piezo-trough'): StudyCase[] {
  const cases: StudyCase[] = [];
  for (const strainWidthMm of windowWidthsMm) {
    for (const perturbationEdgeWidthMm of transitionWidthsMm) {
      for (const peakStrain of strainAmplitudes) {
        const biasSet = shape === 'piezo-trough' ? biasStrains.filter((bias) => bias >= peakStrain) : [0];
        for (const strainBias of biasSet) {
          cases.push(runCase(`${shape}-W${strainWidthMm}-edge${perturbationEdgeWidthMm}-eps${peakStrain}-bias${strainBias}`, {
            ...baseDesign,
            strainShape: shape,
            strainWidthMm,
            perturbationEdgeWidthMm,
            peakStrain,
            strainBias,
          }, 5));
        }
      }
    }
  }
  return cases;
}

function runArrayCase(actuatorCount: number) {
  const pitch = baseDesign.lengthMm / (actuatorCount + 1);
  const design = {
    ...baseDesign,
    strainShape: 'piezo-array' as const,
    actuatorCount,
    actuatorPitchMm: pitch,
    strainCenterMm: baseDesign.lengthMm / 2,
    strainWidthMm: pitch * 0.85,
    perturbationEdgeWidthMm: pitch * 0.25,
    actuatorCommandAmplitude: 1,
    actuatorAdjacentCommandAmplitude: 0.15,
  };
  const depths = Array.from({ length: actuatorCount }, (_, index) =>
    baseDesign.lengthMm / 2 - ((actuatorCount - 1) * pitch) / 2 + index * pitch,
  );
  return {
    actuatorCount,
    pitchMm: pitch,
    design,
    multi: evaluateMultiStateObjective(design, depths.map((targetDepthMm, index) => ({
      targetDepthMm,
      targetWidthMm,
      controlKind: 'actuator-index',
      controlState: index,
    }))),
  };
}

function runInterpolationCase(alpha: number): StudyCase {
  return runCase(`adjacent-alpha-${alpha}`, {
    ...baseDesign,
    strainShape: 'piezo-array',
    actuatorCount: 2,
    actuatorPitchMm: 1.2,
    strainCenterMm: 5,
    strainWidthMm: 1.3,
    perturbationEdgeWidthMm: 0.35,
    activeActuatorIndex: 0,
    actuatorCommandAmplitude: 1 - alpha,
    actuatorAdjacentCommandAmplitude: alpha,
  }, 5);
}

function runCase(label: string, design: HybridBraggDesignInputs, targetDepthMm: number): StudyCase {
  const metrics = evaluateTargetReflectionState(design, {
    targetDepthMm,
    targetWidthMm,
    controlKind: design.strainShape === 'piezo-array' ? 'actuator-index' : 'position',
    controlState: design.strainShape === 'piezo-array' ? design.activeActuatorIndex : design.strainCenterMm,
  });
  const solved = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), design.fixedLaserWavelengthNm);
  const dominantRegionCenterMm = detectReflectionRegions(solved.spatialField, 0.5)
    .sort((left, right) => right.peakNormalizedIntensity - left.peakNormalizedIntensity)[0]?.centerMm ?? null;
  return { label, design, targetDepthMm, targetWidthMm, metrics, dominantRegionCenterMm };
}

function bestBySelectivity(cases: StudyCase[]): StudyCase | null {
  return [...cases].sort((left, right) =>
    (right.metrics.targetSelectivity ?? 0) - (left.metrics.targetSelectivity ?? 0) ||
    right.metrics.peakEnhancement - left.metrics.peakEnhancement,
  )[0] ?? null;
}

function chooseWindowVsTroughConclusion(): string {
  const windowS = bestWindow?.metrics.targetSelectivity ?? 0;
  const troughS = bestTrough?.metrics.targetSelectivity ?? 0;
  if (windowS > troughS * 1.1) return 'LOCAL STRAIN WINDOW PERFORMS BEST';
  if (troughS > windowS * 1.1) return 'BIASED STRAIN TROUGH PERFORMS BEST';
  return 'WINDOW AND TROUGH ARE COMPARABLE';
}

function chooseOverallConclusion(): string {
  const pztBest = Math.max(bestWindow?.metrics.targetSelectivity ?? 0, bestTrough?.metrics.targetSelectivity ?? 0, bestArray?.multi.medianSelectivity ?? 0);
  const priorBest = Math.max(...comparisonCases.map((item) => item.metrics.targetSelectivity ?? 0));
  if (pztBest > priorBest * 1.25 && pztBest > 1.5) return 'PIEZO-DEFINED STRAIN STATES MATERIALLY IMPROVE ADDRESSABILITY';
  if (pztBest > priorBest * 0.9) return 'PIEZO-DEFINED STRAIN STATES PROVIDE A USEFUL TRADE-OFF BUT NOT A CLEAR IMPROVEMENT';
  return 'PIEZO-DEFINED STRAIN STATES DO NOT IMPROVE ADDRESSABILITY';
}

function chooseArrayConclusion(): string {
  const fraction = bestArray?.multi.addressableFractions['S>1.5'] ?? 0;
  if (fraction > 0.75) return 'CLEAN DISCRETE DEPTH ADDRESSING';
  if (fraction > 0.25) return 'PARTIAL / AMBIGUOUS DISCRETE ADDRESSING';
  return 'NO USEFUL DISCRETE ADDRESSING';
}

function renderReport(): string {
  return [
    '# WP-v2-08 Piezo-Defined Strain Window Study',
    '',
    payload.conclusions.overall,
    '',
    '## Actuator-Field Architecture',
    '',
    'Electrical actuator commands are represented only as prescribed quasi-static strain states. The optical pipeline remains actuator command -> prescribed perturbation field -> material response -> permanent grating -> spatial CMT solver -> calculated reflection metrics.',
    '',
    'The prescribed PZT-like strain profile is an optical design target, not yet a demonstrated mechanical field.',
    '',
    '## Window vs Trough',
    '',
    payload.conclusions.windowVsTrough,
    '',
    table(['case', 'width mm', 'edge mm', 'bias strain', 'peak/local strain', 'target response', 'competitor', 'selectivity', 'regions', 'optical width mm'], [
      rowForCase('best window', bestWindow),
      rowForCase('best trough', bestTrough),
    ]),
    '',
    '## Sequential Piezo Array',
    '',
    payload.conclusions.array,
    '',
    bestArray ? [
      `- actuator count: ${bestArray.actuatorCount}`,
      `- actuator pitch: ${fmt(bestArray.pitchMm)} mm`,
      `- window width: ${fmt(bestArray.design.strainWidthMm)} mm`,
      `- transition width: ${fmt(bestArray.design.perturbationEdgeWidthMm)} mm`,
      `- peak/local strain: ${fmt(bestArray.design.peakStrain)}`,
      `- background bias strain: ${fmt(bestArray.design.strainBias)}`,
      `- median selectivity: ${fmt(bestArray.multi.medianSelectivity)}`,
      `- minimum selectivity: ${fmt(bestArray.multi.minimumSelectivity)}`,
      `- addressable S>1.1: ${fmt(bestArray.multi.addressableFractions['S>1.1'])}`,
      `- addressable S>1.5: ${fmt(bestArray.multi.addressableFractions['S>1.5'])}`,
      `- addressable S>2: ${fmt(bestArray.multi.addressableFractions['S>2'])}`,
    ].join('\n') : 'No array cases evaluated.',
    '',
    '## Inter-Actuator Interpolation',
    '',
    payload.conclusions.interpolation,
    '',
    table(['alpha', 'dominant center mm', 'selectivity', 'total R', 'secondary ratio'], interpolationCases.map((item) => [
      item.label.replace('adjacent-alpha-', ''),
      fmt(item.dominantRegionCenterMm),
      fmt(item.metrics.targetSelectivity),
      fmt(item.metrics.totalReflectance),
      fmt(item.metrics.secondaryPeakRatio),
    ])),
    '',
    '## Prior Architecture Comparison',
    '',
    table(['architecture', 'target response', 'selectivity', 'secondary ratio', 'region count', 'optical width mm'], [
      ...comparisonCases.map((item) => comparisonRowForCase(item.label, item)),
      comparisonRowForCase('PZT window', bestWindow),
      comparisonRowForCase('PZT trough', bestTrough),
    ]),
    '',
    '## Operating Point',
    '',
    `- static Bragg wavelength: ${fmt(payload.staticBraggWavelengthNm)} nm`,
    `- laser wavelength: ${fmt(baseDesign.fixedLaserWavelengthNm)} nm`,
    `- local Bragg shift estimate for 0.003 strain: ${fmt(payload.staticBraggWavelengthNm * 0.003 * (1 - baseDesign.effectivePhotoelasticCoefficient))} nm`,
    '- time model: quasi-static during one illumination interval; actuator settling and drive latency are deferred.',
    '',
    '## Mechanical Follow-Up',
    '',
    '- Candidate realizations: surface-bonded PZT patch, opposed PZT pair, embedded piezo layer, segmented piezo array, mechanically isolated local zone, preloaded medium plus differential actuator.',
    '- Required strain-field geometry is the optical result above; mechanical feasibility is unverified.',
    '',
  ].join('\n') + '\n';
}

function rowForCase(label: string, item: StudyCase | null): string[] {
  if (!item) return [label, 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a', 'n/a'];
  return [
    label,
    fmt(item.design.strainWidthMm),
    fmt(item.design.perturbationEdgeWidthMm),
    fmt(item.design.strainBias),
    fmt(item.design.peakStrain),
    fmt(item.metrics.targetPower),
    fmt(item.metrics.strongestCompetitorPower),
    fmt(item.metrics.targetSelectivity),
    String(item.metrics.activeRegionCount),
    fmt(item.metrics.activeRegionWidthMm),
  ];
}

function comparisonRowForCase(label: string, item: StudyCase | null): string[] {
  if (!item) return [label, 'n/a', 'n/a', 'n/a', 'n/a', 'n/a'];
  return [
    label,
    fmt(item.metrics.targetPower),
    fmt(item.metrics.targetSelectivity),
    fmt(item.metrics.secondaryPeakRatio),
    String(item.metrics.activeRegionCount),
    fmt(item.metrics.activeRegionWidthMm),
  ];
}

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toPrecision(4);
}
