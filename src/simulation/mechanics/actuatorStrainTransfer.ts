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

export type StiffnessEngineeringInput = SmoothTroughInput & {
  stiffnessRatio: number;
};

export type IsolationInput = SmoothTroughInput & {
  interfaceCoupling: number;
  edgeLeakageWidthM: number;
};

export type CoupledArrayInput = SmoothTroughInput & {
  zoneCount: number;
  pitchM: number;
  neighborCoupling: number;
  activeZoneIndex: number;
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

/** Models local EA(z) changes under constant axial force, where strain scales inversely with stiffness. */
export function createStiffnessEngineeredField(input: StiffnessEngineeringInput): SampledStrainField {
  const ratio = Math.max(1, input.stiffnessRatio);
  return createSampledField(input.lengthM, input.sampleCount, (zM) => {
    const localStiffening = smoothTopHat(zM - input.centerM, input.widthM, input.transitionWidthM);
    const localRatio = 1 + (ratio - 1) * localStiffening;
    return input.backgroundStrain / localRatio;
  });
}

/** Models a local zone coupled to the host through compliant effective interfaces. */
export function createMechanicallyIsolatedField(input: IsolationInput): SampledStrainField {
  const coupling = Math.min(1, Math.max(0, input.interfaceCoupling));
  return createSampledField(input.lengthM, input.sampleCount, (zM) => {
    const core = smoothTopHat(zM - input.centerM, input.widthM, input.transitionWidthM);
    const distance = Math.max(0, Math.abs(zM - input.centerM) - input.widthM / 2);
    const leakage = Math.exp(-distance / Math.max(1e-12, input.edgeLeakageWidthM));
    const relief = (input.backgroundStrain - input.troughStrain) * core * (1 - coupling * (1 - leakage));
    return input.backgroundStrain - relief;
  });
}

/** Models a small differential actuator array with nearest-neighbor mechanical cross-coupling. */
export function createCoupledDifferentialArrayField(input: CoupledArrayInput): SampledStrainField {
  const count = Math.max(1, Math.round(input.zoneCount));
  const active = Math.min(count - 1, Math.max(0, Math.round(input.activeZoneIndex)));
  const firstCenter = input.centerM - ((count - 1) * input.pitchM) / 2;
  const neighborCoupling = Math.min(1, Math.max(0, input.neighborCoupling));
  return createSampledField(input.lengthM, input.sampleCount, (zM) => {
    let strain = input.backgroundStrain;
    for (let index = 0; index < count; index += 1) {
      const distance = Math.abs(index - active);
      const drive = distance === 0 ? 1 : distance === 1 ? neighborCoupling : neighborCoupling ** distance;
      const center = firstCenter + index * input.pitchM;
      strain += input.actuatorFreeStrain * drive * smoothTopHat(zM - center, input.widthM, input.transitionWidthM);
    }
    return strain;
  });
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
