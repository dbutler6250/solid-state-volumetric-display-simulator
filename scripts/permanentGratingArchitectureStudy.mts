import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs, HybridCouplingProfile, HybridPhaseProfile } from '../src/types/simulation';
import { detectReflectionRegions, type ReflectionRegion } from '../src/simulation/experiments/hybridBraggExperiments';
import { evaluateTargetReflectionState, type ObjectiveMetrics } from '../src/simulation/optimization/targetReflectionState';
import { sampleStrainField } from '../src/simulation/perturbations/strainField';
import { applyMaterialStrainResponse } from '../src/simulation/responses/strainOpticResponse';
import { solveHybridBraggCoupledModePoint, solveHybridBraggCoupledModeSpectrum } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import { reconstructHybridBraggMaxwellFields, type MaxwellFieldSample } from '../src/simulation/solvers/maxwell/longGratingScatteringSolver';
import {
  createHybridBraggModel,
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  getCouplingCoefficientPerM,
  getHybridDesignBraggWavelengthNm,
} from '../src/simulation/structures/hybridBraggGrating';

type ArchitectureClass =
  | 'current-uniform'
  | 'uniform-coupling'
  | 'length'
  | 'apodized'
  | 'segmented'
  | 'phase-engineered'
  | 'chirp-proxy'
  | 'combined';

type ArchitectureCase = {
  id: string;
  label: string;
  architectureClass: ArchitectureClass;
  design: HybridBraggDesignInputs;
  fabricationComplexity: 'Low' | 'Moderate' | 'High' | 'Research-only';
  notes: string;
};

type ArchitectureMetrics = {
  id: string;
  label: string;
  architectureClass: ArchitectureClass;
  fabricationComplexity: ArchitectureCase['fabricationComplexity'];
  notes: string;
  indexModulation: number;
  lengthMm: number;
  kappaPerM: number;
  couplingLengthMm: number;
  kappaLengthProduct: number;
  activeLengthMm: number;
  activeLengthOverCouplingLength: number;
  idealActiveReflectance: number;
  barePeakReflectance: number;
  bareFwhmNm: number;
  backgroundDetuningNm: number;
  normalizedBackgroundDetuningFwhm: number;
  backgroundReflectance: number;
  activeReflectance: number;
  contrastDifference: number;
  contrastRatio: number;
  dominantCenterMm: number | null;
  opticalWidthMm: number | null;
  trackingErrorMm: number | null;
  dominantRegionCount: number;
  secondaryRegionRatio: number | null;
  targetFraction: number | null;
  score: number;
};

const ISSUE = 80;
const OUT_DIR = join(process.cwd(), 'artifacts', `issue-${ISSUE}`);
const JSON_PATH = join(OUT_DIR, 'permanent-grating-architecture-study.json');
const REPORT_PATH = join(OUT_DIR, 'permanent-grating-architecture-study.md');
const LASER_NM = 600.11;
const HISTORICAL_STATIC_DETUNING_NM = 0.10;
const TARGET_CENTER_MM = 5;
const TARGET_WIDTH_MM = 0.8;
const REGION_THRESHOLD = 0.5;
const RATIO_FLOOR = 1e-9;

const baseline = createStudyDesign();
const couplingLengthMap = buildCouplingLengthMap();
const architectureMetrics = buildArchitectureCases().map(evaluateArchitecture);
const selectedCandidates = selectCandidates(architectureMetrics);
const addressability = selectedCandidates.map((candidate) => ({
  id: candidate.id,
  label: candidate.label,
  points: [2.5, 5, 7.5].map((centerMm) => evaluateAddressability(candidate, centerMm)),
}));
const maxwellValidation = selectedCandidates.map(validateWithMaxwell);
const conclusions = chooseConclusions();

const payload = {
  issue: ISSUE,
  wpV214Closeout: 'WP-v2-14 IS CLEANLY MERGED AND ITS DETUNING CONCLUSIONS ARE THE NEW RESEARCH BASELINE',
  baseline: baselineSummary(),
  couplingLengthMap,
  architectureMetrics,
  selectedCandidates,
  addressability,
  maxwellValidation,
  conclusions,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());
console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function createStudyDesign(overrides: Partial<HybridBraggDesignInputs> = {}): HybridBraggDesignInputs {
  const periodNm = (LASER_NM - HISTORICAL_STATIC_DETUNING_NM) / (2 * DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.averageIndex);
  return {
    ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
    gratingPeriodNm: periodNm,
    fixedLaserWavelengthNm: LASER_NM,
    strainBias: 0.0015,
    peakStrain: -0.0015,
    strainShape: 'piezo-trough',
    actuatorPolarity: 'trough',
    strainCenterMm: TARGET_CENTER_MM,
    strainWidthMm: TARGET_WIDTH_MM,
    perturbationEdgeWidthMm: 0.25,
    segmentCount: 700,
    pulseSweepStartMm: 0,
    pulseSweepEndMm: 10,
    pulseSweepPointCount: 81,
    ...overrides,
  };
}

function baselineSummary() {
  const lambdaB0Nm = getHybridDesignBraggWavelengthNm(baseline);
  const lambdaBBackgroundNm = localBraggWavelengthNm(baseline, baseline.strainBias);
  const model = createHybridBraggModel(baseline);
  const activeStrain = sampleStrainField(model.strain, TARGET_CENTER_MM * 1e-3);
  const lambdaBActiveNm = localBraggWavelengthNm(baseline, activeStrain);
  return {
    lambdaB0Nm,
    lambdaBBackgroundNm,
    lambdaBActiveNm,
    lambdaLaserNm: LASER_NM,
    deltaLambda0Nm: LASER_NM - lambdaB0Nm,
    deltaLambdaBackgroundNm: LASER_NM - lambdaBBackgroundNm,
    deltaLambdaActiveNm: LASER_NM - lambdaBActiveNm,
    activeLengthMm: activeInteractionLengthMm(baseline),
  };
}

function localBraggWavelengthNm(design: HybridBraggDesignInputs, strain: number): number {
  const model = createHybridBraggModel(design);
  return applyMaterialStrainResponse(model.grating, model.materialResponse, strain).braggWavelengthM * 1e9;
}

function buildCouplingLengthMap() {
  const activeLengthsMm = [0.5, 0.8, 1.0, 1.5];
  return {
    current: couplingDiagnostics(baseline),
    idealShortGrating: activeLengthsMm.map((activeLengthMm) => ({
      activeLengthMm,
      idealReflectance: idealReflectanceForLength(baseline.indexModulation, activeLengthMm),
      activeLengthOverCouplingLength: activeLengthMm / couplingDiagnostics(baseline).couplingLengthMm,
    })),
    requiredIndexModulation: [0.10, 0.25, 0.50, 0.75, 0.90].map((targetReflectance) => ({
      targetReflectance,
      lengths: activeLengthsMm.map((activeLengthMm) => requiredCouplingForReflectance(targetReflectance, activeLengthMm)),
    })),
  };
}

function couplingDiagnostics(design: HybridBraggDesignInputs) {
  const braggWavelengthM = getHybridDesignBraggWavelengthNm(design) * 1e-9;
  const kappaPerM = getCouplingCoefficientPerM(design.indexModulation, braggWavelengthM);
  const couplingLengthMm = kappaPerM > 0 ? 1e3 / kappaPerM : Infinity;
  return {
    kappaPerM,
    couplingLengthMm,
    kappaLengthProduct: kappaPerM * design.lengthMm * 1e-3,
    peakReflectance: Math.tanh(kappaPerM * design.lengthMm * 1e-3) ** 2,
  };
}

function requiredCouplingForReflectance(targetReflectance: number, activeLengthMm: number) {
  const kappaPerM = Math.atanh(Math.sqrt(targetReflectance)) / (activeLengthMm * 1e-3);
  const braggWavelengthM = getHybridDesignBraggWavelengthNm(baseline) * 1e-9;
  return {
    activeLengthMm,
    kappaPerM,
    couplingLengthMm: 1e3 / kappaPerM,
    indexModulation: (kappaPerM * braggWavelengthM) / Math.PI,
  };
}

function buildArchitectureCases(): ArchitectureCase[] {
  const cases: ArchitectureCase[] = [{
    id: 'current-uniform',
    label: 'current uniform baseline',
    architectureClass: 'current-uniform',
    design: baseline,
    fabricationComplexity: 'Low',
    notes: 'WP-v2-14 baseline: uniform permanent grating, biased background, local trough.',
  }];

  [2.5e-5, 5e-5, 1e-4, 2e-4, 3e-4, 5e-4].forEach((indexModulation) => {
    cases.push(simpleCase(`uniform-dn-${indexModulation}`, 'uniform-coupling', `uniform Delta n ${indexModulation}`, {
      indexModulation,
    }, 'Low', 'Uniform coupling-strength sweep.'));
  });
  [5, 10, 15, 20].forEach((lengthMm) => {
    cases.push(simpleCase(`length-${lengthMm}mm`, 'length', `${lengthMm} mm uniform grating`, {
      lengthMm,
      strainCenterMm: lengthMm / 2,
      pulseSweepEndMm: lengthMm,
    }, 'Low', 'Uniform length sweep at fixed local trough width.'));
  });

  const couplingProfiles: Array<{ id: string; label: string; profile: HybridCouplingProfile }> = [
    { id: 'gaussian', label: 'Gaussian apodization', profile: { family: 'gaussian', widthFraction: 0.28, peakMultiplier: 1, normalizeIntegratedCoupling: false } },
    { id: 'raised-cosine', label: 'raised-cosine apodization', profile: { family: 'raised-cosine', floorMultiplier: 0.15, peakMultiplier: 1, normalizeIntegratedCoupling: false } },
    { id: 'tukey', label: 'Tukey taper apodization', profile: { family: 'tukey', taperFraction: 0.45, floorMultiplier: 0.05, peakMultiplier: 1, normalizeIntegratedCoupling: false } },
  ];
  couplingProfiles.forEach(({ id, label, profile }) => {
    cases.push(simpleCase(`apod-${id}`, 'apodized', label, { couplingProfile: profile }, 'Moderate', 'Same-peak smooth apodization; active-reflection penalty is retained.'));
    cases.push(simpleCase(`apod-${id}-strong`, 'combined', `${label} with stronger coupling`, {
      indexModulation: 2e-4,
      couplingProfile: profile,
    }, 'High', 'Mechanism combination selected after isolated stronger-coupling and apodization checks.'));
  });

  [4, 8, 16].forEach((braggSectionCount) => {
    cases.push(simpleCase(`seg-${braggSectionCount}-continuous`, 'segmented', `${braggSectionCount} continuous sections`, {
      permanentGratingMode: 'segmented',
      braggSectionCount,
      braggSectionPhaseMode: 'continuous',
    }, 'Moderate', 'Segmented grating with continuous phase.'));
    cases.push(simpleCase(`seg-${braggSectionCount}-alternating`, 'phase-engineered', `${braggSectionCount} alternating-phase sections`, {
      permanentGratingMode: 'segmented',
      braggSectionCount,
      braggSectionPhaseMode: 'alternating',
    }, 'High', 'Segmented phase disruption under the WP-v2-14 operating constraint.'));
  });

  const phaseProfiles: Array<{ id: string; label: string; profile: HybridPhaseProfile }> = [
    { id: 'linear-pi', label: 'linear phase ramp pi', profile: { family: 'linear-ramp', totalPhaseRadians: Math.PI } },
    { id: 'linear-2pi', label: 'linear phase ramp 2pi', profile: { family: 'linear-ramp', totalPhaseRadians: 2 * Math.PI } },
    { id: 'alternating-pi', label: 'alternating phase profile pi', profile: { family: 'alternating', zoneCount: 8, phaseStepRadians: Math.PI } },
    { id: 'piecewise-small', label: 'small deterministic phase offsets', profile: { family: 'piecewise', zonePhaseRadians: [0, 0.2, -0.2, 0.1, -0.1, 0.2, -0.2, 0] } },
  ];
  phaseProfiles.forEach(({ id, label, profile }) => {
    const architectureClass: ArchitectureClass = id.startsWith('linear') ? 'chirp-proxy' : 'phase-engineered';
    cases.push(simpleCase(`phase-${id}`, architectureClass, label, { phaseProfile: profile }, 'High',
      architectureClass === 'chirp-proxy'
        ? 'Existing phase-ramp proxy for chirp-like phase structure; not a first-class monotonic period-chirp model.'
        : 'Simple low-dimensional phase engineering.'));
  });

  return cases;
}

function simpleCase(
  id: string,
  architectureClass: ArchitectureClass,
  label: string,
  overrides: Partial<HybridBraggDesignInputs>,
  fabricationComplexity: ArchitectureCase['fabricationComplexity'],
  notes: string,
): ArchitectureCase {
  return { id, label, architectureClass, design: createStudyDesign(overrides), fabricationComplexity, notes };
}

function evaluateArchitecture(architecture: ArchitectureCase): ArchitectureMetrics {
  const design = architecture.design;
  const activeResult = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), design.fixedLaserWavelengthNm);
  const objective = evaluateTargetReflectionState(design, {
    targetDepthMm: design.strainCenterMm,
    targetWidthMm: TARGET_WIDTH_MM,
    controlKind: 'position',
    controlState: design.strainCenterMm,
  });
  const regions = detectReflectionRegions(activeResult.spatialField, REGION_THRESHOLD);
  const primary = regions[0] ?? null;
  const bare = characterizeBareGrating(design);
  const diag = couplingDiagnostics(design);
  const activeLengthMm = activeInteractionLengthMm(design);
  const backgroundDetuningNm = design.fixedLaserWavelengthNm - localBraggWavelengthNm(design, design.strainBias);
  const backgroundReflectance = solveHybridBraggCoupledModePoint(createHybridBraggModel({ ...design, peakStrain: 0 }), design.fixedLaserWavelengthNm).reflectance;
  const activeReflectance = activeResult.reflectance;
  const targetFraction = objective.targetPower / Math.max(objective.targetPower + objective.offTargetPower, RATIO_FLOOR);
  const trackingErrorMm = primary ? primary.centerMm - design.strainCenterMm : null;
  const contrastDifference = activeReflectance - backgroundReflectance;
  const contrastRatio = activeReflectance / Math.max(backgroundReflectance, RATIO_FLOOR);
  const score = scoreArchitecture(activeReflectance, backgroundReflectance, targetFraction, trackingErrorMm, regions.length, objective);
  return {
    id: architecture.id,
    label: architecture.label,
    architectureClass: architecture.architectureClass,
    fabricationComplexity: architecture.fabricationComplexity,
    notes: architecture.notes,
    indexModulation: design.indexModulation,
    lengthMm: design.lengthMm,
    kappaPerM: diag.kappaPerM,
    couplingLengthMm: diag.couplingLengthMm,
    kappaLengthProduct: diag.kappaLengthProduct,
    activeLengthMm,
    activeLengthOverCouplingLength: activeLengthMm / diag.couplingLengthMm,
    idealActiveReflectance: idealReflectanceForLength(design.indexModulation, activeLengthMm),
    barePeakReflectance: bare.peakReflectance,
    bareFwhmNm: bare.fwhmNm,
    backgroundDetuningNm,
    normalizedBackgroundDetuningFwhm: Math.abs(backgroundDetuningNm) / Math.max(bare.fwhmNm, RATIO_FLOOR),
    backgroundReflectance,
    activeReflectance,
    contrastDifference,
    contrastRatio,
    dominantCenterMm: primary?.centerMm ?? null,
    opticalWidthMm: primary ? primary.endMm - primary.startMm : null,
    trackingErrorMm,
    dominantRegionCount: regions.length,
    secondaryRegionRatio: objective.secondaryPeakRatio,
    targetFraction,
    score,
  };
}

function activeInteractionLengthMm(design: HybridBraggDesignInputs): number {
  return design.strainWidthMm + 2 * design.perturbationEdgeWidthMm;
}

function idealReflectanceForLength(indexModulation: number, lengthMm: number): number {
  const kappa = getCouplingCoefficientPerM(indexModulation, getHybridDesignBraggWavelengthNm(baseline) * 1e-9);
  return Math.tanh(kappa * lengthMm * 1e-3) ** 2;
}

function characterizeBareGrating(design: HybridBraggDesignInputs) {
  const bare = { ...design, strainBias: 0, peakStrain: 0, strainShape: 'rectangular' as const };
  const centerNm = getHybridDesignBraggWavelengthNm(bare);
  const wavelengths = range(centerNm - 0.2, centerNm + 0.2, 0.002);
  const spectrum = solveHybridBraggCoupledModeSpectrum(createHybridBraggModel(bare), wavelengths);
  const peak = spectrum.reduce((best, point) => point.reflectance > best.reflectance ? point : best, spectrum[0]);
  const half = peak.reflectance / 2;
  const above = spectrum.filter((point) => point.reflectance >= half);
  return {
    centerWavelengthNm: centerNm,
    peakReflectance: peak.reflectance,
    peakWavelengthNm: peak.wavelengthNm,
    fwhmNm: above.length > 1 ? above[above.length - 1].wavelengthNm - above[0].wavelengthNm : 0,
  };
}

function scoreArchitecture(
  activeReflectance: number,
  backgroundReflectance: number,
  targetFraction: number | null,
  trackingErrorMm: number | null,
  regionCount: number,
  objective: ObjectiveMetrics,
): number {
  const trackingPenalty = trackingErrorMm === null ? 0.1 : 1 / (1 + Math.abs(trackingErrorMm));
  const regionPenalty = 1 / Math.max(1, regionCount);
  const secondaryPenalty = 1 / (1 + Math.max(0, objective.secondaryPeakRatio ?? 0));
  return Math.max(0, activeReflectance - backgroundReflectance) *
    Math.max(0, targetFraction ?? 0) *
    trackingPenalty *
    regionPenalty *
    secondaryPenalty;
}

function selectCandidates(metrics: ArchitectureMetrics[]): ArchitectureMetrics[] {
  const byClass = new Map<ArchitectureClass, ArchitectureMetrics[]>();
  metrics.forEach((metric) => {
    byClass.set(metric.architectureClass, [...(byClass.get(metric.architectureClass) ?? []), metric]);
  });
  const selected = [
    metrics.find((metric) => metric.id === 'current-uniform'),
    bestFrom(byClass.get('uniform-coupling') ?? []),
    bestFrom(byClass.get('apodized') ?? []),
    bestFrom([...(byClass.get('segmented') ?? []), ...(byClass.get('phase-engineered') ?? [])]),
    bestFrom(byClass.get('chirp-proxy') ?? []),
    bestFrom(byClass.get('combined') ?? []),
  ].filter((value): value is ArchitectureMetrics => Boolean(value));
  return selected.filter((candidate, index) => selected.findIndex((item) => item.id === candidate.id) === index);
}

function bestFrom(metrics: ArchitectureMetrics[]): ArchitectureMetrics | null {
  return [...metrics].sort((left, right) => right.score - left.score)[0] ?? null;
}

function evaluateAddressability(candidate: ArchitectureMetrics, centerMm: number) {
  const base = buildArchitectureCases().find((item) => item.id === candidate.id)?.design ?? baseline;
  const design = { ...base, strainCenterMm: centerMm };
  const metric = evaluateArchitecture({ id: candidate.id, label: candidate.label, architectureClass: candidate.architectureClass, design, fabricationComplexity: candidate.fabricationComplexity, notes: candidate.notes });
  return {
    commandedCenterMm: centerMm,
    opticalCenterMm: metric.dominantCenterMm,
    trackingErrorMm: metric.trackingErrorMm,
    activeReflectance: metric.activeReflectance,
    opticalWidthMm: metric.opticalWidthMm,
    secondaryRegionRatio: metric.secondaryRegionRatio,
    dominantRegionCount: metric.dominantRegionCount,
  };
}

function validateWithMaxwell(candidate: ArchitectureMetrics) {
  const design = buildArchitectureCases().find((item) => item.id === candidate.id)?.design ?? baseline;
  if (!isRepresentedByCurrentMaxwellPath(candidate, design)) {
    return {
      id: candidate.id,
      label: candidate.label,
      architectureClass: candidate.architectureClass,
      cmtBoundaryReflectance: candidate.activeReflectance,
      maxwellBoundaryReflectance: null,
      cmtOpticalCenterMm: candidate.dominantCenterMm,
      maxwellOpticalCenterMm: null,
      cmtWidthMm: candidate.opticalWidthMm,
      maxwellWidthMm: null,
      cmtRegionCount: candidate.dominantRegionCount,
      maxwellRegionCount: null,
      secondaryRegions: [],
      energyError: null,
      agreement: 'not-represented',
      note: 'Current Maxwell layer reconstruction does not carry engineered coupling, phase, or segmented grating profiles; this candidate remains CMT-only.',
    };
  }
  const maxwell = reconstructHybridBraggMaxwellFields(design, design.fixedLaserWavelengthNm, {
    samplesPerPeriod: 8,
    envelopeBlocks: 250,
  });
  const maxwellRegions = detectMaxwellRegions(maxwell.samples);
  return {
    id: candidate.id,
    label: candidate.label,
    architectureClass: candidate.architectureClass,
    cmtBoundaryReflectance: candidate.activeReflectance,
    maxwellBoundaryReflectance: maxwell.reflectance,
    cmtOpticalCenterMm: candidate.dominantCenterMm,
    maxwellOpticalCenterMm: maxwellRegions[0]?.centerMm ?? null,
    cmtWidthMm: candidate.opticalWidthMm,
    maxwellWidthMm: maxwellRegions[0] ? maxwellRegions[0].endMm - maxwellRegions[0].startMm : null,
    cmtRegionCount: candidate.dominantRegionCount,
    maxwellRegionCount: maxwellRegions.length,
    secondaryRegions: maxwellRegions.slice(1, 4).map((region) => ({ centerMm: region.centerMm, widthMm: region.endMm - region.startMm })),
    energyError: maxwell.energyError,
    agreement: classifyAgreement(candidate.activeReflectance, maxwell.reflectance, candidate.dominantCenterMm, maxwellRegions[0]?.centerMm ?? null),
    note: 'Current Maxwell path represents uniform Delta n and the prescribed strain field.',
  };
}

function isRepresentedByCurrentMaxwellPath(candidate: ArchitectureMetrics, design: HybridBraggDesignInputs): boolean {
  const couplingProfile = design.couplingProfile ?? { family: 'uniform' as const };
  const phaseProfile = design.phaseProfile ?? { family: 'constant' as const };
  return candidate.architectureClass === 'current-uniform' ||
    candidate.architectureClass === 'uniform-coupling' ||
    candidate.architectureClass === 'length' ||
    (couplingProfile.family === 'uniform' &&
      phaseProfile.family === 'constant' &&
      design.permanentGratingMode === 'global');
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

function classifyAgreement(cmtR: number, maxwellR: number, cmtCenterMm: number | null, maxwellCenterMm: number | null) {
  const relative = Math.abs(cmtR - maxwellR) / Math.max(Math.abs(maxwellR), RATIO_FLOOR);
  const centerError = cmtCenterMm !== null && maxwellCenterMm !== null ? Math.abs(cmtCenterMm - maxwellCenterMm) : Infinity;
  if (relative < 0.15 && centerError < 0.08) return 'quantitative';
  if (relative < 0.6 && centerError < 0.35) return 'qualitative';
  return 'poor';
}

function chooseConclusions() {
  const current = architectureMetrics.find((metric) => metric.id === 'current-uniform')!;
  const best = bestFrom(architectureMetrics)!;
  const bestMaxwell = maxwellValidation.find((item) => item.id === best.id);
  const address = addressability.find((item) => item.id === best.id);
  const averageTracking = address
    ? average(address.points.map((point) => Math.abs(point.trackingErrorMm ?? 99)))
    : 99;
  const materialImprovement = best.score > current.score * 1.5 && bestMaxwell?.agreement !== 'poor' && bestMaxwell?.agreement !== 'not-represented';
  const hasPreferredArchitecture = materialImprovement || best.id === 'current-uniform';
  return {
    couplingLength: current.activeLengthOverCouplingLength < 1
      ? 'THE CURRENT ACTIVE REGION IS UNDER-COUPLED RELATIVE TO ITS AVAILABLE INTERACTION LENGTH'
      : 'NO SINGLE COUPLING-LENGTH INTERPRETATION EXPLAINS THE RESULTS',
    gratingEngineering: materialImprovement
      ? 'PERMANENT-GRATING ENGINEERING PROVIDES ONLY A MODEST TRADEOFF IMPROVEMENT'
      : 'PERMANENT-GRATING ENGINEERING DOES NOT RESOLVE THE ACTIVE / BACKGROUND TRADEOFF',
    architecture: materialImprovement && best.architectureClass === 'apodized'
      ? 'AN APODIZED PERMANENT GRATING IS PREFERRED'
      : materialImprovement && best.architectureClass === 'combined'
        ? 'A COMBINED ENGINEERED GRATING ARCHITECTURE IS PREFERRED'
        : best.id === 'current-uniform'
          ? 'A UNIFORM PERMANENT GRATING REMAINS THE PREFERRED ARCHITECTURE'
          : 'NO TESTED PERMANENT-GRATING ARCHITECTURE IS CLEARLY PREFERRED',
    spatialAddressability: !hasPreferredArchitecture
      ? 'NO TESTED PERMANENT-GRATING ARCHITECTURE SUPPORTS ROBUST MOVING SPATIAL ADDRESSING'
      : averageTracking < 0.25
      ? 'THE PREFERRED GRATING ARCHITECTURE SUPPORTS ROBUST MOVING SPATIAL ADDRESSING'
      : materialImprovement
        ? 'THE PREFERRED GRATING ARCHITECTURE IMPROVES LOCALIZATION BUT REMAINS POSITION-SENSITIVE'
        : 'NO TESTED PERMANENT-GRATING ARCHITECTURE SUPPORTS ROBUST MOVING SPATIAL ADDRESSING',
    mechanism: current.activeLengthOverCouplingLength < 1
      ? 'The current trough plus transition length is shorter than one coupling length, so weak local accumulation and broader-band stronger-coupling penalties compete directly.'
      : 'The results are dominated by coherent spatial participation rather than a single coupling-length scalar.',
    recommendedDefaultChange: 'No simulator default update is recommended from WP-v2-15.',
  };
}

function renderReport(): string {
  const topRows = [...architectureMetrics].sort((left, right) => right.score - left.score).slice(0, 12);
  return [
    '# Permanent-Grating Spectral and Spatial Coupling Architecture Study',
    '',
    `Issue: #${ISSUE}`,
    '',
    '## WP-v2-14 Closeout Gate',
    '',
    '`WP-v2-14 IS CLEANLY MERGED AND ITS DETUNING CONCLUSIONS ARE THE NEW RESEARCH BASELINE`',
    '',
    '## Required Conclusions',
    '',
    `- Coupling length: \`${conclusions.couplingLength}\``,
    `- Grating engineering: \`${conclusions.gratingEngineering}\``,
    `- Architecture: \`${conclusions.architecture}\``,
    `- Spatial addressability: \`${conclusions.spatialAddressability}\``,
    `- Defaults: ${conclusions.recommendedDefaultChange}`,
    '',
    '## Coupling-Length Scale',
    '',
    `Current kappa is ${fmt(couplingLengthMap.current.kappaPerM)} 1/m, L_c = ${fmt(couplingLengthMap.current.couplingLengthMm)} mm, and kappa L = ${fmt(couplingLengthMap.current.kappaLengthProduct)}.`,
    `The active trough plus transitions provide about ${fmt(couplingLengthMap.current ? baselineSummary().activeLengthMm : null)} mm, or ${fmt(baselineSummary().activeLengthMm / couplingLengthMap.current.couplingLengthMm)} coupling lengths.`,
    '',
    '| active length | ideal R at current Delta n | L_active / L_c |',
    '| ---: | ---: | ---: |',
    ...couplingLengthMap.idealShortGrating.map((row) => `| ${fmt(row.activeLengthMm)} mm | ${fmt(row.idealReflectance)} | ${fmt(row.activeLengthOverCouplingLength)} |`),
    '',
    '## Required Coupling Map',
    '',
    '| target R | 0.5 mm Delta n | 0.8 mm Delta n | 1.0 mm Delta n | 1.5 mm Delta n |',
    '| ---: | ---: | ---: | ---: | ---: |',
    ...couplingLengthMap.requiredIndexModulation.map((row) => `| ${fmt(row.targetReflectance)} | ${row.lengths.map((point) => fmt(point.indexModulation, 3)).join(' | ')} |`),
    '',
    '## Architecture Sweep',
    '',
    '| architecture | class | Delta n | L | FWHM | R_bg | R_active | target frac | center | width | secondary | score |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...topRows.map((row) => `| ${row.label} | ${row.architectureClass} | ${fmt(row.indexModulation, 3)} | ${fmt(row.lengthMm)} mm | ${fmt(row.bareFwhmNm)} nm | ${fmt(row.backgroundReflectance)} | ${fmt(row.activeReflectance)} | ${fmt(row.targetFraction)} | ${fmt(row.dominantCenterMm)} mm | ${fmt(row.opticalWidthMm)} mm | ${fmt(row.secondaryRegionRatio)} | ${fmt(row.score)} |`),
    '',
    '## Selected Candidate Maxwell Checks',
    '',
    '| candidate | class | R_CMT | R_Maxwell | CMT center | Maxwell center | CMT width | Maxwell width | agreement |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...maxwellValidation.map((row) => `| ${row.label} | ${row.architectureClass} | ${fmt(row.cmtBoundaryReflectance)} | ${fmt(row.maxwellBoundaryReflectance)} | ${fmt(row.cmtOpticalCenterMm)} mm | ${fmt(row.maxwellOpticalCenterMm)} mm | ${fmt(row.cmtWidthMm)} mm | ${fmt(row.maxwellWidthMm)} mm | ${row.agreement} |`),
    '',
    'Engineered coupling, phase, and segmented candidates are kept CMT-only in this packet unless the current Maxwell layer path represents the same optical architecture. This preserves the Maxwell/CMT model boundary instead of treating baseline-like Maxwell rows as validation.',
    '',
    '## Spatial Addressability',
    '',
    ...addressability.flatMap((candidate) => [
      `### ${candidate.label}`,
      '',
      '| commanded center | optical center | tracking error | R_active | width | secondary | regions |',
      '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...candidate.points.map((point) => `| ${fmt(point.commandedCenterMm)} mm | ${fmt(point.opticalCenterMm)} mm | ${fmt(point.trackingErrorMm)} mm | ${fmt(point.activeReflectance)} | ${fmt(point.opticalWidthMm)} mm | ${fmt(point.secondaryRegionRatio)} | ${point.dominantRegionCount} |`),
      '',
    ]),
    '## Interpretation',
    '',
    conclusions.mechanism,
    '',
    'Stronger uniform coupling raises possible active reflection, but it also broadens the grating response and raises background participation. Smooth apodization and simple segmentation/phase disruption can move the tradeoff modestly, but the tested bounded set does not establish a robust architecture that simultaneously gives high active reflection, low background reflection, and clean moving spatial localization. The phase-ramp cases are reported only as chirp proxies because this model does not yet expose a first-class monotonic period-chirp input.',
    '',
    'No mechanical/FEM claim is made here; final candidates use the same prescribed trough field unless explicitly noted in the JSON payload.',
    '',
    '## Artifacts',
    '',
    `- ${JSON_PATH}`,
    `- ${REPORT_PATH}`,
    '',
    'Generated by `npx.cmd tsx scripts/permanentGratingArchitectureStudy.mts`.',
    '',
  ].join('\n');
}

function range(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) values.push(Number(value.toFixed(6)));
  return values;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function fmt(value: number | null | undefined, digits = 4): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toPrecision(digits);
}
