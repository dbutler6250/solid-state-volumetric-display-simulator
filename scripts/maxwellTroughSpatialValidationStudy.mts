import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import { detectReflectionRegions, type ReflectionRegion } from '../src/simulation/experiments/hybridBraggExperiments';
import { evaluateTargetReflectionState } from '../src/simulation/optimization/targetReflectionState';
import { sampleStrainField } from '../src/simulation/perturbations/strainField';
import { applyMaterialStrainResponse } from '../src/simulation/responses/strainOpticResponse';
import { solveHybridBraggCoupledModePoint } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import {
  reconstructHybridBraggMaxwellFields,
  reconstructScatteringLayerFields,
  solveScatteringLayers,
  type MaxwellFieldResult,
  type MaxwellFieldSample,
} from '../src/simulation/solvers/maxwell/longGratingScatteringSolver';
import { createHybridBraggModel } from '../src/simulation/structures/hybridBraggGrating';

type PreviousStudyPayload = {
  bestTrough: {
    design: HybridBraggDesignInputs;
    targetWidthMm: number;
  };
  bestBiasedTroughArray?: {
    actuatorCount: number;
    pitchMm: number;
  };
};

type RegionMetrics = {
  primaryRegion: ReflectionRegion | null;
  targetResponse: number;
  offTargetResponse: number;
  strongestCompetitor: number;
  targetFraction: number | null;
  offTargetFraction: number | null;
  targetCompetitorRatio: number | null;
};

const OUT_DIR = join(process.cwd(), 'artifacts', 'issue-68');
const PREVIOUS_JSON_PATH = join(process.cwd(), 'artifacts', 'issue-66', 'piezo-strain-window-study.json');
const JSON_PATH = join(OUT_DIR, 'maxwell-trough-spatial-validation-study.json');
const REPORT_PATH = join(OUT_DIR, 'maxwell-trough-spatial-validation-study.md');
const FIELD_OPTIONS = { samplesPerPeriod: 8, envelopeBlocks: 400 };
const THRESHOLD = 0.5;
const EPSILON = 1e-12;

const previous = JSON.parse(await readFile(PREVIOUS_JSON_PATH, 'utf8')) as PreviousStudyPayload;
const baseDesign = previous.bestTrough.design;
const targetWidthMm = previous.bestTrough.targetWidthMm;
const movingCentersMm = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const staticResult = analyzeDesign(baseDesign, baseDesign.strainCenterMm, targetWidthMm);
const movingTrough = movingCentersMm.map((centerMm) =>
  analyzeDesign({ ...baseDesign, strainCenterMm: centerMm }, centerMm, targetWidthMm));
const arrayDesign = {
  ...baseDesign,
  strainShape: 'piezo-array' as const,
  actuatorPolarity: 'trough' as const,
  actuatorCount: 4,
  actuatorPitchMm: baseDesign.lengthMm / 5,
  strainWidthMm: Math.min(baseDesign.strainWidthMm, (baseDesign.lengthMm / 5) * 0.9),
  perturbationEdgeWidthMm: Math.min(baseDesign.perturbationEdgeWidthMm, (baseDesign.lengthMm / 5) * 0.35),
  actuatorCommandAmplitude: 1,
  actuatorAdjacentCommandAmplitude: 0.1,
};
const arrayCentersMm = actuatorCenters(arrayDesign);
const arrayCases = arrayCentersMm.map((targetMm, actuatorIndex) =>
  analyzeDesign({ ...arrayDesign, activeActuatorIndex: actuatorIndex }, targetMm, targetWidthMm));
const spatialConclusion = chooseSpatialConclusion();
const movingTroughConclusion = chooseMovingConclusion();
const conclusions = {
  spatial: spatialConclusion,
  movingTrough: movingTroughConclusion,
  array: chooseArrayConclusion(),
  cmtVisualization: chooseCmtVisualizationConclusion(),
  mechanicalGate: chooseMechanicalGateConclusion(spatialConclusion, movingTroughConclusion),
};

const payload = {
  issue: 68,
  solver: {
    method: 'stable prefix/suffix scattering reconstruction on the explicit Maxwell layer chain',
    options: FIELD_OPTIONS,
    semantics: 'forward/backward/total fields are complex electric-field amplitudes sampled at layer centers; normalized backward optical intensity is max-normalized |E_backward|^2; flux values multiply intensity by local refractive index.',
  },
  validation: {
    matchedSlab: validateMatchedSlab(),
    dielectricSlab: validateDielectricSlab(),
    shortGrating: validateShortGrating(),
    splitUniformGrating: validateSplitUniformGrating(),
  },
  staticTrough: staticResult,
  movingTrough,
  movingTroughStats: summarizeMoving(movingTrough),
  maxwellHeatmap: movingTrough.map((item) => ({
    troughCenterMm: item.targetMm,
    dominantCenterMm: item.maxwell.metrics.primaryRegion?.centerMm ?? null,
    samples: item.maxwell.downsampledField,
  })),
  arrayCases,
  conclusions,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function analyzeDesign(design: HybridBraggDesignInputs, targetMm: number, widthMm: number) {
  const startMemory = process.memoryUsage().heapUsed;
  const start = performance.now();
  const model = createHybridBraggModel(design);
  const cmt = solveHybridBraggCoupledModePoint(model, design.fixedLaserWavelengthNm);
  const maxwellField = reconstructHybridBraggMaxwellFields(design, design.fixedLaserWavelengthNm, FIELD_OPTIONS);
  const strainDiagnostics = localStrainDiagnostics(design, targetMm);
  const cmtRegions = detectReflectionRegions(cmt.spatialField, THRESHOLD);
  const maxwellRegions = detectReflectionRegions(toRegionField(maxwellField.samples), THRESHOLD);
  const maxwellMetrics = calculateRegionMetrics(maxwellField.samples, maxwellRegions, targetMm, widthMm);
  const cmtMetrics = evaluateTargetReflectionState(design, {
    targetDepthMm: targetMm,
    targetWidthMm: widthMm,
    controlKind: design.strainShape === 'piezo-array' ? 'actuator-index' : 'position',
    controlState: design.strainShape === 'piezo-array' ? design.activeActuatorIndex : targetMm,
  });
  return {
    targetMm,
    runtimeMs: performance.now() - start,
    heapDeltaMb: Math.max(0, process.memoryUsage().heapUsed - startMemory) / (1024 * 1024),
    strainDiagnostics,
    cmt: {
      reflectance: cmt.reflectance,
      primaryRegion: cmtRegions[0] ?? null,
      metrics: cmtMetrics,
    },
    maxwell: {
      reflectance: maxwellField.reflectance,
      transmission: maxwellField.transmission,
      energyError: maxwellField.energyError,
      boundaryReflectanceFromField: magnitudeSquared(maxwellField.reflectionAmplitude),
      metrics: maxwellMetrics,
      field: summarizeField(maxwellField.samples),
      downsampledField: downsampleField(maxwellField.samples, 240),
    },
    centerErrorsMm: {
      cmtMinusTarget: cmtRegions[0] ? cmtRegions[0].centerMm - targetMm : null,
      maxwellMinusTarget: maxwellMetrics.primaryRegion ? maxwellMetrics.primaryRegion.centerMm - targetMm : null,
      maxwellMinusCmt: maxwellMetrics.primaryRegion && cmtRegions[0]
        ? maxwellMetrics.primaryRegion.centerMm - cmtRegions[0].centerMm
        : null,
    },
  };
}

function validateMatchedSlab() {
  const field = reconstructScatteringLayerFields([{ refractiveIndex: 1.45, thicknessM: 2e-6 }], baseDesign.fixedLaserWavelengthNm, 1.45);
  return {
    reflectance: field.reflectance,
    maxBackwardIntensity: maxBy(field.samples, (sample) => sample.backwardIntensity),
    forwardFlux: field.samples[0]?.forwardFlux ?? null,
    passed: field.reflectance < 1e-24 && Math.abs((field.samples[0]?.forwardFlux ?? 0) - 1.45) < 1e-12,
  };
}

function validateDielectricSlab() {
  const layers = [{ refractiveIndex: 1.7, thicknessM: 300e-9 }];
  const boundary = solveScatteringLayers(layers, baseDesign.fixedLaserWavelengthNm, 1);
  const field = reconstructScatteringLayerFields(layers, baseDesign.fixedLaserWavelengthNm, 1);
  return {
    boundaryReflectance: boundary.reflectance,
    fieldReflectance: field.reflectance,
    fieldReflectanceFromAmplitude: magnitudeSquared(field.reflectionAmplitude),
    passed: Math.abs(boundary.reflectance - field.reflectance) < 1e-12,
  };
}

function validateShortGrating() {
  const shortDesign = { ...baseDesign, lengthMm: 0.02, peakStrain: 0, strainBias: 0, segmentCount: 80 };
  const boundary = solveHybridBraggCoupledModePoint(createHybridBraggModel(shortDesign), shortDesign.fixedLaserWavelengthNm);
  const field = reconstructHybridBraggMaxwellFields(shortDesign, shortDesign.fixedLaserWavelengthNm, {
    samplesPerPeriod: 16,
    envelopeBlocks: 1,
  });
  return {
    cmtReflectance: boundary.reflectance,
    maxwellReflectance: field.reflectance,
    maxEnergyError: field.energyError,
    passed: field.energyError < 1e-10 && Number.isFinite(field.samples[0]?.forwardIntensity ?? NaN),
  };
}

function validateSplitUniformGrating() {
  const design = { ...baseDesign, lengthMm: 0.02, peakStrain: 0, strainBias: 0 };
  const oneBlock = reconstructHybridBraggMaxwellFields(design, design.fixedLaserWavelengthNm, { samplesPerPeriod: 16, envelopeBlocks: 1 });
  const split = reconstructHybridBraggMaxwellFields(design, design.fixedLaserWavelengthNm, { samplesPerPeriod: 16, envelopeBlocks: 10 });
  return {
    oneBlockReflectance: oneBlock.reflectance,
    splitReflectance: split.reflectance,
    reflectanceError: Math.abs(oneBlock.reflectance - split.reflectance),
    passed: Math.abs(oneBlock.reflectance - split.reflectance) < 1e-12,
  };
}

function localStrainDiagnostics(design: HybridBraggDesignInputs, targetMm: number) {
  const model = createHybridBraggModel(design);
  const points = [targetMm, Math.max(0, targetMm - design.strainWidthMm), Math.min(design.lengthMm, targetMm + design.strainWidthMm)];
  return points.map((zMm) => {
    const strain = sampleStrainField(model.strain, zMm * 1e-3);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
    return {
      zMm,
      strain,
      braggWavelengthNm: local.braggWavelengthM * 1e9,
      detuningNm: design.fixedLaserWavelengthNm - local.braggWavelengthM * 1e9,
    };
  });
}

function calculateRegionMetrics(
  samples: MaxwellFieldSample[],
  regions: ReflectionRegion[],
  targetMm: number,
  widthMm: number,
): RegionMetrics {
  const targetStartMm = targetMm - widthMm / 2;
  const targetEndMm = targetMm + widthMm / 2;
  const targetResponse = integrate(samples, (sample) => {
    const zMm = sample.zM * 1e3;
    return zMm >= targetStartMm && zMm <= targetEndMm ? 1 : 0;
  });
  const totalResponse = integrate(samples, () => 1);
  const offTargetResponse = Math.max(0, totalResponse - targetResponse);
  const strongestCompetitor = regions.reduce((maximum, region) => Math.max(maximum, integrate(samples, (sample) => {
      const zMm = sample.zM * 1e3;
      const inRegion = zMm >= region.startMm && zMm <= region.endMm;
      const inTarget = zMm >= targetStartMm && zMm <= targetEndMm;
      return inRegion && !inTarget ? 1 : 0;
    })), 0);
  return {
    primaryRegion: regions[0] ?? null,
    targetResponse,
    offTargetResponse,
    strongestCompetitor,
    targetFraction: totalResponse > EPSILON ? targetResponse / totalResponse : null,
    offTargetFraction: totalResponse > EPSILON ? offTargetResponse / totalResponse : null,
    targetCompetitorRatio: strongestCompetitor > EPSILON ? targetResponse / strongestCompetitor : targetResponse > EPSILON ? null : 0,
  };
}

function integrate(samples: MaxwellFieldSample[], weight: (sample: MaxwellFieldSample) => number): number {
  return samples.reduce((sum, sample) => sum + sample.normalizedBackwardIntensity * sample.lengthM * 1e3 * weight(sample), 0);
}

function toRegionField(samples: MaxwellFieldSample[]) {
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
    averageIndex: sample.refractiveIndex,
    periodM: baseDesign.gratingPeriodNm * 1e-9,
    braggWavelengthM: 2 * sample.refractiveIndex * baseDesign.gratingPeriodNm * 1e-9,
    couplingCoefficientPerM: 0,
    detuningPerM: 0,
  }));
}

function summarizeMoving(items: ReturnType<typeof analyzeDesign>[]) {
  const errors = items
    .map((item) => item.centerErrorsMm.maxwellMinusTarget)
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .map(Math.abs);
  const sorted = [...errors].sort((left, right) => left - right);
  return {
    meanAbsoluteErrorMm: mean(errors),
    medianAbsoluteErrorMm: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    maximumAbsoluteErrorMm: sorted.length ? sorted.at(-1)! : null,
    trajectoryRmsErrorVsCmtMm: rms(items
      .map((item) => item.centerErrorsMm.maxwellMinusCmt)
      .filter((value): value is number => value !== null && Number.isFinite(value))),
  };
}

function summarizeField(samples: MaxwellFieldSample[]) {
  return {
    sampleCount: samples.length,
    maxBackwardIntensity: maxBy(samples, (sample) => sample.backwardIntensity),
    maxTotalIntensity: maxBy(samples, (sample) => sample.totalIntensity),
    totalNormalizedBackwardResponseMm: integrate(samples, () => 1),
  };
}

function downsampleField(samples: MaxwellFieldSample[], maxPoints: number) {
  const stride = Math.max(1, Math.ceil(samples.length / maxPoints));
  return samples.filter((_, index) => index % stride === 0).map((sample) => ({
    zMm: sample.zM * 1e3,
    normalizedBackwardIntensity: sample.normalizedBackwardIntensity,
  }));
}

function actuatorCenters(design: HybridBraggDesignInputs): number[] {
  const firstCenter = design.strainCenterMm - ((design.actuatorCount - 1) * design.actuatorPitchMm) / 2;
  return Array.from({ length: design.actuatorCount }, (_, index) => firstCenter + index * design.actuatorPitchMm);
}

function chooseSpatialConclusion(): string {
  const error = Math.abs(staticResult.centerErrorsMm.maxwellMinusTarget ?? Infinity);
  const fraction = staticResult.maxwell.metrics.targetFraction ?? 0;
  if (error <= 0.35 && fraction >= 0.35) return 'MAXWELL SPATIAL FIELDS CONFIRM BIASED-TROUGH LOCALIZATION';
  if (error <= 1.0 && fraction >= 0.15) return 'MAXWELL SPATIAL FIELDS PARTIALLY CONFIRM / REVISE TROUGH LOCALIZATION';
  return 'MAXWELL SPATIAL FIELDS DO NOT CONFIRM TROUGH LOCALIZATION';
}

function chooseMovingConclusion(): string {
  const stats = summarizeMoving(movingTrough);
  if ((stats.meanAbsoluteErrorMm ?? Infinity) <= 0.25) return 'MAXWELL CONFIRMS MOVING-TROUGH TRACKING';
  if ((stats.meanAbsoluteErrorMm ?? Infinity) <= 0.75) return 'MAXWELL SHOWS PARTIAL / REVISED MOVING-TROUGH TRACKING';
  return 'MAXWELL DOES NOT CONFIRM MOVING-TROUGH TRACKING';
}

function chooseArrayConclusion(): string {
  const fractions = arrayCases.map((item) => item.maxwell.metrics.targetFraction ?? 0);
  const useful = fractions.filter((fraction) => fraction >= 0.25).length;
  if (useful === arrayCases.length) return 'MAXWELL CONFIRMS USEFUL 4-ACTUATOR DISCRETE ADDRESSING';
  if (useful >= Math.ceil(arrayCases.length / 2)) return 'MAXWELL PARTIALLY SUPPORTS 4-ACTUATOR ADDRESSING';
  return 'MAXWELL DOES NOT CONFIRM USEFUL 4-ACTUATOR ADDRESSING';
}

function chooseCmtVisualizationConclusion(): string {
  const stats = summarizeMoving(movingTrough);
  return (stats.trajectoryRmsErrorVsCmtMm ?? Infinity) <= 0.35
    ? 'CMT SPATIAL VISUALIZATION IS VALIDATED FOR QUALITATIVE TROUGH RESEARCH'
    : 'CMT SPATIAL VISUALIZATION IS USEFUL BUT REQUIRES MAXWELL SPOT CHECKS';
}

function chooseMechanicalGateConclusion(spatial: string, moving: string): string {
  return spatial === 'MAXWELL SPATIAL FIELDS CONFIRM BIASED-TROUGH LOCALIZATION' &&
    moving === 'MAXWELL CONFIRMS MOVING-TROUGH TRACKING'
    ? 'BIASED TROUGH IS READY FOR MECHANICAL FEASIBILITY STUDY'
    : 'BIASED TROUGH REMAINS OPTICALLY PROMISING BUT MECHANICAL GATE REMAINS CLOSED';
}

function renderReport(): string {
  return [
    '# WP-v2-09C Maxwell Trough Spatial Validation',
    '',
    '## A. Reconstruction method',
    payload.solver.method,
    payload.solver.semantics,
    '',
    '## B. Validation checks',
    table(['case', 'passed', 'R/error'], [
      ['matched slab', String(payload.validation.matchedSlab.passed), fmt(payload.validation.matchedSlab.reflectance)],
      ['dielectric slab', String(payload.validation.dielectricSlab.passed), fmt(Math.abs(payload.validation.dielectricSlab.boundaryReflectance - payload.validation.dielectricSlab.fieldReflectance))],
      ['short grating', String(payload.validation.shortGrating.passed), fmt(payload.validation.shortGrating.maxEnergyError)],
      ['split uniform grating', String(payload.validation.splitUniformGrating.passed), fmt(payload.validation.splitUniformGrating.reflectanceError)],
    ]),
    '',
    '## C. Static trough result',
    table(['metric', 'CMT', 'Maxwell'], [[
      'R',
      fmt(staticResult.cmt.reflectance),
      fmt(staticResult.maxwell.reflectance),
    ], [
      'primary center mm',
      fmt(staticResult.cmt.primaryRegion?.centerMm),
      fmt(staticResult.maxwell.metrics.primaryRegion?.centerMm),
    ], [
      'primary width mm',
      fmt(regionWidth(staticResult.cmt.primaryRegion)),
      fmt(regionWidth(staticResult.maxwell.metrics.primaryRegion)),
    ], [
      'target response',
      fmt(staticResult.cmt.metrics.targetPower),
      fmt(staticResult.maxwell.metrics.targetResponse),
    ], [
      'off-target fraction',
      fmt(staticResult.cmt.metrics.offTargetPower),
      fmt(staticResult.maxwell.metrics.offTargetFraction),
    ]]),
    '',
    '## D. Moving trough result',
    payload.conclusions.movingTrough,
    `Mean |Delta z_Maxwell| = ${fmt(payload.movingTroughStats.meanAbsoluteErrorMm)} mm; median = ${fmt(payload.movingTroughStats.medianAbsoluteErrorMm)} mm; max = ${fmt(payload.movingTroughStats.maximumAbsoluteErrorMm)} mm.`,
    table(['target mm', 'CMT center mm', 'Maxwell center mm', 'R_CMT', 'R_Maxwell'], movingTrough.map((item) => [
      fmt(item.targetMm),
      fmt(item.cmt.primaryRegion?.centerMm),
      fmt(item.maxwell.metrics.primaryRegion?.centerMm),
      fmt(item.cmt.reflectance),
      fmt(item.maxwell.reflectance),
    ])),
    '',
    '## E. 4-actuator spot check',
    payload.conclusions.array,
    table(['actuator', 'target mm', 'Maxwell center mm', 'target fraction', 'off-target fraction', 'target/competitor', 'R'], arrayCases.map((item, index) => [
      String(index),
      fmt(item.targetMm),
      fmt(item.maxwell.metrics.primaryRegion?.centerMm),
      fmt(item.maxwell.metrics.targetFraction),
      fmt(item.maxwell.metrics.offTargetFraction),
      fmt(item.maxwell.metrics.targetCompetitorRatio),
      fmt(item.maxwell.reflectance),
    ])),
    '',
    '## F. Conclusions',
    payload.conclusions.spatial,
    payload.conclusions.cmtVisualization,
    payload.conclusions.mechanicalGate,
    '',
    '## G. Performance',
    `Static reconstruction: ${fmt(staticResult.runtimeMs)} ms, ${fmt(staticResult.heapDeltaMb)} MB heap delta.`,
    `9-position moving sweep total: ${fmt(movingTrough.reduce((sum, item) => sum + item.runtimeMs, 0))} ms.`,
    `4-actuator sweep total: ${fmt(arrayCases.reduce((sum, item) => sum + item.runtimeMs, 0))} ms.`,
    '',
  ].join('\n');
}

function regionWidth(region: ReflectionRegion | null | undefined): number | null {
  return region ? region.endMm - region.startMm : null;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function rms(values: number[]): number | null {
  return values.length ? Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length) : null;
}

function maxBy<T>(items: T[], valueFor: (item: T) => number): number {
  return items.reduce((maximum, item) => Math.max(maximum, valueFor(item)), 0);
}

function magnitudeSquared(value: { re: number; im: number }): number {
  return value.re * value.re + value.im * value.im;
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
