import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import {
  classifyUsefulResponse,
  evaluateMultiStateObjective,
  evaluateTargetReflectionState,
  type ObjectiveMetrics,
} from '../src/simulation/optimization/targetReflectionState';
import { detectReflectionRegions } from '../src/simulation/experiments/hybridBraggExperiments';
import { solveHybridBraggCoupledModePoint } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import type { LayerStack } from '../src/simulation/layers/stack';
import { solveLayerStack } from '../src/simulation/solvers/transferMatrix';
import { applyMaterialStrainResponse } from '../src/simulation/responses/strainOpticResponse';
import {
  createHybridBraggModel,
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  getHybridDesignBraggWavelengthNm,
  sampleHybridBraggModel,
} from '../src/simulation/structures/hybridBraggGrating';

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
if (!bestTrough) throw new Error('No trough cases evaluated.');
const bestArray = arrayCases.sort((left, right) =>
  (right.multi.minimumSelectivity ?? 0) - (left.multi.minimumSelectivity ?? 0),
)[0];
const troughExplanation = explainTroughCase(bestTrough.design);
const metricAudit = auditCase(bestTrough);
const convergence = [700, 1400, 2100].map((segmentCount) =>
  runCase(`segments-${segmentCount}`, { ...bestTrough.design, segmentCount }, bestTrough.targetDepthMm),
);
const positionResolution = [17, 41, 81].map((sampleCount) => bestMovingTroughAtResolution(bestTrough.design, sampleCount));
const robustness = {
  bias: biasStrains.map((strainBias) => runCase(`bias-${strainBias}`, { ...bestTrough.design, strainBias }, 5)),
  troughDepth: [0.0005, 0.001, 0.0015, 0.002, 0.003].map((peakStrain) => runCase(`trough-depth-${peakStrain}`, { ...bestTrough.design, peakStrain }, 5)),
  laser: [-0.2, -0.1, 0, 0.1, 0.2, 0.4].map((offsetNm) => runCase(`laser-offset-${offsetNm}`, {
    ...bestTrough.design,
    fixedLaserWavelengthNm: getHybridDesignBraggWavelengthNm(bestTrough.design) + offsetNm,
  }, 5)),
  width: [0.4, 0.8, 1.2, 2, 3.5].map((strainWidthMm) => runCase(`width-${strainWidthMm}`, { ...bestTrough.design, strainWidthMm }, 5)),
  transition: transitionWidthsMm.map((perturbationEdgeWidthMm) => runCase(`edge-${perturbationEdgeWidthMm}`, { ...bestTrough.design, perturbationEdgeWidthMm }, 5)),
};
const edgeTranslation = [0.75, 2.5, 5, 7.5, 9.25].map((center) =>
  runCase(`translated-${center}`, { ...bestTrough.design, strainCenterMm: center }, center),
);
const movingTrough = targetDepthsMm.map((center) => {
  const item = runCase(`moving-trough-${center}`, { ...bestTrough.design, strainCenterMm: center }, center);
  return { ...item, positionErrorMm: item.dominantRegionCenterMm === null ? null : item.dominantRegionCenterMm - center };
});
const biasedTroughArrays = [4, 8].map(runBiasedTroughArrayCase);
const bestBiasedTroughArray = [...biasedTroughArrays].sort((left, right) =>
  (right.multi.minimumSelectivity ?? 0) - (left.multi.minimumSelectivity ?? 0),
)[0];
const troughInterpolationCases = [0, 0.25, 0.5, 0.75, 1].map(runTroughInterpolationCase);
const tmmSpotCheck = runTmmSpotCheck(bestTrough.design);
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
  troughExplanation,
  metricAudit,
  convergence,
  positionResolution,
  robustness,
  edgeTranslation,
  movingTrough,
  biasedTroughArrays,
  bestBiasedTroughArray,
  troughInterpolationCases,
  tmmSpotCheck,
  conclusions: {
    overall: chooseOverallConclusion(),
    windowVsTrough: chooseWindowVsTroughConclusion(),
    array: chooseArrayConclusion(),
    interpolation: 'PARTIAL / NONLINEAR INTERPOLATION',
    validation: chooseValidationConclusion(),
    selectivity: 'REVISED',
    convergence: chooseConvergenceConclusion(),
    robustness: chooseRobustnessConclusion(),
    movingTrough: chooseMovingTroughConclusion(),
    biasedTroughArray: chooseBiasedTroughArrayConclusion(),
    tmm: chooseTmmConclusion(),
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

function runBiasedTroughArrayCase(actuatorCount: number) {
  const pitch = baseDesign.lengthMm / (actuatorCount + 1);
  const design = {
    ...bestTrough.design,
    strainShape: 'piezo-array' as const,
    actuatorPolarity: 'trough' as const,
    actuatorCount,
    actuatorPitchMm: pitch,
    strainCenterMm: baseDesign.lengthMm / 2,
    strainWidthMm: Math.min(bestTrough.design.strainWidthMm, pitch * 0.9),
    perturbationEdgeWidthMm: Math.min(bestTrough.design.perturbationEdgeWidthMm, pitch * 0.35),
    actuatorCommandAmplitude: 1,
    actuatorAdjacentCommandAmplitude: 0.1,
  };
  const depths = actuatorCenters(design);
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

function runTroughInterpolationCase(alpha: number): StudyCase {
  return runCase(`trough-alpha-${alpha}`, {
    ...bestTrough.design,
    strainShape: 'piezo-array',
    actuatorPolarity: 'trough',
    actuatorCount: 2,
    actuatorPitchMm: 1.2,
    strainCenterMm: 5,
    strainWidthMm: bestTrough.design.strainWidthMm,
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

function actuatorCenters(design: HybridBraggDesignInputs): number[] {
  const pitch = design.actuatorPitchMm;
  const firstCenter = design.strainCenterMm - ((design.actuatorCount - 1) * pitch) / 2;
  return Array.from({ length: design.actuatorCount }, (_, index) => firstCenter + index * pitch);
}

function auditCase(item: StudyCase) {
  const biasOnlyDesign = { ...item.design, peakStrain: 0 };
  const biasOnly = solveHybridBraggCoupledModePoint(createHybridBraggModel(biasOnlyDesign), item.design.fixedLaserWavelengthNm);
  return {
    targetResponse: item.metrics.targetPower,
    strongestCompetingResponse: item.metrics.strongestCompetitorPower,
    selectivity: item.metrics.targetSelectivity,
    usefulResponse: classifyUsefulResponse(item.metrics),
    staticReflectance: item.metrics.staticReflectance,
    biasOnlyReflectance: biasOnly.reflectance,
    activeTroughReflectance: item.metrics.totalReflectance,
    peakEnhancement: item.metrics.peakEnhancement,
    offTargetIntegratedBackwardIntensity: item.metrics.offTargetPower,
    secondaryRegionRatio: item.metrics.secondaryPeakRatio,
    regionCount: item.metrics.activeRegionCount,
  };
}

function explainTroughCase(design: HybridBraggDesignInputs) {
  const model = createHybridBraggModel(design);
  const result = solveHybridBraggCoupledModePoint(model, design.fixedLaserWavelengthNm);
  const samples = sampleHybridBraggModel(model, design.fixedLaserWavelengthNm * 1e-9);
  const depthsMm = [0.5, 2.5, 5, 7.5, 9.5];
  return depthsMm.map((zMm) => {
    const sample = nearestSample(samples, zMm);
    const field = nearestField(result.spatialField, zMm);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, sample.strain);
    return {
      zMm,
      strain: sample.strain,
      gratingPeriodNm: local.periodM * 1e9,
      indexChange: local.indexChange,
      braggWavelengthNm: local.braggWavelengthM * 1e9,
      laserDetuningNm: design.fixedLaserWavelengthNm - local.braggWavelengthM * 1e9,
      couplingCoefficientPerM: sample.couplingCoefficientPerM,
      forwardIntensity: field.forwardIntensity,
      backwardIntensity: field.backwardIntensity,
      normalizedBackwardIntensity: field.normalizedBackwardIntensity,
    };
  });
}

function bestMovingTroughAtResolution(design: HybridBraggDesignInputs, sampleCount: number) {
  const step = design.lengthMm / (sampleCount - 1);
  const candidates = Array.from({ length: sampleCount }, (_, index) => {
    const center = Number((index * step).toPrecision(12));
    return runCase(`position-resolution-${sampleCount}-${center}`, { ...design, strainCenterMm: center }, center);
  });
  const best = bestBySelectivity(candidates)!;
  return {
    sampleCount,
    stepMm: step,
    bestSelectivity: best.metrics.targetSelectivity,
    bestTargetPositionMm: best.targetDepthMm,
    regionCenterMm: best.dominantRegionCenterMm,
  };
}

function runTmmSpotCheck(design: HybridBraggDesignInputs) {
  const wavelengths = [
    design.fixedLaserWavelengthNm - 0.2,
    design.fixedLaserWavelengthNm - 0.1,
    design.fixedLaserWavelengthNm,
    design.fixedLaserWavelengthNm + 0.1,
    design.fixedLaserWavelengthNm + 0.2,
  ];
  const activeStack = buildTroughTmmStack(design, 1);
  const biasStack = buildTroughTmmStack({ ...design, peakStrain: 0 }, 1);
  const cmtActive = wavelengths.map((wavelengthNm) => solveHybridBraggCoupledModePoint(createHybridBraggModel(design), wavelengthNm));
  const tmmActive = wavelengths.map((wavelengthNm) => solveLayerStack(activeStack, {
    wavelengthNm,
    incidentAngleDegrees: 0,
    polarization: 'TE',
  }));
  const cmtBias = solveHybridBraggCoupledModePoint(createHybridBraggModel({ ...design, peakStrain: 0 }), design.fixedLaserWavelengthNm);
  const tmmBias = solveLayerStack(biasStack, {
    wavelengthNm: design.fixedLaserWavelengthNm,
    incidentAngleDegrees: 0,
    polarization: 'TE',
  });
  return {
    slicesPerPeriod: 1,
    layerCount: activeStack.layers.length,
    cmtAtLaser: cmtActive[2].reflectance,
    tmmAtLaser: tmmActive[2].reflectance,
    absoluteDifferenceAtLaser: Math.abs(cmtActive[2].reflectance - tmmActive[2].reflectance),
    cmtBiasAtLaser: cmtBias.reflectance,
    tmmBiasAtLaser: tmmBias.reflectance,
    cmtPeakNm: peakWavelength(cmtActive),
    tmmPeakNm: peakWavelength(tmmActive),
    spectrum: wavelengths.map((wavelengthNm, index) => ({
      wavelengthNm,
      cmtReflectance: cmtActive[index].reflectance,
      tmmReflectance: tmmActive[index].reflectance,
    })),
  };
}

function buildTroughTmmStack(design: HybridBraggDesignInputs, slicesPerPeriod: number): LayerStack {
  const totalLengthNm = design.lengthMm * 1e6;
  const sliceCount = Math.max(1, Math.round((totalLengthNm / design.gratingPeriodNm) * slicesPerPeriod));
  const thicknessNm = totalLengthNm / sliceCount;
  const model = createHybridBraggModel(design);
  const samples = sampleHybridBraggModel({ ...model, segmentCount: sliceCount }, design.fixedLaserWavelengthNm * 1e-9);
  const background = { id: 'hybrid-background', name: 'Hybrid background', refractiveIndex: design.averageIndex };
  let gratingPhase = design.gratingPhaseRadians;
  return {
    incidentMedium: background,
    exitMedium: background,
    layers: Array.from({ length: sliceCount }, (_, index) => {
      const sampled = samples[index];
      if (index > 0) gratingPhase += (2 * Math.PI * thicknessNm * 1e-9) / sampled.periodM;
      const refractiveIndex = sampled.averageIndex + design.indexModulation * Math.cos(gratingPhase);
      return {
        thicknessNm,
        material: {
          id: `hybrid-trough-${index}`,
          name: `Hybrid trough ${index}`,
          refractiveIndex,
        },
      };
    }),
  };
}

function nearestSample<T extends { zM: number }>(samples: T[], zMm: number): T {
  return samples.reduce((best, sample) => Math.abs(sample.zM * 1e3 - zMm) < Math.abs(best.zM * 1e3 - zMm) ? sample : best, samples[0]);
}

function nearestField<T extends { zM: number }>(samples: T[], zMm: number): T {
  return nearestSample(samples, zMm);
}

function peakWavelength(points: Array<{ wavelengthNm: number; reflectance: number }>): number {
  return points.reduce((best, point) => point.reflectance > best.reflectance ? point : best, points[0]).wavelengthNm;
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

function chooseValidationConclusion(): string {
  const converged = chooseConvergenceConclusion() === 'BIASED-TROUGH RESULT CONVERGED';
  const robust = chooseRobustnessConclusion() !== 'ISOLATED / FRAGILE NUMERICAL OPTIMUM';
  const useful = metricAudit.usefulResponse === 'high-selectivity / meaningful-response';
  const tmmSupport = chooseTmmConclusion() !== 'DOES NOT SUPPORT THE CMT TROUGH RESULT';
  if (converged && robust && useful && tmmSupport) return 'BIASED STRAIN-TROUGH ARCHITECTURE SURVIVES VALIDATION';
  if (useful) return 'BIASED STRAIN-TROUGH ADVANTAGE IS REAL BUT FRAGILE';
  return 'BIASED STRAIN-TROUGH ADVANTAGE DOES NOT SURVIVE VALIDATION';
}

function chooseConvergenceConclusion(): string {
  const targetValues = convergence.map((item) => item.metrics.targetPower);
  const reflectanceValues = convergence.map((item) => item.metrics.totalReflectance);
  const targetSpread = Math.max(...targetValues) - Math.min(...targetValues);
  const reflectanceSpread = Math.max(...reflectanceValues) - Math.min(...reflectanceValues);
  const targetMean = targetValues.reduce((sum, value) => sum + value, 0) / targetValues.length;
  const reflectanceMean = reflectanceValues.reduce((sum, value) => sum + value, 0) / reflectanceValues.length;
  return targetSpread / targetMean < 0.01 && reflectanceSpread / reflectanceMean < 0.01
    ? 'BIASED-TROUGH RESULT CONVERGED'
    : 'BIASED-TROUGH RESULT NOT YET CONVERGED';
}

function chooseRobustnessConclusion(): string {
  const usefulCount = [
    ...robustness.bias,
    ...robustness.troughDepth,
    ...robustness.laser,
    ...robustness.width,
    ...robustness.transition,
  ].filter((item) => classifyUsefulResponse(item.metrics) === 'high-selectivity / meaningful-response').length;
  if (usefulCount >= 12) return 'ROBUST PARAMETER REGION FOUND';
  if (usefulCount >= 5) return 'NARROW BUT REPRODUCIBLE REGION';
  return 'ISOLATED / FRAGILE NUMERICAL OPTIMUM';
}

function chooseMovingTroughConclusion(): string {
  const errors = movingTrough
    .map((item) => item.positionErrorMm)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const meanAbsError = errors.reduce((sum, value) => sum + Math.abs(value), 0) / Math.max(1, errors.length);
  if (errors.length >= movingTrough.length - 1 && meanAbsError < 0.5) return 'OPTICAL REGION TRACKS MOVING STRAIN TROUGH';
  if (errors.length > 0 && meanAbsError < 1.5) return 'OPTICAL REGION PARTIALLY / NONLINEARLY TRACKS TROUGH';
  return 'MOVING TROUGH DOES NOT PROVIDE USEFUL OPTICAL TRACKING';
}

function chooseBiasedTroughArrayConclusion(): string {
  const fraction = bestBiasedTroughArray?.multi.addressableFractions['S>1.5'] ?? 0;
  if (fraction > 0.75) return 'BIASED-TROUGH ARRAY ENABLES USEFUL DISCRETE ADDRESSING';
  if (fraction > 0.25) return 'BIASED-TROUGH ARRAY IMPROVES BUT REMAINS AMBIGUOUS';
  return 'ARRAY LIMITATION REMAINS DESPITE BIASED TROUGHS';
}

function chooseTmmConclusion(): string {
  if (tmmSpotCheck.absoluteDifferenceAtLaser < 0.01 && tmmSpotCheck.tmmAtLaser > tmmSpotCheck.tmmBiasAtLaser) return 'SUPPORTS THE CMT TROUGH RESULT';
  if (Math.sign(tmmSpotCheck.tmmAtLaser - tmmSpotCheck.tmmBiasAtLaser) === Math.sign(tmmSpotCheck.cmtAtLaser - tmmSpotCheck.cmtBiasAtLaser)) {
    return 'PARTIALLY SUPPORTS THE CMT TROUGH RESULT';
  }
  return 'DOES NOT SUPPORT THE CMT TROUGH RESULT';
}

function renderReport(): string {
  return [
    '# WP-v2-08 Piezo-Defined Strain Window Study',
    '',
    '## Primary Validation Result',
    '',
    payload.conclusions.validation,
    '',
    `Selectivity result: ${payload.conclusions.selectivity}; 2100-segment target response is ${fmt(convergence.at(-1)?.metrics.targetPower)} with competitor below the selectivity denominator floor, so the original 44.29 is best treated as a finite-resolution estimate rather than a final exact ratio.`,
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
    '## Solver-Level Trough Explanation',
    '',
    'The biased background shifts the local Bragg wavelength away from the fixed laser. The local trough reduces that strain and returns the trough region closer to the laser resonance; the listed optical intensity remains calculated from CMT fields, not from the strain footprint.',
    '',
    table(['z mm', 'epsilon', 'Lambda nm', 'Delta n', 'lambda_B nm', 'laser detuning nm', 'kappa 1/m', '|A|^2', '|B|^2 norm'], troughExplanation.map((item) => [
      fmt(item.zMm),
      fmt(item.strain),
      fmt(item.gratingPeriodNm),
      fmt(item.indexChange),
      fmt(item.braggWavelengthNm),
      fmt(item.laserDetuningNm),
      fmt(item.couplingCoefficientPerM),
      fmt(item.forwardIntensity),
      fmt(item.normalizedBackwardIntensity),
    ])),
    '',
    '## Raw Metric Audit',
    '',
    `Useful-response guard: ${metricAudit.usefulResponse}. The guard threshold is a research comparison threshold, not a display brightness requirement.`,
    '',
    table(['R_static/bias-only', 'R_active_trough', 'peak enhancement', 'target |B|^2', 'off-target |B|^2', 'competitor', 'selectivity', 'secondary ratio', 'regions'], [[
      fmt(metricAudit.staticReflectance),
      fmt(metricAudit.activeTroughReflectance),
      fmt(metricAudit.peakEnhancement),
      fmt(metricAudit.targetResponse),
      fmt(metricAudit.offTargetIntegratedBackwardIntensity),
      fmt(metricAudit.strongestCompetingResponse),
      fmt(metricAudit.selectivity),
      fmt(metricAudit.secondaryRegionRatio),
      String(metricAudit.regionCount),
    ]]),
    '',
    '## Numerical Convergence',
    '',
    payload.conclusions.convergence,
    '',
    table(['segments', 'target', 'competitor', 'selectivity', 'R_total', 'region center mm', 'width mm', 'secondary ratio'], convergence.map((item) => [
      String(item.design.segmentCount),
      fmt(item.metrics.targetPower),
      fmt(item.metrics.strongestCompetitorPower),
      fmt(item.metrics.targetSelectivity),
      fmt(item.metrics.totalReflectance),
      fmt(item.dominantRegionCenterMm),
      fmt(item.metrics.activeRegionWidthMm),
      fmt(item.metrics.secondaryPeakRatio),
    ])),
    '',
    '## Position Resolution',
    '',
    table(['samples', 'step mm', 'best selectivity', 'best target mm', 'region center mm'], positionResolution.map((item) => [
      String(item.sampleCount),
      fmt(item.stepMm),
      fmt(item.bestSelectivity),
      fmt(item.bestTargetPositionMm),
      fmt(item.regionCenterMm),
    ])),
    '',
    '## Robustness',
    '',
    payload.conclusions.robustness,
    '',
    'Bias, trough-depth, laser-detuning, width, and transition sweeps show whether the result occupies a finite neighborhood rather than a single point.',
    '',
    table(['sweep', 'best label', 'selectivity', 'target', 'R_total'], [
      robustnessRow('bias', robustness.bias),
      robustnessRow('trough depth', robustness.troughDepth),
      robustnessRow('laser', robustness.laser),
      robustnessRow('width', robustness.width),
      robustnessRow('transition', robustness.transition),
    ]),
    '',
    '## Edge Translation',
    '',
    classifyEdgeTranslation(),
    '',
    table(['trough center mm', 'region center mm', 'selectivity', 'target', 'R_total'], edgeTranslation.map((item) => [
      fmt(item.targetDepthMm),
      fmt(item.dominantRegionCenterMm),
      fmt(item.metrics.targetSelectivity),
      fmt(item.metrics.targetPower),
      fmt(item.metrics.totalReflectance),
    ])),
    '',
    '## Moving Trough Tracking',
    '',
    payload.conclusions.movingTrough,
    '',
    movingTroughStats(),
    '',
    table(['trough center mm', 'region center mm', 'Delta z mm', 'selectivity', 'R_total'], movingTrough.map((item) => [
      fmt(item.targetDepthMm),
      fmt(item.dominantRegionCenterMm),
      fmt(item.positionErrorMm),
      fmt(item.metrics.targetSelectivity),
      fmt(item.metrics.totalReflectance),
    ])),
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
    '## Biased-Trough Array',
    '',
    payload.conclusions.biasedTroughArray,
    '',
    bestBiasedTroughArray ? [
      `- actuator count: ${bestBiasedTroughArray.actuatorCount}`,
      `- actuator pitch: ${fmt(bestBiasedTroughArray.pitchMm)} mm`,
      `- median selectivity: ${fmt(bestBiasedTroughArray.multi.medianSelectivity)}`,
      `- minimum selectivity: ${fmt(bestBiasedTroughArray.multi.minimumSelectivity)}`,
      `- addressable S>1.1: ${fmt(bestBiasedTroughArray.multi.addressableFractions['S>1.1'])}`,
      `- addressable S>1.5: ${fmt(bestBiasedTroughArray.multi.addressableFractions['S>1.5'])}`,
      `- addressable S>2: ${fmt(bestBiasedTroughArray.multi.addressableFractions['S>2'])}`,
    ].join('\n') : 'No biased trough array cases evaluated.',
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
    '## Trough Interpolation',
    '',
    table(['alpha', 'dominant center mm', 'selectivity', 'total R', 'region count'], troughInterpolationCases.map((item) => [
      item.label.replace('trough-alpha-', ''),
      fmt(item.dominantRegionCenterMm),
      fmt(item.metrics.targetSelectivity),
      fmt(item.metrics.totalReflectance),
      String(item.metrics.activeRegionCount),
    ])),
    '',
    '## TMM Spot Check',
    '',
    payload.conclusions.tmm,
    '',
    `TMM layer count: ${tmmSpotCheck.layerCount}; slices per grating period: ${tmmSpotCheck.slicesPerPeriod}. This is a discretized scalar spot check of reflectance and resonance trend only; it is not a TMM analogue of CMT spatial |B(z)|^2.`,
    '',
    table(['metric', 'CMT', 'TMM', 'abs diff'], [
      ['active R at laser', fmt(tmmSpotCheck.cmtAtLaser), fmt(tmmSpotCheck.tmmAtLaser), fmt(tmmSpotCheck.absoluteDifferenceAtLaser)],
      ['bias-only R at laser', fmt(tmmSpotCheck.cmtBiasAtLaser), fmt(tmmSpotCheck.tmmBiasAtLaser), fmt(Math.abs(tmmSpotCheck.cmtBiasAtLaser - tmmSpotCheck.tmmBiasAtLaser))],
      ['peak wavelength nm', fmt(tmmSpotCheck.cmtPeakNm), fmt(tmmSpotCheck.tmmPeakNm), fmt(Math.abs(tmmSpotCheck.cmtPeakNm - tmmSpotCheck.tmmPeakNm))],
    ]),
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
    '## Mechanical Requirements',
    '',
    bestTrough ? [
      `- background bias strain: ${fmt(bestTrough.design.strainBias)}`,
      `- local trough strain: ${fmt(bestTrough.design.strainBias - bestTrough.design.peakStrain)}`,
      `- strain excursion: ${fmt(bestTrough.design.peakStrain)}`,
      `- trough width: ${fmt(bestTrough.design.strainWidthMm)} mm`,
      `- transition width: ${fmt(bestTrough.design.perturbationEdgeWidthMm)} mm`,
      `- usable positioning tolerance: ${movingTroughTolerance()}`,
      `- desired actuator pitch if array-based: ${bestBiasedTroughArray ? `${fmt(bestBiasedTroughArray.pitchMm)} mm first-pass tested, not yet useful` : 'n/a'}`,
    ].join('\n') : 'No trough candidate selected.',
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

function robustnessRow(label: string, cases: StudyCase[]): string[] {
  const best = bestBySelectivity(cases);
  return [
    label,
    best?.label ?? 'n/a',
    fmt(best?.metrics.targetSelectivity),
    fmt(best?.metrics.targetPower),
    fmt(best?.metrics.totalReflectance),
  ];
}

function classifyEdgeTranslation(): string {
  const interior = edgeTranslation.filter((item) => item.targetDepthMm > 1 && item.targetDepthMm < 9);
  const interiorGood = interior.filter((item) => (item.metrics.targetSelectivity ?? 0) > 2 && item.metrics.targetPower > 0.05).length;
  if (interiorGood === interior.length) return 'interior-robust';
  if (interiorGood > 0) return 'position-dependent but usable';
  return 'edge-dominated';
}

function movingTroughStats(): string {
  const errors = movingTrough
    .map((item) => item.positionErrorMm)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const meanAbsError = errors.reduce((sum, value) => sum + Math.abs(value), 0) / Math.max(1, errors.length);
  const maxAbsError = Math.max(...errors.map((value) => Math.abs(value)), 0);
  return `Position error: mean |Delta z| = ${fmt(meanAbsError)} mm; max |Delta z| = ${fmt(maxAbsError)} mm.`;
}

function movingTroughTolerance(): string {
  const errors = movingTrough
    .map((item) => item.positionErrorMm)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const maxAbsError = Math.max(...errors.map((value) => Math.abs(value)), 0);
  return `${fmt(maxAbsError)} mm first-pass max absolute optical-center error`;
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
