import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import { detectReflectionRegions, type ReflectionRegion } from '../src/simulation/experiments/hybridBraggExperiments';
import { sampleStrainField } from '../src/simulation/perturbations/strainField';
import { applyMaterialStrainResponse } from '../src/simulation/responses/strainOpticResponse';
import { solveHybridBraggCoupledModePoint } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import {
  reconstructHybridBraggMaxwellFields,
  type HybridMaxwellOptions,
  type MaxwellFieldSample,
} from '../src/simulation/solvers/maxwell/longGratingScatteringSolver';
import { createHybridBraggModel, getCouplingCoefficientPerM } from '../src/simulation/structures/hybridBraggGrating';
import {
  calculateUsefulRange,
  classifyUsefulTroughState,
  extractStrainTroughRequirement,
  type RobustnessMetricSample,
  type UsefulRange,
  type UsefulStateThresholds,
} from '../src/simulation/validation/strainTroughRequirement';

type PreviousStudyPayload = {
  bestTrough: {
    design: HybridBraggDesignInputs;
    targetWidthMm: number;
  };
};

type RegionMetrics = {
  reflectance: number;
  transmission: number | null;
  energyError: number | null;
  centerMm: number | null;
  centerErrorMm: number | null;
  widthMm: number | null;
  targetFraction: number | null;
  offTargetFraction: number | null;
  strongestCompetitor: number;
  regionCount: number;
};

type RobustnessPoint = {
  label: string;
  value: number;
  design: HybridBraggDesignInputs;
  targetMm: number;
  cmt: RegionMetrics;
  maxwell: RegionMetrics;
  useful: boolean;
  runtimeMs: number;
};

const ISSUE = 70;
const OUT_DIR = join(process.cwd(), 'artifacts', `issue-${ISSUE}`);
const PREVIOUS_JSON_PATH = join(process.cwd(), 'artifacts', 'issue-66', 'piezo-strain-window-study.json');
const JSON_PATH = join(OUT_DIR, 'maxwell-trough-robustness-study.json');
const REPORT_PATH = join(OUT_DIR, 'maxwell-trough-robustness-study.md');
const MAXWELL_OPTIONS: HybridMaxwellOptions = { samplesPerPeriod: 8, envelopeBlocks: 300 };
const REGION_THRESHOLD = 0.5;
const EPSILON = 1e-12;

const previous = JSON.parse(await readFile(PREVIOUS_JSON_PATH, 'utf8')) as PreviousStudyPayload;
const nominalDesign = previous.bestTrough.design;
const targetWidthMm = previous.bestTrough.targetWidthMm;
const couplingLengthMm = couplingLength(nominalDesign);
const nominal = freezeNominal(nominalDesign);
const thresholds: UsefulStateThresholds = {
  minimumReflectance: 0.012,
  maximumCenterErrorMm: 0.35,
  maximumRegionWidthMm: 1.1,
  maximumOffTargetFraction: 0.78,
  minimumTargetFraction: 0.22,
  maximumRegionCount: 3,
};

const cmtExploration = {
  biasStrain: denseCmtSweep('biasStrain', [-0.0008, -0.0004, 0, 0.0004, 0.0008].map((delta) => nominalDesign.strainBias + delta)),
  troughDepth: denseCmtSweep('troughDepth', [0.65, 0.8, 1, 1.2, 1.4].map((scale) => nominalDesign.peakStrain * scale)),
  widthMm: denseCmtSweep('widthMm', [0.35, 0.5, 0.8, 1, 1.2].map((scale) => nominalDesign.strainWidthMm * scale)),
  transitionWidthMm: denseCmtSweep('transitionWidthMm', [0, 0.1, 0.2, 0.3125, 0.4].map((scale) => nominalDesign.strainWidthMm * scale)),
  laserWavelengthNm: denseCmtSweep('laserWavelengthNm', [-0.08, -0.04, 0, 0.04, 0.08].map((delta) => nominalDesign.fixedLaserWavelengthNm + delta)),
};

const biasSweep = runSweep('bias strain', cmtExploration.biasStrain.map((item) => item.value), (value) => ({
  ...nominalDesign,
  strainBias: value,
}));
const troughDepthSweep = runSweep('trough depth', cmtExploration.troughDepth.map((item) => item.value), (value) => ({
  ...nominalDesign,
  peakStrain: value,
}));
const widthSweep = runSweep('trough width', cmtExploration.widthMm.map((item) => item.value), (value) => ({
  ...nominalDesign,
  strainWidthMm: value,
}));
const transitionSweep = runSweep('transition width', cmtExploration.transitionWidthMm.map((item) => item.value), (value) => ({
  ...nominalDesign,
  perturbationEdgeWidthMm: value,
}));
const positionOffsetsMm = [-0.3, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.3];
const positionSweep = positionOffsetsMm.map((offsetMm) =>
  analyzePoint('position offset', offsetMm, {
    ...nominalDesign,
    strainCenterMm: nominalDesign.strainCenterMm + offsetMm,
  }, nominalDesign.strainCenterMm));
const laserSweep = runSweep('laser wavelength', cmtExploration.laserWavelengthNm.map((item) => item.value), (value) => ({
  ...nominalDesign,
  fixedLaserWavelengthNm: value,
}));
const biasLaserCompensation = [
  [nominalDesign.strainBias - 0.0004, nominalDesign.fixedLaserWavelengthNm - 0.04],
  [nominalDesign.strainBias - 0.0004, nominalDesign.fixedLaserWavelengthNm],
  [nominalDesign.strainBias + 0.0004, nominalDesign.fixedLaserWavelengthNm],
  [nominalDesign.strainBias + 0.0004, nominalDesign.fixedLaserWavelengthNm + 0.04],
].map(([strainBias, fixedLaserWavelengthNm]) =>
  analyzePoint('bias + laser', strainBias, { ...nominalDesign, strainBias, fixedLaserWavelengthNm }));
const depthLaserCompensation = [
  [nominalDesign.peakStrain * 0.8, nominalDesign.fixedLaserWavelengthNm - 0.04],
  [nominalDesign.peakStrain * 0.8, nominalDesign.fixedLaserWavelengthNm],
  [nominalDesign.peakStrain * 1.2, nominalDesign.fixedLaserWavelengthNm],
  [nominalDesign.peakStrain * 1.2, nominalDesign.fixedLaserWavelengthNm + 0.04],
].map(([peakStrain, fixedLaserWavelengthNm]) =>
  analyzePoint('depth + laser', peakStrain, { ...nominalDesign, peakStrain, fixedLaserWavelengthNm }));
const widthTransitionCoupling = [
  [0.8, 0.1],
  [1.0, 0.1],
  [1.2, 0.1],
  [1.2, 0.2],
].map(([widthScale, edgeScale]) =>
  analyzePoint('width + transition', widthScale, {
    ...nominalDesign,
    strainWidthMm: nominalDesign.strainWidthMm * widthScale,
    perturbationEdgeWidthMm: nominalDesign.strainWidthMm * edgeScale,
  }));
const depthDependence = [0.2, 0.4, 0.5, 0.6, 0.8].map((fraction) => {
  const centerMm = nominalDesign.lengthMm * fraction;
  return analyzePoint('depth dependence', centerMm, { ...nominalDesign, strainCenterMm: centerMm }, centerMm);
});

const ranges = {
  backgroundStrain: calculateUsefulRange(toRangeSamples(biasSweep), nominalDesign.strainBias),
  troughDepth: calculateUsefulRange(toRangeSamples(troughDepthSweep), nominalDesign.peakStrain),
  troughWidth: calculateUsefulRange(toRangeSamples(widthSweep), nominalDesign.strainWidthMm),
  transitionWidth: calculateUsefulRange(toRangeSamples(transitionSweep), nominalDesign.perturbationEdgeWidthMm),
  laserWavelength: calculateUsefulRange(toRangeSamples(laserSweep), nominalDesign.fixedLaserWavelengthNm),
  positionOffset: calculateUsefulRange(toRangeSamples(positionSweep), 0),
};
const troughStrainRange = offsetRange(ranges.backgroundStrain, ranges.troughDepth, nominal.troughCenterStrain);
const requirement = extractStrainTroughRequirement({
  backgroundStrain: ranges.backgroundStrain,
  troughStrain: troughStrainRange,
  strainExcursion: ranges.troughDepth,
  widthMm: ranges.troughWidth,
  transitionWidthMm: ranges.transitionWidth,
  positionToleranceMm: symmetricTolerance(ranges.positionOffset),
  usableDepthStartMm: usableDepth(depthDependence).startMm,
  usableDepthEndMm: usableDepth(depthDependence).endMm,
  laserWavelengthNm: ranges.laserWavelength,
});
const sensitivityRanking = rankSensitivity([
  ['bias strain', ranges.backgroundStrain, nominalDesign.strainBias],
  ['trough depth', ranges.troughDepth, nominalDesign.peakStrain],
  ['trough width', ranges.troughWidth, nominalDesign.strainWidthMm],
  ['transition width', ranges.transitionWidth, Math.max(nominalDesign.perturbationEdgeWidthMm, 1e-6)],
  ['laser wavelength', ranges.laserWavelength, nominalDesign.fixedLaserWavelengthNm],
  ['trough position', ranges.positionOffset, 0.3],
]);
const robustnessClassification = classifyRobustness();
const classifications = {
  robustness: robustnessClassification,
  laserCompensation: classifyLaserCompensation(),
  cmtVsMaxwell: classifyCmtVsMaxwell(),
  mechanicalGate: classifyMechanicalGate(robustnessClassification),
  usableDepth: classifyUsableDepth(),
  opticalPreference: 'continuous moving trough',
};

const payload = {
  issue: ISSUE,
  provenance: {
    nominalSource: 'artifacts/issue-66/piezo-strain-window-study.json bestTrough.design',
    solverHierarchy: 'CMT exploratory sweeps followed by selected Maxwell field-reconstruction validation points',
  },
  nominal,
  thresholds,
  maxwellOptions: MAXWELL_OPTIONS,
  cmtExploration,
  sweeps: {
    biasSweep,
    troughDepthSweep,
    widthSweep,
    transitionSweep,
    positionSweep,
    laserSweep,
    biasLaserCompensation,
    depthLaserCompensation,
    widthTransitionCoupling,
    depthDependence,
  },
  ranges,
  sensitivityRanking,
  mechanicalTargetTable: mechanicalTargetTable(),
  braggShiftRequirements: braggShiftRequirements(),
  requirement,
  classifications,
  performance: performanceSummary(),
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function runSweep(label: string, values: number[], designFor: (value: number) => HybridBraggDesignInputs): RobustnessPoint[] {
  return values.map((value) => analyzePoint(label, value, designFor(value)));
}

function analyzePoint(
  label: string,
  value: number,
  design: HybridBraggDesignInputs,
  targetMm = design.strainCenterMm,
): RobustnessPoint {
  const start = performance.now();
  const cmt = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), design.fixedLaserWavelengthNm);
  const cmtMetrics = metricsFromSpatialSamples(cmt.reflectance, null, null, cmt.spatialField, targetMm, targetWidthMm);
  const maxwell = reconstructHybridBraggMaxwellFields(design, design.fixedLaserWavelengthNm, MAXWELL_OPTIONS);
  const maxwellMetrics = metricsFromMaxwellSamples(maxwell.samples, maxwell.reflectance, maxwell.transmission, maxwell.energyError, targetMm, targetWidthMm);
  const useful = isUseful(maxwellMetrics);
  return {
    label,
    value,
    design,
    targetMm,
    cmt: cmtMetrics,
    maxwell: maxwellMetrics,
    useful,
    runtimeMs: performance.now() - start,
  };
}

function denseCmtSweep(kind: string, values: number[]) {
  return values.map((value) => {
    const design = kind === 'biasStrain'
      ? { ...nominalDesign, strainBias: value }
      : kind === 'troughDepth'
        ? { ...nominalDesign, peakStrain: value }
        : kind === 'widthMm'
          ? { ...nominalDesign, strainWidthMm: value }
          : kind === 'transitionWidthMm'
            ? { ...nominalDesign, perturbationEdgeWidthMm: value }
            : { ...nominalDesign, fixedLaserWavelengthNm: value };
    const result = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), design.fixedLaserWavelengthNm);
    return { value, metrics: metricsFromSpatialSamples(result.reflectance, null, null, result.spatialField, design.strainCenterMm, targetWidthMm) };
  });
}

function metricsFromMaxwellSamples(
  samples: MaxwellFieldSample[],
  reflectance: number,
  transmission: number,
  energyError: number,
  targetMm: number,
  widthMm: number,
): RegionMetrics {
  return metricsFromSpatialSamples(reflectance, transmission, energyError, toRegionField(samples), targetMm, widthMm);
}

function metricsFromSpatialSamples(
  reflectance: number,
  transmission: number | null,
  energyError: number | null,
  samples: Array<{ zM: number; lengthM: number; normalizedBackwardIntensity: number }>,
  targetMm: number,
  widthMm: number,
): RegionMetrics {
  const regions = detectReflectionRegions(toRegionField(samples), REGION_THRESHOLD);
  const primaryRegion = regions[0] ?? null;
  const totalResponse = integrate(samples, () => 1);
  const targetStartMm = targetMm - widthMm / 2;
  const targetEndMm = targetMm + widthMm / 2;
  const targetResponse = integrate(samples, (sample) => {
    const zMm = sample.zM * 1e3;
    return zMm >= targetStartMm && zMm <= targetEndMm ? 1 : 0;
  });
  const offTargetResponse = Math.max(0, totalResponse - targetResponse);
  const strongestCompetitor = regions.reduce((maximum, region) => Math.max(maximum, competitorPower(samples, region, targetStartMm, targetEndMm)), 0);
  return {
    reflectance,
    transmission,
    energyError,
    centerMm: primaryRegion?.centerMm ?? null,
    centerErrorMm: primaryRegion ? primaryRegion.centerMm - targetMm : null,
    widthMm: primaryRegion ? primaryRegion.endMm - primaryRegion.startMm : null,
    targetFraction: totalResponse > EPSILON ? targetResponse / totalResponse : null,
    offTargetFraction: totalResponse > EPSILON ? offTargetResponse / totalResponse : null,
    strongestCompetitor,
    regionCount: regions.length,
  };
}

function toRegionField(samples: Array<{ zM: number; lengthM: number; normalizedBackwardIntensity: number }>) {
  return samples.map((sample) => ({
    ...sample,
    startM: sample.zM - sample.lengthM / 2,
    endM: sample.zM + sample.lengthM / 2,
    sectionId: null,
    sectionStartM: null,
    sectionEndM: null,
    gratingPhaseRadians: 0,
    inBraggSection: true,
    strain: 0,
    averageIndex: nominalDesign.averageIndex,
    periodM: nominalDesign.gratingPeriodNm * 1e-9,
    braggWavelengthM: 2 * nominalDesign.averageIndex * nominalDesign.gratingPeriodNm * 1e-9,
    couplingCoefficientPerM: 0,
    detuningPerM: 0,
  }));
}

function integrate(samples: Array<{ zM: number; lengthM: number; normalizedBackwardIntensity: number }>, weight: (sample: { zM: number }) => number): number {
  return samples.reduce((sum, sample) => sum + sample.normalizedBackwardIntensity * sample.lengthM * 1e3 * weight(sample), 0);
}

function competitorPower(samples: Array<{ zM: number; lengthM: number; normalizedBackwardIntensity: number }>, region: ReflectionRegion, targetStartMm: number, targetEndMm: number): number {
  return integrate(samples, (sample) => {
    const zMm = sample.zM * 1e3;
    const inRegion = zMm >= region.startMm && zMm <= region.endMm;
    const inTarget = zMm >= targetStartMm && zMm <= targetEndMm;
    return inRegion && !inTarget ? 1 : 0;
  });
}

function freezeNominal(design: HybridBraggDesignInputs) {
  const model = createHybridBraggModel(design);
  const centerStrain = sampleStrainField(model.strain, design.strainCenterMm * 1e-3);
  const background = applyMaterialStrainResponse(model.grating, model.materialResponse, design.strainBias);
  const trough = applyMaterialStrainResponse(model.grating, model.materialResponse, centerStrain);
  return {
    totalOpticalLengthMm: design.lengthMm,
    averageRefractiveIndex: design.averageIndex,
    gratingDeltaN: design.indexModulation,
    gratingPeriodNm: design.gratingPeriodNm,
    laserWavelengthNm: design.fixedLaserWavelengthNm,
    backgroundBiasStrain: design.strainBias,
    troughCenterStrain: centerStrain,
    strainExcursion: design.peakStrain,
    troughCenterMm: design.strainCenterMm,
    troughWidthMm: design.strainWidthMm,
    transitionWidthMm: design.perturbationEdgeWidthMm,
    effectivePhotoelasticCoefficient: design.effectivePhotoelasticCoefficient,
    cmtResolutionSegments: design.segmentCount,
    maxwellOpticalSamplesPerPeriod: MAXWELL_OPTIONS.samplesPerPeriod,
    maxwellMechanicalEnvelopeBlocks: MAXWELL_OPTIONS.envelopeBlocks,
    targetWidthMm,
    couplingLengthMm,
    backgroundBraggWavelengthNm: background.braggWavelengthM * 1e9,
    troughBraggWavelengthNm: trough.braggWavelengthM * 1e9,
  };
}

function couplingLength(design: HybridBraggDesignInputs): number | null {
  const wavelengthM = design.fixedLaserWavelengthNm * 1e-9;
  const kappa = getCouplingCoefficientPerM(design.indexModulation, wavelengthM);
  return kappa > 0 ? (1 / kappa) * 1e3 : null;
}

function toRangeSamples(points: RobustnessPoint[]): RobustnessMetricSample[] {
  return points.map((point) => ({
    value: point.value,
    useful: point.useful,
    reflectance: point.maxwell.reflectance,
    centerErrorMm: point.maxwell.centerErrorMm,
    regionWidthMm: point.maxwell.widthMm,
    targetFraction: point.maxwell.targetFraction,
    offTargetFraction: point.maxwell.offTargetFraction,
    strongestCompetitor: point.maxwell.strongestCompetitor,
    regionCount: point.maxwell.regionCount,
  }));
}

function offsetRange(background: UsefulRange, excursion: UsefulRange, nominalTroughStrain: number): UsefulRange {
  if (background.lowerTestedUsefulBound === null || background.upperTestedUsefulBound === null ||
    excursion.lowerTestedUsefulBound === null || excursion.upperTestedUsefulBound === null) {
    return { nominal: nominalTroughStrain, lowerTestedUsefulBound: null, upperTestedUsefulBound: null, usefulCount: 0, testedCount: 0 };
  }
  return {
    nominal: nominalTroughStrain,
    lowerTestedUsefulBound: background.lowerTestedUsefulBound - excursion.upperTestedUsefulBound,
    upperTestedUsefulBound: background.upperTestedUsefulBound - excursion.lowerTestedUsefulBound,
    usefulCount: Math.min(background.usefulCount, excursion.usefulCount),
    testedCount: Math.min(background.testedCount, excursion.testedCount),
  };
}

function symmetricTolerance(range: UsefulRange): number | null {
  if (range.lowerTestedUsefulBound === null || range.upperTestedUsefulBound === null) return null;
  return Math.min(Math.abs(range.lowerTestedUsefulBound - range.nominal), Math.abs(range.upperTestedUsefulBound - range.nominal));
}

function usableDepth(points: RobustnessPoint[]) {
  const useful = points.filter((point) => point.useful).map((point) => point.targetMm).sort((left, right) => left - right);
  return {
    startMm: useful[0] ?? null,
    endMm: useful.at(-1) ?? null,
  };
}

function rankSensitivity(items: Array<[string, UsefulRange, number]>) {
  return items.map(([parameter, range, scale]) => {
    const tolerance = symmetricTolerance(range);
    const relativeTolerance = tolerance === null ? null : tolerance / Math.max(Math.abs(scale), 1e-9);
    const sensitivity = relativeTolerance === null
      ? 'not useful at nominal'
      : relativeTolerance < 0.08 ? 'high' : relativeTolerance < 0.25 ? 'medium' : 'low';
    return { parameter, relativeTolerance, sensitivity, range };
  }).sort((left, right) => (left.relativeTolerance ?? -1) - (right.relativeTolerance ?? -1));
}

function classifyRobustness(): string {
  const usefulPrimaryRanges = [ranges.backgroundStrain, ranges.troughDepth, ranges.troughWidth, ranges.transitionWidth, ranges.laserWavelength]
    .filter((range) => range.lowerTestedUsefulBound !== null && range.upperTestedUsefulBound !== null).length;
  if (usefulPrimaryRanges >= 5 && classificationsPreviewDepthUseful()) {
    return 'MAXWELL-CONFIRMED TROUGH HAS A PRACTICALLY USEFUL TOLERANCE ENVELOPE';
  }
  if (usefulPrimaryRanges >= 3) return 'MAXWELL-CONFIRMED TROUGH IS OPTICALLY VALID BUT TOLERANCE-LIMITED';
  return 'MAXWELL-CONFIRMED TROUGH IS TOO FRAGILE FOR MECHANICAL FOLLOW-UP';
}

function classificationsPreviewDepthUseful(): boolean {
  return depthDependence.filter((point) => point.useful).length >= 3;
}

function classifyLaserCompensation(): string {
  const biasedNominalFailures = [...biasLaserCompensation, ...depthLaserCompensation].filter((point) => point.useful).length;
  if (biasedNominalFailures >= 3) return 'LASER TUNING PROVIDES MEANINGFUL STRAIN-TOLERANCE COMPENSATION';
  if (biasedNominalFailures >= 1) return 'LASER TUNING PROVIDES LIMITED COMPENSATION';
  return 'LASER TUNING DOES NOT MATERIALLY RELAX STRAIN TOLERANCES';
}

function classifyCmtVsMaxwell(): string {
  const points = [...biasSweep, ...troughDepthSweep, ...widthSweep, ...transitionSweep, ...laserSweep];
  const centerDiffs = points
    .map((point) => Math.abs((point.maxwell.centerMm ?? 0) - (point.cmt.centerMm ?? 0)))
    .filter(Number.isFinite);
  const meanCenterDiff = mean(centerDiffs);
  const usefulDisagreements = points.filter((point) => {
    const cmtUseful = isUseful(point.cmt);
    return cmtUseful !== point.useful;
  }).length;
  if (meanCenterDiff <= 0.05 && usefulDisagreements <= 2) return 'CMT TRACKS MAXWELL ROBUSTNESS TRENDS WELL';
  if (meanCenterDiff <= 0.2 && usefulDisagreements <= 6) return 'CMT TRACKS MAXWELL QUALITATIVELY BUT MISSTATES TOLERANCE WIDTHS';
  return 'CMT DOES NOT RELIABLY PREDICT THE ROBUSTNESS ENVELOPE';
}

function classifyMechanicalGate(robustness: string): string {
  const hasNonzeroPrimaryTolerance = [
    ranges.backgroundStrain,
    ranges.troughDepth,
    ranges.troughWidth,
    ranges.laserWavelength,
    ranges.positionOffset,
  ].some(hasNonzeroUsefulWidth);
  const hasNonzeroDepthSpan = requirement.usableDepthStartMm !== null &&
    requirement.usableDepthEndMm !== null &&
    requirement.usableDepthEndMm > requirement.usableDepthStartMm;
  return robustness !== 'MAXWELL-CONFIRMED TROUGH IS TOO FRAGILE FOR MECHANICAL FOLLOW-UP' &&
    hasNonzeroPrimaryTolerance &&
    hasNonzeroDepthSpan
    ? 'BIASED TROUGH IS READY FOR MECHANICAL FEASIBILITY STUDY'
    : 'BIASED TROUGH REMAINS OPTICALLY PROMISING BUT MECHANICAL GATE REMAINS CLOSED';
}

function classifyUsableDepth(): string {
  const useful = depthDependence.filter((point) => point.useful).length;
  if (useful >= 4) return 'most of device';
  if (useful >= 2) return 'central interior only';
  return 'strongly position dependent';
}

function mechanicalTargetTable() {
  return [
    tableRow('background strain', nominalDesign.strainBias, ranges.backgroundStrain, sensitivityFor('bias strain'), 'Bias shifts the off-trough Bragg wavelength away from the laser.'),
    tableRow('trough strain / strain excursion', `${fmt(nominal.troughCenterStrain)} / ${fmt(nominalDesign.peakStrain)}`, troughStrainRange, sensitivityFor('trough depth'), 'Trough usefulness follows local Bragg alignment more directly than zero strain alone.'),
    tableRow('trough width', nominalDesign.strainWidthMm, ranges.troughWidth, sensitivityFor('trough width'), `Nominal W/Lc = ${fmt(couplingLengthMm ? nominalDesign.strainWidthMm / couplingLengthMm : null)}.`),
    tableRow('transition width', nominalDesign.perturbationEdgeWidthMm, ranges.transitionWidth, sensitivityFor('transition width'), 'Finite transition widths are allowed only while localization remains useful.'),
    tableRow('position', '0 mm command error', ranges.positionOffset, sensitivityFor('trough position'), 'Bounds are tested mechanical placement error relative to the desired target.'),
    tableRow('laser wavelength', nominalDesign.fixedLaserWavelengthNm, ranges.laserWavelength, sensitivityFor('laser wavelength'), 'Laser tuning also appears in the compensation sweeps.'),
  ];
}

function isUseful(metrics: RegionMetrics): boolean {
  return classifyUsefulTroughState({
    reflectance: metrics.reflectance,
    centerErrorMm: metrics.centerErrorMm,
    regionWidthMm: metrics.widthMm,
    targetFraction: metrics.targetFraction,
    offTargetFraction: metrics.offTargetFraction,
    strongestCompetitor: metrics.strongestCompetitor,
    regionCount: metrics.regionCount,
  }, thresholds);
}

function tableRow(parameter: string, nominalValue: number | string, range: UsefulRange, sensitivity: string, notes: string) {
  return {
    parameter,
    nominalValue,
    lowerTestedUsefulBound: range.lowerTestedUsefulBound,
    upperTestedUsefulBound: range.upperTestedUsefulBound,
    sensitivity,
    notes,
  };
}

function sensitivityFor(parameter: string): string {
  return sensitivityRanking.find((item) => item.parameter === parameter)?.sensitivity ?? 'n/a';
}

function braggShiftRequirements() {
  const unstrainedNm = 2 * nominalDesign.averageIndex * nominalDesign.gratingPeriodNm;
  return {
    unstrainedBraggWavelengthNm: unstrainedNm,
    nominalBackgroundDeltaLambdaBNm: nominal.backgroundBraggWavelengthNm - unstrainedNm,
    nominalTroughDeltaLambdaBNm: nominal.troughBraggWavelengthNm - unstrainedNm,
    nominalDifferentialDeltaLambdaBNm: nominal.backgroundBraggWavelengthNm - nominal.troughBraggWavelengthNm,
    usefulBackgroundStrainRange: ranges.backgroundStrain,
    usefulTroughStrainRange: troughStrainRange,
  };
}

function performanceSummary() {
  return {
    biasRobustnessMs: sumRuntime(biasSweep),
    widthTransitionStudyMs: sumRuntime(widthSweep) + sumRuntime(transitionSweep) + sumRuntime(widthTransitionCoupling),
    laserCompensationMs: sumRuntime(biasLaserCompensation) + sumRuntime(depthLaserCompensation),
    fullMaxwellRobustnessRunMs: sumRuntime([
      ...biasSweep,
      ...troughDepthSweep,
      ...widthSweep,
      ...transitionSweep,
      ...positionSweep,
      ...laserSweep,
      ...biasLaserCompensation,
      ...depthLaserCompensation,
      ...widthTransitionCoupling,
      ...depthDependence,
    ]),
  };
}

function sumRuntime(points: RobustnessPoint[]): number {
  return points.reduce((sum, point) => sum + point.runtimeMs, 0);
}

function renderReport(): string {
  return [
    '# WP-v2-09D Maxwell Trough Robustness Envelope',
    '',
    '## A. Baseline and provenance',
    'Nominal trough is read from `artifacts/issue-66/piezo-strain-window-study.json` at `bestTrough.design`. PR #67 and PR #69 remain historical inputs; this packet does not reopen them.',
    '',
    '## B. Nominal trough configuration',
    table(['parameter', 'value'], Object.entries(nominal).map(([key, value]) => [key, fmt(value as number | null)])),
    '',
    '## C. Useful-state criterion',
    table(['threshold', 'value'], Object.entries(thresholds).map(([key, value]) => [key, fmt(value)])),
    'These are research thresholds for optical usefulness only, not final display requirements.',
    '',
    '## D. Bias-strain robustness',
    renderSweep(biasSweep, 'bias strain'),
    rangeLine(ranges.backgroundStrain),
    '',
    '## E. Trough-depth robustness',
    renderSweep(troughDepthSweep, 'trough depth'),
    'Interpretation: optimum operation follows local lambda_B approximately matching the laser more directly than a strict local strain equals zero rule.',
    rangeLine(ranges.troughDepth),
    '',
    '## F. Width robustness',
    renderSweep(widthSweep, 'trough width'),
    `Nominal W/Lc = ${fmt(couplingLengthMm ? nominalDesign.strainWidthMm / couplingLengthMm : null)}.`,
    rangeLine(ranges.troughWidth),
    '',
    '## G. Transition-width robustness',
    renderSweep(transitionSweep, 'transition width'),
    `Nominal transition/W = ${fmt(nominalDesign.perturbationEdgeWidthMm / nominalDesign.strainWidthMm)}; transition/Lc = ${fmt(couplingLengthMm ? nominalDesign.perturbationEdgeWidthMm / couplingLengthMm : null)}.`,
    rangeLine(ranges.transitionWidth),
    '',
    '## H. Position tolerance',
    renderSweep(positionSweep, 'position offset'),
    `Mechanical position tolerance from tested useful offsets: +/- ${fmt(requirement.positionToleranceMm)} mm.`,
    '',
    '## I. Laser tolerance',
    renderSweep(laserSweep, 'laser wavelength'),
    rangeLine(ranges.laserWavelength),
    '',
    '## J. Laser compensation - REQUIRED',
    classifications.laserCompensation,
    renderCompensationSweep(biasLaserCompensation, 'bias strain'),
    renderCompensationSweep(depthLaserCompensation, 'trough depth'),
    '',
    '## K. Position dependence and usable scan depth',
    renderSweep(depthDependence, 'depth dependence'),
    `Physical medium depth: 0-${fmt(nominalDesign.lengthMm)} mm. Validated usable optical scan depth: ${fmt(requirement.usableDepthStartMm)}-${fmt(requirement.usableDepthEndMm)} mm. Edge exclusion: ${fmt(requirement.usableDepthStartMm)} mm entrance / ${fmt(requirement.usableDepthEndMm === null ? null : nominalDesign.lengthMm - requirement.usableDepthEndMm)} mm exit. Classification: ${classifications.usableDepth}.`,
    '',
    '## L. Sensitivity ranking',
    table(['rank', 'parameter', 'relative tolerance', 'sensitivity'], sensitivityRanking.map((item, index) => [
      String(index + 1),
      item.parameter,
      fmt(item.relativeTolerance),
      item.sensitivity,
    ])),
    '',
    '## M. CMT-vs-Maxwell robustness - REQUIRED',
    classifications.cmtVsMaxwell,
    '',
    '## N. Width + transition coupling',
    renderWidthTransitionSweep(widthTransitionCoupling),
    '',
    '## O. Mechanical target table - REQUIRED',
    table(['parameter', 'nominal value', 'lower tested useful bound', 'upper tested useful bound', 'sensitivity', 'notes'], payload.mechanicalTargetTable.map((row) => [
      row.parameter,
      String(row.nominalValue),
      fmt(row.lowerTestedUsefulBound as number | null),
      fmt(row.upperTestedUsefulBound as number | null),
      row.sensitivity,
      row.notes,
    ])),
    '',
    '## P. Bragg-shift requirements',
    table(['quantity', 'value nm'], Object.entries(payload.braggShiftRequirements).filter(([, value]) => typeof value === 'number').map(([key, value]) => [key, fmt(value as number)])),
    '',
    '## Q. Robustness result - REQUIRED HIGHLIGHT',
    classifications.robustness,
    '',
    '## R. Mechanical gate - REQUIRED HIGHLIGHT',
    classifications.mechanicalGate,
    '',
    '## S. Continuous vs discrete optical preference',
    `Based only on optical behavior, the validated trough appears most naturally compatible with: ${classifications.opticalPreference}.`,
    '',
    '## T. Performance',
    table(['case', 'runtime ms'], Object.entries(payload.performance).map(([key, value]) => [key, fmt(value)])),
    '',
    '## U. Mechanical handoff concepts',
    'Surface-bonded PZT patch; opposed PZT pair; preloaded optical medium plus local strain relief; segmented differential actuator array; embedded piezoelectric element; mechanically compliant local region; low-frequency traveling stress field. No winner is selected here.',
    '',
  ].join('\n') + '\n';
}

function renderSweep(points: RobustnessPoint[], valueLabel: string): string {
  return table([
    valueLabel,
    'R_Maxwell',
    'center mm',
    'error mm',
    'width mm',
    'target fraction',
    'off-target fraction',
    'competitor',
    'regions',
    'useful',
    'CMT-Maxwell center diff mm',
  ], points.map((point) => [
    fmt(point.value),
    fmt(point.maxwell.reflectance),
    fmt(point.maxwell.centerMm),
    fmt(point.maxwell.centerErrorMm),
    fmt(point.maxwell.widthMm),
    fmt(point.maxwell.targetFraction),
    fmt(point.maxwell.offTargetFraction),
    fmt(point.maxwell.strongestCompetitor),
    String(point.maxwell.regionCount),
    String(point.useful),
    fmt(point.maxwell.centerMm !== null && point.cmt.centerMm !== null ? point.maxwell.centerMm - point.cmt.centerMm : null),
  ]));
}

function renderCompensationSweep(points: RobustnessPoint[], valueLabel: string): string {
  return table([
    valueLabel,
    'laser nm',
    'R_Maxwell',
    'center mm',
    'error mm',
    'width mm',
    'target fraction',
    'off-target fraction',
    'regions',
    'useful',
  ], points.map((point) => [
    fmt(point.value),
    fmt(point.design.fixedLaserWavelengthNm),
    fmt(point.maxwell.reflectance),
    fmt(point.maxwell.centerMm),
    fmt(point.maxwell.centerErrorMm),
    fmt(point.maxwell.widthMm),
    fmt(point.maxwell.targetFraction),
    fmt(point.maxwell.offTargetFraction),
    String(point.maxwell.regionCount),
    String(point.useful),
  ]));
}

function renderWidthTransitionSweep(points: RobustnessPoint[]): string {
  return table([
    'width mm',
    'transition mm',
    'W/Lc',
    'transition/Lc',
    'R_Maxwell',
    'center error mm',
    'width mm',
    'target fraction',
    'off-target fraction',
    'regions',
    'useful',
  ], points.map((point) => [
    fmt(point.design.strainWidthMm),
    fmt(point.design.perturbationEdgeWidthMm),
    fmt(couplingLengthMm ? point.design.strainWidthMm / couplingLengthMm : null),
    fmt(couplingLengthMm ? point.design.perturbationEdgeWidthMm / couplingLengthMm : null),
    fmt(point.maxwell.reflectance),
    fmt(point.maxwell.centerErrorMm),
    fmt(point.maxwell.widthMm),
    fmt(point.maxwell.targetFraction),
    fmt(point.maxwell.offTargetFraction),
    String(point.maxwell.regionCount),
    String(point.useful),
  ]));
}

function rangeLine(range: UsefulRange): string {
  return `Tested useful range containing nominal: ${fmt(range.lowerTestedUsefulBound)} to ${fmt(range.upperTestedUsefulBound)}.`;
}

function hasNonzeroUsefulWidth(range: UsefulRange): boolean {
  return range.lowerTestedUsefulBound !== null &&
    range.upperTestedUsefulBound !== null &&
    range.upperTestedUsefulBound > range.lowerTestedUsefulBound;
}

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)) return value.toExponential(4);
  return value.toPrecision(5);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
