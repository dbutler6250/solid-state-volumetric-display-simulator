export type SampledStrainField = {
  lengthM: number;
  samples: Array<{ zM: number; strain: number }>;
  sampleStrain: (zM: number) => number;
};

export type SmoothTroughInput = {
  lengthM: number;
  centerM: number;
  widthM: number;
  transitionWidthM: number;
  backgroundStrain: number;
  troughStrain: number;
  sampleCount?: number;
};

export type ShearLagInput = SmoothTroughInput & {
  transferLengthM: number;
  actuatorFreeStrain: number;
};

const DEFAULT_SAMPLE_COUNT = 801;

/** Creates the ideal optical strain-trough target as a reusable sampled field. */
export function createSmoothTroughField(input: SmoothTroughInput): SampledStrainField {
  return createSampledField(input.lengthM, input.sampleCount, (zM) => {
    const relief = input.backgroundStrain - input.troughStrain;
    return input.backgroundStrain - relief * smoothTopHat(zM - input.centerM, input.widthM, input.transitionWidthM);
  });
}

/** Creates a bonded-actuator host strain field using a single interpretable shear-transfer length. */
export function createShearLagCounterStrainField(input: ShearLagInput): SampledStrainField {
  return createSampledField(input.lengthM, input.sampleCount, (zM) => {
    const distance = Math.abs(zM - input.centerM);
    const halfWidth = input.widthM / 2;
    const transferLength = Math.max(1e-12, input.transferLengthM);
    const plateau = smoothTopHat(zM - input.centerM, input.widthM, input.transitionWidthM);
    const edgeLeakage = distance > halfWidth
      ? Math.exp(-(distance - halfWidth) / transferLength)
      : 1;
    return input.backgroundStrain + input.actuatorFreeStrain * plateau * edgeLeakage;
  });
}

/** Creates a constant-preload field with a localized eigenstrain contribution. */
export function createLocalizedEigenstrainField(input: SmoothTroughInput & { eigenstrain: number; transfer?: number }): SampledStrainField {
  const transfer = input.transfer ?? 1;
  return createSampledField(input.lengthM, input.sampleCount, (zM) =>
    input.backgroundStrain + input.eigenstrain * transfer * smoothTopHat(zM - input.centerM, input.widthM, input.transitionWidthM));
}

/** Creates a uniform field; a 1D local end force cannot localize axial strain in a continuous bar. */
export function createUniformField(lengthM: number, strain: number, sampleCount = DEFAULT_SAMPLE_COUNT): SampledStrainField {
  return createSampledField(lengthM, sampleCount, () => strain);
}

function createSampledField(lengthM: number, sampleCount = DEFAULT_SAMPLE_COUNT, sampler: (zM: number) => number): SampledStrainField {
  const count = Math.max(2, Math.round(sampleCount));
  const samples = Array.from({ length: count }, (_, index) => {
    const zM = (lengthM * index) / (count - 1);
    return { zM, strain: sampler(zM) };
  });
  return {
    lengthM,
    samples,
    sampleStrain: (zM) => interpolate(samples, Math.min(lengthM, Math.max(0, zM))),
  };
}

function interpolate(samples: Array<{ zM: number; strain: number }>, zM: number): number {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (zM <= first.zM) return first.strain;
  if (zM >= last.zM) return last.strain;
  const step = (last.zM - first.zM) / (samples.length - 1);
  const leftIndex = Math.min(samples.length - 2, Math.max(0, Math.floor((zM - first.zM) / step)));
  const left = samples[leftIndex];
  const right = samples[leftIndex + 1];
  const fraction = right.zM > left.zM ? (zM - left.zM) / (right.zM - left.zM) : 0;
  return left.strain + (right.strain - left.strain) * fraction;
}

function smoothTopHat(distanceM: number, widthM: number, transitionWidthM: number): number {
  if (widthM <= 0) return 0;
  const halfCore = widthM / 2;
  const edge = Math.max(0, transitionWidthM);
  const absolute = Math.abs(distanceM);
  if (absolute <= halfCore) return 1;
  if (edge <= 0 || absolute >= halfCore + edge) return 0;
  const x = (absolute - halfCore) / edge;
  return 0.5 * (1 + Math.cos(Math.PI * x));
}
