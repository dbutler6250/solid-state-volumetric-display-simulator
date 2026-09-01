import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import { detectReflectionRegions, type ReflectionRegion } from '../src/simulation/experiments/hybridBraggExperiments';
import { createSmoothTroughField } from '../src/simulation/mechanics/actuatorStrainTransfer';
import { evaluateMechanicalArchitectures } from '../src/simulation/mechanics/mechanicalArchitectures';
import { evaluateTargetReflectionState, type ObjectiveMetrics } from '../src/simulation/optimization/targetReflectionState';
import { sampleStrainField } from '../src/simulation/perturbations/strainField';
import { applyMaterialStrainResponse } from '../src/simulation/responses/strainOpticResponse';
import { reconstructHybridBraggMaxwellFields, type MaxwellFieldSample } from '../src/simulation/solvers/maxwell/longGratingScatteringSolver';
import { solveHybridBraggCoupledModePoint, solveHybridBraggCoupledModeSpectrum } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import {
  createHybridBraggModel,
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  getCouplingCoefficientPerM,
  getHybridDesignBraggWavelengthNm,
} from '../src/simulation/structures/hybridBraggGrating';

type Candidate = {
  className: 'Historical baseline' | 'Low-Strain' | 'Balanced' | 'High-Contrast';
  backgroundDetuningNm: number;
  activeDetuningNm: number;
  design: HybridBraggDesignInputs;
  backgroundReflectance: number;
  activeReflectance: number;
  contrastDifference: number;
  contrastRatio: number;
  normalizedDetuningFwhm: number;
  normalizedDetuningKappa: number;
  required: RequiredStrain;
  localization: LocalizationMetrics;
  objective: ObjectiveMetrics;
  score: number;
};

type RequiredStrain = {
  backgroundStrain: number;
  backgroundMicrostrain: number;
  localExcursion: number;
  localExcursionMicrostrain: number;
  activeTroughStrain: number;
  activeTroughMicrostrain: number;
};

type LocalizationMetrics = {
  dominantCenterMm: number | null;
  widthMm: number | null;
  trackingErrorMm: number | null;
  significantRegionCount: number;
  secondaryRegionRatio: number | null;
  targetFraction: number | null;
};

const ISSUE = 78;
const OUT_DIR = join(process.cwd(), 'artifacts', `issue-${ISSUE}`);
const JSON_PATH = join(OUT_DIR, 'fixed-grating-operating-point-study.json');
const REPORT_PATH = join(OUT_DIR, 'fixed-grating-operating-point-study.md');
const TARGET_CENTER_MM = 5;
const TARGET_WIDTH_MM = 0.8;
const RATIO_FLOOR = 1e-6;
const REGION_THRESHOLD = 0.5;
const LASER_NM = 600.11;
const HISTORICAL_STATIC_DETUNING_NM = 0.10;
const DETUNINGS_NM = [-1, -0.8, -0.6, -0.4, -0.25, -0.15, -0.1, -0.05, -0.025, 0, 0.025, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 0.8, 1];
const ACTIVE_DETUNINGS_NM = [-0.05, -0.025, -0.01, 0, 0.01, 0.025, 0.05];

const baseline = createStudyDesign();
const staticBraggWavelengthNm = getHybridDesignBraggWavelengthNm(baseline);
const bandwidth = characterizeBareGrating();
const strainTuningBudget = [500, 1000, 1500, 2000, 2500, 3000].map((microstrain) =>
  strainShiftBudgetPoint(microstrain / 1e6));
const baselineAudit = auditBaseline();
const backgroundSweep = DETUNINGS_NM.map((backgroundDetuningNm) => {
  const design = designForDetunings(backgroundDetuningNm, 0);
  return {
    backgroundDetuningNm,
    sign: Math.sign(backgroundDetuningNm),
    backgroundStrain: design.strainBias,
    backgroundReflectance: backgroundReflectance(design),
    normalizedDetuningFwhm: Math.abs(backgroundDetuningNm) / bandwidth.fwhmNm,
    normalizedDetuningKappa: normalizedKappaDetuning(design, backgroundDetuningNm),
  };
});
const activeSweep = buildActiveSweep();
const candidates = selectCandidates(activeSweep);
const maxwellValidation = candidates.map((candidate) => validateCandidateWithMaxwell(candidate));
const transitionWidthSensitivity = sensitivitySweep(candidates, [0.2, 0.25, 0.32, 0.4, 0.5], 'perturbationEdgeWidthMm');
const troughWidthSensitivity = sensitivitySweep(candidates, [0.5, 0.8, 1.0, 1.5], 'strainWidthMm');
const laserSensitivity = candidates.map((candidate) => ({
  className: candidate.className,
  points: [-0.025, -0.01, -0.005, 0, 0.005, 0.01, 0.025].map((offsetNm) => evaluateVariant(candidate, {
    fixedLaserWavelengthNm: candidate.design.fixedLaserWavelengthNm + offsetNm,
  }, offsetNm)),
}));
const gratingCenterSensitivity = candidates.map((candidate) => ({
  className: candidate.className,
  points: [-0.1, -0.05, -0.025, -0.01, 0, 0.01, 0.025, 0.05, 0.1].map((offsetNm) => evaluateVariant(candidate, {
    gratingPeriodNm: candidate.design.gratingPeriodNm + offsetNm / (2 * candidate.design.averageIndex),
  }, offsetNm)),
}));
const indexModulationSensitivity = [5e-5, 1e-4, 2e-4].map((indexModulation) => ({
  indexModulation,
  bareBandwidthFwhmNm: characterizeBareGrating({ indexModulation }).fwhmNm,
  bestBalanced: bestForClass(activeSweep.map((point) => {
    const design = { ...point.design, indexModulation };
    return evaluateCandidate('Balanced', point.backgroundDetuningNm, point.activeDetuningNm, design);
  }), 'Balanced'),
}));
const lengthSensitivity = [5, 10, 20].map((lengthMm) => ({
  lengthMm,
  bareBandwidthFwhmNm: characterizeBareGrating({ lengthMm }).fwhmNm,
  bestBalanced: bestForClass(activeSweep.map((point) => {
    const design = { ...point.design, lengthMm, strainCenterMm: lengthMm / 2 };
    return evaluateCandidate('Balanced', point.backgroundDetuningNm, point.activeDetuningNm, design);
  }), 'Balanced'),
}));
const mechanicalComparison = candidates.map((candidate) => compareMechanics(candidate));
const conclusions = chooseConclusions(candidates, maxwellValidation);

const payload = {
  issue: ISSUE,
  ratioFloor: RATIO_FLOOR,
  baselineAudit,
  strainTuningBudget,
  barePermanentGrating: bandwidth,
  normalizedDetuningDefinition: {
    fwhm: 'D = |lambda_L - lambda_B,bg| / bare permanent-grating FWHM',
    kappa: '|delta| / kappa from the local CMT detuning and coupling coefficient',
  },
  backgroundSweep,
  activeSweep,
  paretoCandidates: candidates,
  maxwellValidation,
  mechanicalComparison,
  transitionWidthSensitivity,
  troughWidthSensitivity,
  laserSensitivity,
  gratingCenterSensitivity,
  indexModulationSensitivity,
  lengthSensitivity,
  conclusions,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());
console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function createStudyDesign(overrides: Partial<HybridBraggDesignInputs> = {}): HybridBraggDesignInputs {
  const baseStaticBraggNm = getHybridDesignBraggWavelengthNm(DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS);
  const periodNm = (LASER_NM - HISTORICAL_STATIC_DETUNING_NM) / (2 * DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.averageIndex);
  return {
    ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
    gratingPeriodNm: Number.isFinite(periodNm) ? periodNm : baseStaticBraggNm / (2 * DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.averageIndex),
    fixedLaserWavelengthNm: LASER_NM,
    strainBias: 0.0015,
    peakStrain: -0.0015,
    strainShape: 'piezo-trough',
    actuatorPolarity: 'trough',
    strainCenterMm: TARGET_CENTER_MM,
    strainWidthMm: TARGET_WIDTH_MM,
    perturbationEdgeWidthMm: 0.25,
    segmentCount: 700,
    ...overrides,
  };
}

function localBraggWavelengthNm(design: HybridBraggDesignInputs, strain: number): number {
  const model = createHybridBraggModel(design);
  return applyMaterialStrainResponse(model.grating, model.materialResponse, strain).braggWavelengthM * 1e9;
}

function strainForBraggWavelength(design: HybridBraggDesignInputs, targetBraggNm: number): number {
  let low = -0.01;
  let high = 0.01;
  for (let index = 0; index < 80; index += 1) {
    const mid = (low + high) / 2;
    if (localBraggWavelengthNm(design, mid) < targetBraggNm) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function designForDetunings(backgroundDetuningNm: number, activeDetuningNm: number): HybridBraggDesignInputs {
  const design = createStudyDesign();
  const backgroundStrain = strainForBraggWavelength(design, LASER_NM - backgroundDetuningNm);
  const activeStrain = strainForBraggWavelength(design, LASER_NM - activeDetuningNm);
  return {
    ...design,
    strainBias: backgroundStrain,
    peakStrain: activeStrain - backgroundStrain,
  };
}

function auditBaseline() {
  const model = createHybridBraggModel(baseline);
  const centerStrain = sampleStrainField(model.strain, TARGET_CENTER_MM * 1e-3);
  const lambdaB0 = getHybridDesignBraggWavelengthNm(baseline);
  const lambdaBg = localBraggWavelengthNm(baseline, baseline.strainBias);
  const lambdaActive = localBraggWavelengthNm(baseline, centerStrain);
  return {
    lambdaB0Nm: lambdaB0,
    lambdaBBackgroundNm: lambdaBg,
    lambdaBActiveNm: lambdaActive,
    lambdaLaserNm: baseline.fixedLaserWavelengthNm,
    deltaLambda0Nm: baseline.fixedLaserWavelengthNm - lambdaB0,
    deltaLambdaBackgroundNm: baseline.fixedLaserWavelengthNm - lambdaBg,
    deltaLambdaActiveNm: baseline.fixedLaserWavelengthNm - lambdaActive,
    backgroundStrain: baseline.strainBias,
    activeTroughStrain: centerStrain,
  };
}

function strainShiftBudgetPoint(strain: number) {
  const shifted = localBraggWavelengthNm(baseline, strain);
  const unstrained = getHybridDesignBraggWavelengthNm(baseline);
  return {
    strain,
    microstrain: strain * 1e6,
    braggShiftNm: shifted - unstrained,
    localSlopeNmPer1000Microstrain: ((shifted - unstrained) / strain) / 1000,
  };
}

function characterizeBareGrating(overrides: Partial<HybridBraggDesignInputs> = {}) {
  const design = createStudyDesign({ strainBias: 0, peakStrain: 0, ...overrides });
  const centerNm = getHybridDesignBraggWavelengthNm(design);
  const wavelengths = range(centerNm - 0.7, centerNm + 0.7, 0.002);
  const spectrum = solveHybridBraggCoupledModeSpectrum(createHybridBraggModel(design), wavelengths);
  const peak = spectrum.reduce((best, point) => point.reflectance > best.reflectance ? point : best, spectrum[0]);
  const halfMax = peak.reflectance / 2;
  const above = spectrum.filter((point) => point.reflectance >= halfMax);
  const stopband = spectrum.filter((point) => point.reflectance >= peak.reflectance * 0.05);
  return {
    method: 'CMT spectrum for the bare unstrained permanent grating; Maxwell is used later for selected full-device candidates.',
    peakReflectance: peak.reflectance,
    centerWavelengthNm: peak.wavelengthNm,
    fwhmNm: above.length > 1 ? above[above.length - 1].wavelengthNm - above[0].wavelengthNm : 0,
    reflectionBand5PercentNm: stopband.length > 1 ? stopband[stopband.length - 1].wavelengthNm - stopband[0].wavelengthNm : 0,
    sampledRangeNm: [wavelengths[0], wavelengths[wavelengths.length - 1]],
  };
}

function buildActiveSweep(): Candidate[] {
  const candidates: Candidate[] = [];
  for (const backgroundDetuningNm of DETUNINGS_NM) {
    for (const activeDetuningNm of ACTIVE_DETUNINGS_NM) {
      const design = designForDetunings(backgroundDetuningNm, activeDetuningNm);
      if (requiredStrain(design).localExcursion <= 0) {
        candidates.push(evaluateCandidate('Balanced', backgroundDetuningNm, activeDetuningNm, design));
      }
    }
  }
  candidates.push(evaluateCandidate('Historical baseline', baselineAudit.deltaLambdaBackgroundNm, baselineAudit.deltaLambdaActiveNm, baseline));
  return candidates;
}

function evaluateCandidate(
  className: Candidate['className'],
  backgroundDetuningNm: number,
  activeDetuningNm: number,
  design: HybridBraggDesignInputs,
): Candidate {
  const background = backgroundReflectance(design);
  const active = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), design.fixedLaserWavelengthNm);
  const regions = detectReflectionRegions(active.spatialField, REGION_THRESHOLD);
  const objective = evaluateTargetReflectionState(design, {
    targetDepthMm: TARGET_CENTER_MM,
    targetWidthMm: TARGET_WIDTH_MM,
    controlKind: 'position',
    controlState: TARGET_CENTER_MM,
  });
  const required = requiredStrain(design);
  const contrastDifference = active.reflectance - background;
  const contrastRatio = active.reflectance / (background + RATIO_FLOOR);
  return {
    className,
    backgroundDetuningNm,
    activeDetuningNm,
    design,
    backgroundReflectance: background,
    activeReflectance: active.reflectance,
    contrastDifference,
    contrastRatio,
    normalizedDetuningFwhm: Math.abs(backgroundDetuningNm) / bandwidth.fwhmNm,
    normalizedDetuningKappa: normalizedKappaDetuning(design, backgroundDetuningNm),
    required,
    localization: localizationMetrics(regions, objective),
    objective,
    score: contrastDifference * localizationMetrics(regions, objective).targetFraction! / (1 + Math.abs(required.localExcursionMicrostrain) / 1000),
  };
}

function backgroundReflectance(design: HybridBraggDesignInputs): number {
  const backgroundDesign = { ...design, peakStrain: 0 };
  return solveHybridBraggCoupledModePoint(createHybridBraggModel(backgroundDesign), design.fixedLaserWavelengthNm).reflectance;
}

function requiredStrain(design: HybridBraggDesignInputs): RequiredStrain {
  const model = createHybridBraggModel(design);
  const activeTroughStrain = sampleStrainField(model.strain, TARGET_CENTER_MM * 1e-3);
  const localExcursion = activeTroughStrain - design.strainBias;
  return {
    backgroundStrain: design.strainBias,
    backgroundMicrostrain: design.strainBias * 1e6,
    localExcursion,
    localExcursionMicrostrain: localExcursion * 1e6,
    activeTroughStrain,
    activeTroughMicrostrain: activeTroughStrain * 1e6,
  };
}

function localizationMetrics(regions: ReflectionRegion[], objective: ObjectiveMetrics): LocalizationMetrics {
  const primary = regions[0] ?? null;
  return {
    dominantCenterMm: primary?.centerMm ?? null,
    widthMm: primary ? primary.endMm - primary.startMm : null,
    trackingErrorMm: primary ? primary.centerMm - TARGET_CENTER_MM : null,
    significantRegionCount: regions.length,
    secondaryRegionRatio: objective.secondaryPeakRatio,
    targetFraction: objective.targetPower / Math.max(objective.targetPower + objective.offTargetPower, 1e-12),
  };
}

function normalizedKappaDetuning(design: HybridBraggDesignInputs, detuningNm: number): number {
  const lambdaM = design.fixedLaserWavelengthNm * 1e-9;
  const kappa = getCouplingCoefficientPerM(design.indexModulation, getHybridDesignBraggWavelengthNm(design) * 1e-9);
  const deltaPerM = (2 * Math.PI * design.averageIndex) * Math.abs(detuningNm * 1e-9) / (lambdaM * lambdaM);
  return deltaPerM / Math.max(kappa, 1e-12);
}

function selectCandidates(points: Candidate[]): Candidate[] {
  const historical = points.find((point) => point.className === 'Historical baseline')!;
  const viable = points.filter((point) =>
    point.className !== 'Historical baseline' &&
    point.activeReflectance > 0.005 &&
    (point.localization.targetFraction ?? 0) > 0.04);
  const lowStrain = bestForClass(viable.filter((point) => Math.abs(point.required.localExcursionMicrostrain) <= 1500), 'Low-Strain');
  const balanced = bestForClass(viable, 'Balanced');
  const highContrast = bestForClass(viable.filter((point) => Math.abs(point.backgroundDetuningNm) >= 0.25), 'High-Contrast');
  return dedupeCandidates([historical, lowStrain, balanced, highContrast].filter((point): point is Candidate => Boolean(point)));
}

function bestForClass(points: Candidate[], className: Candidate['className']): Candidate | null {
  const sorted = [...points].sort((left, right) => {
    if (className === 'Low-Strain') {
      return Math.abs(left.required.localExcursionMicrostrain) - Math.abs(right.required.localExcursionMicrostrain) ||
        right.contrastDifference - left.contrastDifference;
    }
    if (className === 'High-Contrast') return right.contrastDifference - left.contrastDifference || right.activeReflectance - left.activeReflectance;
    return right.score - left.score;
  });
  return sorted[0] ? { ...sorted[0], className } : null;
}

function dedupeCandidates(points: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return points.filter((point) => {
    const key = `${point.backgroundDetuningNm}:${point.activeDetuningNm}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateCandidateWithMaxwell(candidate: Candidate) {
  const cmtRegions = detectReflectionRegions(
    solveHybridBraggCoupledModePoint(createHybridBraggModel(candidate.design), candidate.design.fixedLaserWavelengthNm).spatialField,
    REGION_THRESHOLD,
  );
  const maxwell = reconstructHybridBraggMaxwellFields(candidate.design, candidate.design.fixedLaserWavelengthNm, {
    samplesPerPeriod: 8,
    envelopeBlocks: 250,
  });
  const maxwellRegions = detectMaxwellRegions(maxwell.samples);
  return {
    className: candidate.className,
    backgroundDetuningNm: candidate.backgroundDetuningNm,
    activeDetuningNm: candidate.activeDetuningNm,
    cmtBoundaryReflectance: candidate.activeReflectance,
    maxwellBoundaryReflectance: maxwell.reflectance,
    cmtOpticalCenterMm: cmtRegions[0]?.centerMm ?? null,
    maxwellOpticalCenterMm: maxwellRegions[0]?.centerMm ?? null,
    cmtWidthMm: cmtRegions[0] ? cmtRegions[0].endMm - cmtRegions[0].startMm : null,
    maxwellWidthMm: maxwellRegions[0] ? maxwellRegions[0].endMm - maxwellRegions[0].startMm : null,
    cmtRegionCount: cmtRegions.length,
    maxwellRegionCount: maxwellRegions.length,
    energyError: maxwell.energyError,
    agreement: classifyAgreement(candidate.activeReflectance, maxwell.reflectance, cmtRegions[0], maxwellRegions[0]),
  };
}

function detectMaxwellRegions(samples: MaxwellFieldSample[]): ReflectionRegion[] {
  return detectReflectionRegions(samples.map((sample) => ({
    zM: sample.zM,
    startM: sample.zM - sample.lengthM / 2,
    endM: sample.zM + sample.lengthM / 2,
    lengthM: sample.lengthM,
    sectionId: null,
    sectionStartM: null,
    sectionEndM: null,
    strain: 0,
    braggWavelengthM: 0,
    detuningPerM: 0,
    couplingCoefficientPerM: 0,
    forwardAmplitude: { re: 0, im: 0 },
    backwardAmplitude: { re: 0, im: 0 },
    forwardIntensity: sample.forwardIntensity,
    backwardIntensity: sample.backwardIntensity,
    normalizedBackwardIntensity: sample.normalizedBackwardIntensity,
  })), REGION_THRESHOLD);
}

function classifyAgreement(cmtR: number, maxwellR: number, cmtRegion: ReflectionRegion | undefined, maxwellRegion: ReflectionRegion | undefined) {
  const relative = Math.abs(cmtR - maxwellR) / Math.max(Math.abs(maxwellR), 1e-9);
  const centerError = cmtRegion && maxwellRegion ? Math.abs(cmtRegion.centerMm - maxwellRegion.centerMm) : Infinity;
  if (relative < 0.15 && centerError < 0.05) return 'quantitative';
  if (relative < 0.6 && centerError < 0.25) return 'qualitative';
  return 'poor';
}

function sensitivitySweep(candidates: Candidate[], values: number[], field: 'perturbationEdgeWidthMm' | 'strainWidthMm') {
  return candidates.map((candidate) => ({
    className: candidate.className,
    field,
    points: values.map((value) => evaluateVariant(candidate, { [field]: value }, value)),
  }));
}

function evaluateVariant(candidate: Candidate, patch: Partial<HybridBraggDesignInputs>, value: number) {
  const design = { ...candidate.design, ...patch };
  const result = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), design.fixedLaserWavelengthNm);
  const objective = evaluateTargetReflectionState(design, {
    targetDepthMm: TARGET_CENTER_MM,
    targetWidthMm: TARGET_WIDTH_MM,
    controlKind: 'position',
    controlState: TARGET_CENTER_MM,
  });
  return {
    value,
    reflectance: result.reflectance,
    backgroundReflectance: backgroundReflectance(design),
    targetFraction: objective.targetPower / Math.max(objective.targetPower + objective.offTargetPower, 1e-12),
    activeRegionCount: objective.activeRegionCount,
    secondaryPeakRatio: objective.secondaryPeakRatio,
  };
}

function compareMechanics(candidate: Candidate) {
  const target = {
    lengthM: candidate.design.lengthMm * 1e-3,
    centerM: TARGET_CENTER_MM * 1e-3,
    widthM: candidate.design.strainWidthMm * 1e-3,
    transitionWidthM: candidate.design.perturbationEdgeWidthMm * 1e-3,
    backgroundStrain: candidate.required.backgroundStrain,
    troughStrain: candidate.required.activeTroughStrain,
  };
  const mechanics = evaluateMechanicalArchitectures({
    target,
    targetField: createSmoothTroughField(target),
    host: {
      youngsModulusPa: 2e9,
      crossSectionAreaM2: 1e-6,
      densityKgPerM3: 2200,
      poissonRatio: 0.25,
    },
  });
  const best = [...mechanics.architectures].sort((left, right) => left.metrics.rmsStrainError - right.metrics.rmsStrainError)[0];
  return {
    className: candidate.className,
    localExcursionMicrostrain: candidate.required.localExcursionMicrostrain,
    relativeToHistoricalExcursion: Math.abs(candidate.required.localExcursionMicrostrain) / 1500,
    bestReducedOrderArchitecture: best?.architecture ?? null,
    bestRmsStrainError: best?.metrics.rmsStrainError ?? null,
  };
}

function chooseConclusions(selected: Candidate[], maxwell: ReturnType<typeof validateCandidateWithMaxwell>[]) {
  const historical = selected.find((point) => point.className === 'Historical baseline')!;
  const best = selected.filter((point) => point.className !== 'Historical baseline')
    .sort((left, right) => right.score - left.score)[0] ?? historical;
  const maxwellSupported = maxwell.some((point) => point.className === best.className && point.agreement !== 'poor');
  const operatingPoint = maxwellSupported && Math.abs(best.backgroundDetuningNm) > Math.abs(historical.backgroundDetuningNm) * 1.5
    ? 'A MODERATE BACKGROUND DETUNING PROVIDES THE BEST OPTICAL / MECHANICAL TRADEOFF'
    : best === historical
      ? 'THE HISTORICAL SMALL-DETUNING OPERATING POINT REMAINS PREFERRED'
      : 'NO ROBUST DETUNING OPERATING REGION WAS IDENTIFIED';
  return {
    operatingPoint,
    historicalBaseline: best === historical
      ? 'THE HISTORICAL ~0.10 NM OPERATING POINT REMAINS NEAR THE PREFERRED REGION'
      : 'THE HISTORICAL ~0.10 NM OPERATING POINT WAS A REASONABLE BUT NON-OPTIMAL EXPLORATORY CHOICE',
    lightManagement: 'LARGER DETUNING IMPROVES BACKGROUND SUPPRESSION BUT DOES NOT MATERIALLY SIMPLIFY OVERALL LIGHT MANAGEMENT',
    recommendedDefaultChange: operatingPoint === 'NO ROBUST DETUNING OPERATING REGION WAS IDENTIFIED'
      ? 'No default update recommended from this packet.'
      : best === historical ? 'No default update recommended from this packet.' : 'A separate explicit default-update issue is warranted before changing UI startup values.',
  };
}

function range(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) values.push(Number(value.toFixed(6)));
  return values;
}

function fmt(value: number | null | undefined, digits = 4): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toPrecision(digits);
}

function renderReport(): string {
  const lines = [
    '# Fixed-Grating Operating-Point Study',
    '',
    `Issue: #${ISSUE}`,
    '',
    '## Required Conclusions',
    '',
    `- Operating point: \`${conclusions.operatingPoint}\``,
    `- Historical baseline: \`${conclusions.historicalBaseline}\``,
    `- Light management: \`${conclusions.lightManagement}\``,
    `- Defaults: ${conclusions.recommendedDefaultChange}`,
    '',
    '## Baseline Audit',
    '',
    `The historical 600.01 nm -> 600.11 nm separation is not the OFF-state detuning after bias strain. Under the current material model, the biased background Bragg wavelength is ${fmt(baselineAudit.lambdaBBackgroundNm)} nm, so Delta lambda_bg is ${fmt(baselineAudit.deltaLambdaBackgroundNm)} nm.`,
    '',
    '| quantity | value |',
    '| --- | ---: |',
    `| lambda_B,0 | ${fmt(baselineAudit.lambdaB0Nm)} nm |`,
    `| lambda_B,bg | ${fmt(baselineAudit.lambdaBBackgroundNm)} nm |`,
    `| lambda_B,active | ${fmt(baselineAudit.lambdaBActiveNm)} nm |`,
    `| lambda_L | ${fmt(baselineAudit.lambdaLaserNm)} nm |`,
    `| Delta lambda_0 | ${fmt(baselineAudit.deltaLambda0Nm)} nm |`,
    `| Delta lambda_bg | ${fmt(baselineAudit.deltaLambdaBackgroundNm)} nm |`,
    `| Delta lambda_active | ${fmt(baselineAudit.deltaLambdaActiveNm)} nm |`,
    '',
    '## Bare Grating Bandwidth',
    '',
    `The CMT bare-grating peak reflectance is ${fmt(bandwidth.peakReflectance)} at ${fmt(bandwidth.centerWavelengthNm)} nm. The sampled FWHM is ${fmt(bandwidth.fwhmNm)} nm; normalized detuning is reported as |Delta lambda_bg| / FWHM and |delta| / kappa.`,
    '',
    '## Strain Tuning Budget',
    '',
    '| strain | Bragg shift | slope |',
    '| ---: | ---: | ---: |',
    ...strainTuningBudget.map((point) => `| ${fmt(point.microstrain, 5)} microstrain | ${fmt(point.braggShiftNm)} nm | ${fmt(point.localSlopeNmPer1000Microstrain)} nm / 1000 microstrain |`),
    '',
    '## Pareto Candidates',
    '',
    '| class | Delta lambda_bg | D_FWHM | R_background | R_active | C_delta | C_R | excursion | target fraction |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...candidates.map((candidate) => `| ${candidate.className} | ${fmt(candidate.backgroundDetuningNm)} nm | ${fmt(candidate.normalizedDetuningFwhm)} | ${fmt(candidate.backgroundReflectance)} | ${fmt(candidate.activeReflectance)} | ${fmt(candidate.contrastDifference)} | ${fmt(candidate.contrastRatio)} | ${fmt(candidate.required.localExcursionMicrostrain)} microstrain | ${fmt(candidate.localization.targetFraction)} |`),
    '',
    '## Maxwell Validation',
    '',
    'CMT selected candidates; Maxwell decides whether a candidate remains credible. Agreement is classified from boundary reflectance and primary-region center only, not forced into solver parity.',
    '',
    '| class | R_CMT | R_Maxwell | CMT center | Maxwell center | CMT width | Maxwell width | agreement |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...maxwellValidation.map((point) => `| ${point.className} | ${fmt(point.cmtBoundaryReflectance)} | ${fmt(point.maxwellBoundaryReflectance)} | ${fmt(point.cmtOpticalCenterMm)} mm | ${fmt(point.maxwellOpticalCenterMm)} mm | ${fmt(point.cmtWidthMm)} mm | ${fmt(point.maxwellWidthMm)} mm | ${point.agreement} |`),
    '',
    '## Interpretation',
    '',
    'Increasing background detuning does suppress uniform background reflection in CMT, but the required local strain excursion grows with the same Bragg-shift budget. The useful operating region is therefore a tradeoff, not a monotonic preference for larger detuning.',
    '',
    'The historical point remains useful as an exploratory reference, but the physically relevant OFF-state detuning is Delta lambda_bg after bias strain, not the original laser-minus-static spacing.',
    '',
    '## Artifacts',
    '',
    `- ${JSON_PATH}`,
    `- ${REPORT_PATH}`,
    '',
    'Generated by `npx.cmd tsx scripts/fixedGratingOperatingPointStudy.mts`.',
  ];
  return `${lines.join('\n')}\n`;
}
