import type { SampledStrainField } from './actuatorStrainTransfer';

export type MechanicalStrainTarget = {
  lengthM: number;
  centerM: number;
  widthM: number;
  transitionWidthM: number;
  backgroundStrain: number;
  troughStrain: number;
};

export type MechanicalTargetMetrics = {
  biasStrainError: number;
  troughMinimumError: number;
  strainExcursionError: number;
  centerErrorM: number;
  widthErrorM: number;
  transitionWidthErrorM: number;
  rmsStrainError: number;
  maxStrainError: number;
  offTargetStrainDisturbance: number;
  localizationLengthM: number;
  crossTalk: number;
};

/** Measures a predicted mechanics field against the optical strain target without collapsing evidence into one score. */
export function calculateMechanicalTargetMetrics(
  target: MechanicalStrainTarget,
  targetField: SampledStrainField,
  predicted: SampledStrainField,
): MechanicalTargetMetrics {
  const targetStart = target.centerM - target.widthM / 2;
  const targetEnd = target.centerM + target.widthM / 2;
  const outside = predicted.samples.filter((sample) => sample.zM < targetStart || sample.zM > targetEnd);
  const troughSamples = predicted.samples.filter((sample) => sample.zM >= targetStart && sample.zM <= targetEnd);
  const minimum = troughSamples.reduce((best, sample) => sample.strain < best.strain ? sample : best, troughSamples[0] ?? predicted.samples[0]);
  const background = mean(outside.map((sample) => sample.strain));
  const excursion = background - minimum.strain;
  const errors = predicted.samples.map((sample) => sample.strain - targetField.sampleStrain(sample.zM));
  const reliefThreshold = target.backgroundStrain - 0.5 * (target.backgroundStrain - target.troughStrain);
  const active = predicted.samples.filter((sample) => sample.strain <= reliefThreshold);
  const startM = active[0]?.zM ?? target.centerM;
  const endM = active.length > 0 ? active[active.length - 1].zM : target.centerM;
  const activeCenterM = active.length > 0 ? mean(active.map((sample) => sample.zM)) : minimum.zM;
  const leak = Math.max(0, ...outside.map((sample) => Math.abs(sample.strain - target.backgroundStrain)));
  const intended = Math.max(1e-12, Math.abs(target.backgroundStrain - target.troughStrain));

  return {
    biasStrainError: background - target.backgroundStrain,
    troughMinimumError: minimum.strain - target.troughStrain,
    strainExcursionError: excursion - (target.backgroundStrain - target.troughStrain),
    centerErrorM: activeCenterM - target.centerM,
    widthErrorM: (endM - startM) - target.widthM,
    transitionWidthErrorM: estimateTransitionWidth(predicted, target) - target.transitionWidthM,
    rmsStrainError: Math.sqrt(mean(errors.map((value) => value ** 2))),
    maxStrainError: Math.max(0, ...errors.map(Math.abs)),
    offTargetStrainDisturbance: leak,
    localizationLengthM: endM - startM,
    crossTalk: leak / intended,
  };
}

function estimateTransitionWidth(field: SampledStrainField, target: MechanicalStrainTarget): number {
  const low = target.troughStrain + 0.1 * (target.backgroundStrain - target.troughStrain);
  const high = target.troughStrain + 0.9 * (target.backgroundStrain - target.troughStrain);
  const right = field.samples.filter((sample) => sample.zM >= target.centerM);
  const lowPoint = right.find((sample) => sample.strain >= low);
  const highPoint = right.find((sample) => sample.strain >= high);
  return lowPoint && highPoint ? Math.max(0, highPoint.zM - lowPoint.zM) : 0;
}

function mean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
