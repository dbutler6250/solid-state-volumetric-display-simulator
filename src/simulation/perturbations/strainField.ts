import type { HybridStrainShape } from '../../types/simulation';

export type PerturbationField = {
  kind: 'strain';
  evaluate: (zM: number, tS?: number) => number;
};

export type StrainField = {
  peakStrain: number;
  centerM: number;
  widthM: number;
  shape: HybridStrainShape;
  edgeWidthM?: number;
  periodM?: number;
  phaseRadians?: number;
  temporalPhaseRadians?: number;
  velocityMps?: number;
  secondaryPeriodM?: number;
  secondaryAmplitudeRatio?: number;
  secondaryPhaseRadians?: number;
  biasStrain?: number;
  actuatorCount?: number;
  actuatorPitchM?: number;
  activeActuatorIndex?: number;
  actuatorCommandAmplitude?: number;
  actuatorAdjacentCommandAmplitude?: number;
};

/** Samples a prescribed dimensionless strain field at one SI position. */
export function sampleStrainField(field: StrainField, zM: number): number {
  return createStrainPerturbationField(field).evaluate(zM);
}

/** Creates a pure prescribed strain perturbation independent of any physical actuator model. */
export function createStrainPerturbationField(field: StrainField): PerturbationField {
  return {
    kind: 'strain',
    evaluate: (zM, tS = 0) => samplePrescribedStrainField(field, zM, tS),
  };
}

function samplePrescribedStrainField(field: StrainField, zM: number, tS: number): number {
  const edgeWidthM = field.edgeWidthM ?? 0;
  const periodM = field.periodM ?? field.widthM;
  const phaseRadians = field.phaseRadians ?? 0;
  const temporalPhaseRadians = field.temporalPhaseRadians ?? 0;
  const velocityMps = field.velocityMps ?? 0;
  const secondaryPeriodM = field.secondaryPeriodM ?? periodM;
  const secondaryAmplitudeRatio = field.secondaryAmplitudeRatio ?? 0;
  const secondaryPhaseRadians = field.secondaryPhaseRadians ?? 0;
  const biasStrain = field.biasStrain ?? 0;
  const distance = zM - field.centerM;
  if (field.shape === 'piezo-window') {
    return biasStrain + field.peakStrain * sampleSmoothTopHat(distance, field.widthM, edgeWidthM);
  }
  if (field.shape === 'piezo-trough') {
    return biasStrain - Math.abs(field.peakStrain) * sampleSmoothTopHat(distance, field.widthM, edgeWidthM);
  }
  if (field.shape === 'piezo-array') {
    return biasStrain + samplePiezoArrayField(field, zM, edgeWidthM);
  }
  if (field.peakStrain === 0) return 0;
  if (field.shape === 'rectangular') {
    if (field.widthM <= 0) return 0;
    return Math.abs(distance) <= field.widthM / 2 ? field.peakStrain : 0;
  }
  if (field.shape === 'gaussian') {
    return field.peakStrain * gaussianEnvelope(distance, field.widthM);
  }
  if (field.shape === 'smooth-top-hat') {
    return field.peakStrain * sampleSmoothTopHat(distance, field.widthM, edgeWidthM);
  }
  if (field.shape === 'triangular') {
    if (field.widthM <= 0) return 0;
    return field.peakStrain * Math.max(0, 1 - Math.abs(distance) / (field.widthM / 2));
  }
  if (field.shape === 'traveling-sinusoid') {
    return field.peakStrain * Math.cos(wavePhase(periodM, zM, velocityMps, tS, phaseRadians + temporalPhaseRadians));
  }
  if (field.shape === 'standing-wave') {
    const spatial = Math.cos(waveNumber(periodM) * zM + phaseRadians);
    const temporal = Math.cos(angularFrequency(periodM, velocityMps) * tS + temporalPhaseRadians);
    return field.peakStrain * spatial * temporal;
  }
  if (field.shape === 'carrier-envelope') {
    return field.peakStrain *
      gaussianEnvelope(distance, field.widthM) *
      Math.cos(wavePhase(periodM, zM, velocityMps, tS, phaseRadians + temporalPhaseRadians));
  }

  const primary = Math.cos(wavePhase(periodM, zM, velocityMps, tS, phaseRadians + temporalPhaseRadians));
  const secondary = secondaryAmplitudeRatio *
    Math.cos(wavePhase(secondaryPeriodM, zM, velocityMps, tS, secondaryPhaseRadians + temporalPhaseRadians));
  return field.peakStrain * (primary + secondary);
}

/** Samples a prescribed piezo-like actuator array, summing overlap without clipping. */
export function samplePiezoArrayField(field: StrainField, zM: number, edgeWidthM = field.edgeWidthM ?? 0): number {
  const count = Math.max(1, Math.round(field.actuatorCount ?? 1));
  const pitchM = Math.max(0, field.actuatorPitchM ?? field.widthM);
  const activeIndex = Math.min(count - 1, Math.max(0, Math.round(field.activeActuatorIndex ?? 0)));
  const command = field.actuatorCommandAmplitude ?? 1;
  const adjacentCommand = field.actuatorAdjacentCommandAmplitude ?? 0;
  const firstCenterM = field.centerM - ((count - 1) * pitchM) / 2;
  let strain = 0;
  for (let index = 0; index < count; index += 1) {
    const distanceFromActive = Math.abs(index - activeIndex);
    const drive = distanceFromActive === 0 ? command : distanceFromActive === 1 ? adjacentCommand : 0;
    if (drive === 0) continue;
    const centerM = firstCenterM + index * pitchM;
    strain += field.peakStrain * drive * sampleSmoothTopHat(zM - centerM, field.widthM, edgeWidthM);
  }
  return strain;
}

function gaussianEnvelope(distanceM: number, fwhmM: number): number {
  if (fwhmM <= 0) return 0;
  const sigmaM = fwhmM / 2.355;
  return Math.exp(-0.5 * (distanceM / sigmaM) ** 2);
}

function sampleSmoothTopHat(distanceM: number, centralWidthM: number, edgeWidthM: number): number {
  if (centralWidthM <= 0) return 0;
  const halfCoreM = centralWidthM / 2;
  const edgeM = Math.max(0, edgeWidthM);
  const absoluteDistanceM = Math.abs(distanceM);
  if (absoluteDistanceM <= halfCoreM) return 1;
  if (edgeM <= 0 || absoluteDistanceM >= halfCoreM + edgeM) return 0;
  const edgeFraction = (absoluteDistanceM - halfCoreM) / edgeM;
  return 0.5 * (1 + Math.cos(Math.PI * edgeFraction));
}

function waveNumber(periodM: number): number {
  return periodM > 0 ? 2 * Math.PI / periodM : 0;
}

function angularFrequency(periodM: number, velocityMps: number): number {
  return periodM > 0 ? waveNumber(periodM) * Math.max(0, velocityMps) : 0;
}

function wavePhase(periodM: number, zM: number, velocityMps: number, tS: number, phaseRadians: number): number {
  return waveNumber(periodM) * zM - angularFrequency(periodM, velocityMps) * tS + phaseRadians;
}

