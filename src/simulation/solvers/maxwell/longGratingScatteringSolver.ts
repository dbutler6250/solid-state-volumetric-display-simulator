import type { HybridBraggDesignInputs } from '../../../types/simulation';
import {
  add,
  complex,
  divide,
  magnitudeSquared,
  multiply,
  subtract,
  type Complex,
} from '../../math/complex';
import { sampleStrainField } from '../../perturbations/strainField';
import { applyMaterialStrainResponse } from '../../responses/strainOpticResponse';
import { createHybridBraggModel } from '../../structures/hybridBraggGrating';

export type ScatteringMatrix = {
  rLeft: Complex;
  tLeftRight: Complex;
  tRightLeft: Complex;
  rRight: Complex;
};

export type SinusoidalGratingCell = {
  averageIndex: number;
  indexModulation: number;
  periodM: number;
  phaseRadians: number;
  samplesPerPeriod: number;
};

export type LayerSlice = {
  refractiveIndex: number;
  thicknessM: number;
};

export type MaxwellPointResult = {
  wavelengthNm: number;
  reflectance: number;
  transmission: number;
  energyError: number;
};

export type MaxwellFieldSample = {
  zM: number;
  lengthM: number;
  refractiveIndex: number;
  forwardAmplitude: Complex;
  backwardAmplitude: Complex;
  totalAmplitude: Complex;
  forwardIntensity: number;
  backwardIntensity: number;
  totalIntensity: number;
  forwardFlux: number;
  backwardFlux: number;
  normalizedBackwardIntensity: number;
};

export type MaxwellFieldResult = MaxwellPointResult & {
  reflectionAmplitude: Complex;
  samples: MaxwellFieldSample[];
};

export type HybridMaxwellOptions = {
  samplesPerPeriod: number;
  envelopeBlocks: number;
};

export type HybridMaxwellStrainSample = {
  sampleStrain: (zM: number) => number;
};

export type LocallyPeriodicBlock = {
  averageIndex: number;
  indexModulation: number;
  periodM: number;
  lengthM: number;
  phaseRadians: number;
  samplesPerPeriod: number;
};

const ZERO = complex(0);
const ONE = complex(1);

/** Returns the identity two-port used by Redheffer composition. */
export function identityScattering(): ScatteringMatrix {
  return {
    rLeft: ZERO,
    tLeftRight: ONE,
    tRightLeft: ONE,
    rRight: ZERO,
  };
}

/**
 * Cascades two scalar 1D scattering matrices using the Redheffer star product.
 * This avoids multiplying long transfer-matrix chains whose intermediate
 * amplitudes can overflow inside Bragg stop bands.
 */
export function composeScattering(left: ScatteringMatrix, right: ScatteringMatrix): ScatteringMatrix {
  const denominator = subtract(ONE, multiply(right.rLeft, left.rRight));
  return {
    rLeft: add(
      left.rLeft,
      divide(multiply(multiply(left.tRightLeft, right.rLeft), left.tLeftRight), denominator),
    ),
    tLeftRight: divide(multiply(right.tLeftRight, left.tLeftRight), denominator),
    tRightLeft: divide(multiply(left.tRightLeft, right.tRightLeft), denominator),
    rRight: add(
      right.rRight,
      divide(multiply(multiply(right.tLeftRight, left.rRight), right.tRightLeft), denominator),
    ),
  };
}

/** Repeats a stable two-port block with binary exponentiation. */
export function repeatScattering(block: ScatteringMatrix, count: number): ScatteringMatrix {
  if (!Number.isInteger(count) || count < 0) throw new Error('Repeat count must be a non-negative integer.');
  let result = identityScattering();
  let power = block;
  let remaining = count;
  while (remaining > 0) {
    if (remaining % 2 === 1) result = composeScattering(result, power);
    power = composeScattering(power, power);
    remaining = Math.floor(remaining / 2);
  }
  return result;
}

/** Builds high-resolution layer slices for one sinusoidal microscopic period. */
export function buildSinusoidalUnitCell(cell: SinusoidalGratingCell): LayerSlice[] {
  const samples = Math.max(1, Math.round(cell.samplesPerPeriod));
  const thicknessM = cell.periodM / samples;
  return Array.from({ length: samples }, (_, index) => {
    const phase = cell.phaseRadians + (2 * Math.PI * (index + 0.5)) / samples;
    return {
      refractiveIndex: cell.averageIndex + cell.indexModulation * Math.cos(phase),
      thicknessM,
    };
  });
}

/** Solves an arbitrary normal-incidence lossless layer list with scattering composition. */
export function solveScatteringLayers(
  layers: LayerSlice[],
  wavelengthNm: number,
  incidentIndex: number,
  exitIndex = incidentIndex,
): MaxwellPointResult {
  const scattering = solveLayerScattering(layers, wavelengthNm, incidentIndex, exitIndex);

  const reflectance = clampUnitInterval(magnitudeSquared(scattering.rLeft));
  const transmission = clampUnitInterval((exitIndex / incidentIndex) * magnitudeSquared(scattering.tLeftRight));
  return {
    wavelengthNm,
    reflectance,
    transmission,
    energyError: Math.abs(reflectance + transmission - 1),
  };
}

/**
 * Reconstructs internal forward/backward Maxwell fields from prefix/suffix
 * scattering states at layer centers. Intensities are field-amplitude squared;
 * flux values include the local refractive-index factor.
 */
export function reconstructScatteringLayerFields(
  layers: LayerSlice[],
  wavelengthNm: number,
  incidentIndex: number,
  exitIndex = incidentIndex,
): MaxwellFieldResult {
  const scattering = solveLayerScattering(layers, wavelengthNm, incidentIndex, exitIndex);
  const suffixAtCenter = buildSuffixScatteringAtCenters(layers, wavelengthNm, exitIndex);
  let prefix = identityScattering();
  let previousIndex = incidentIndex;
  let zM = 0;
  const samples: MaxwellFieldSample[] = layers.map((layer, index) => {
    const leftHalf = composeScattering(
      interfaceScattering(previousIndex, layer.refractiveIndex),
      propagationScattering(layer.refractiveIndex, layer.thicknessM / 2, wavelengthNm),
    );
    const prefixAtCenter = composeScattering(prefix, leftHalf);
    const rightReflection = suffixAtCenter[index].rLeft;
    const denominator = subtract(ONE, multiply(prefixAtCenter.rRight, rightReflection));
    const forwardAmplitude = divide(prefixAtCenter.tLeftRight, denominator);
    const backwardAmplitude = multiply(rightReflection, forwardAmplitude);
    const totalAmplitude = add(forwardAmplitude, backwardAmplitude);
    const forwardIntensity = magnitudeSquared(forwardAmplitude);
    const backwardIntensity = magnitudeSquared(backwardAmplitude);
    const centerZM = zM + layer.thicknessM / 2;

    prefix = composeScattering(
      prefix,
      composeScattering(
        interfaceScattering(previousIndex, layer.refractiveIndex),
        propagationScattering(layer.refractiveIndex, layer.thicknessM, wavelengthNm),
      ),
    );
    previousIndex = layer.refractiveIndex;
    zM += layer.thicknessM;

    return {
      zM: centerZM,
      lengthM: layer.thicknessM,
      refractiveIndex: layer.refractiveIndex,
      forwardAmplitude,
      backwardAmplitude,
      totalAmplitude,
      forwardIntensity,
      backwardIntensity,
      totalIntensity: magnitudeSquared(totalAmplitude),
      forwardFlux: layer.refractiveIndex * forwardIntensity,
      backwardFlux: layer.refractiveIndex * backwardIntensity,
      normalizedBackwardIntensity: 0,
    };
  });

  const maxBackwardIntensity = samples.reduce(
    (maximum, sample) => Math.max(maximum, sample.backwardIntensity),
    0,
  );
  const normalizedSamples = samples.map((sample) => ({
    ...sample,
    normalizedBackwardIntensity: maxBackwardIntensity > 0 ? sample.backwardIntensity / maxBackwardIntensity : 0,
  }));
  return {
    wavelengthNm,
    reflectance: clampUnitInterval(magnitudeSquared(scattering.rLeft)),
    transmission: clampUnitInterval((exitIndex / incidentIndex) * magnitudeSquared(scattering.tLeftRight)),
    energyError: Math.abs(
      clampUnitInterval(magnitudeSquared(scattering.rLeft)) +
        clampUnitInterval((exitIndex / incidentIndex) * magnitudeSquared(scattering.tLeftRight)) -
        1,
    ),
    reflectionAmplitude: scattering.rLeft,
    samples: normalizedSamples,
  };
}

/** Reconstructs internal fields for the explicit canonical hybrid-grating Maxwell discretization. */
export function reconstructHybridBraggMaxwellFields(
  design: HybridBraggDesignInputs,
  wavelengthNm: number,
  options: HybridMaxwellOptions,
): MaxwellFieldResult {
  return reconstructScatteringLayerFields(
    buildHybridBraggMaxwellLayers(design, options),
    wavelengthNm,
    design.averageIndex,
    design.averageIndex,
  );
}

/** Reconstructs Maxwell fields from an externally generated strain field without refitting it to UI parameters. */
export function reconstructHybridBraggMaxwellFieldsFromStrain(
  design: HybridBraggDesignInputs,
  wavelengthNm: number,
  options: HybridMaxwellOptions,
  strain: HybridMaxwellStrainSample,
): MaxwellFieldResult {
  return reconstructScatteringLayerFields(
    buildHybridBraggMaxwellLayersFromStrain(design, options, strain),
    wavelengthNm,
    design.averageIndex,
    design.averageIndex,
  );
}

/** Solves repeated identical unit cells without materializing every optical slice. */
export function solveRepeatedUnitCell(
  cell: SinusoidalGratingCell,
  repeatCount: number,
  wavelengthNm: number,
  incidentIndex = cell.averageIndex,
): MaxwellPointResult {
  const cellScattering = solveInternalBlock(buildSinusoidalUnitCell(cell), wavelengthNm, incidentIndex, incidentIndex);
  const repeated = repeatScattering(cellScattering, repeatCount);
  const reflectance = clampUnitInterval(magnitudeSquared(repeated.rLeft));
  const transmission = clampUnitInterval(magnitudeSquared(repeated.tLeftRight));
  return {
    wavelengthNm,
    reflectance,
    transmission,
    energyError: Math.abs(reflectance + transmission - 1),
  };
}

/** Builds a phase-continuous partial sinusoidal period without rounding its physical length. */
export function buildSinusoidalPartialPeriod(
  cell: Omit<SinusoidalGratingCell, 'samplesPerPeriod'>,
  fraction: number,
  samplesPerPeriod: number,
): LayerSlice[] {
  const boundedFraction = Math.min(1, Math.max(0, fraction));
  if (boundedFraction === 0) return [];
  const samples = Math.max(1, Math.ceil(samplesPerPeriod * boundedFraction));
  const thicknessM = (cell.periodM * boundedFraction) / samples;
  return Array.from({ length: samples }, (_, index) => {
    const phase = cell.phaseRadians + (2 * Math.PI * boundedFraction * (index + 0.5)) / samples;
    return {
      refractiveIndex: cell.averageIndex + cell.indexModulation * Math.cos(phase),
      thicknessM,
    };
  });
}

/** Solves one locally uniform block as repeated full periods plus an exact-length partial tail. */
export function solveLocallyPeriodicBlock(
  block: LocallyPeriodicBlock,
  wavelengthNm: number,
  incidentIndex = block.averageIndex,
): MaxwellPointResult {
  const scattering = solveLocallyPeriodicBlockScattering(block, wavelengthNm, incidentIndex);
  const reflectance = clampUnitInterval(magnitudeSquared(scattering.rLeft));
  const transmission = clampUnitInterval(magnitudeSquared(scattering.tLeftRight));
  return {
    wavelengthNm,
    reflectance,
    transmission,
    energyError: Math.abs(reflectance + transmission - 1),
  };
}

/** Builds an explicit high-resolution layer chain for a single locally uniform block. */
export function buildExplicitLocallyPeriodicBlockLayers(block: LocallyPeriodicBlock): LayerSlice[] {
  const phaseSpanRadians = (2 * Math.PI * block.lengthM) / block.periodM;
  const sliceCount = Math.max(1, Math.ceil((phaseSpanRadians / (2 * Math.PI)) * block.samplesPerPeriod));
  const thicknessM = block.lengthM / sliceCount;
  return Array.from({ length: sliceCount }, (_, index) => {
    const phase = block.phaseRadians + (phaseSpanRadians * (index + 0.5)) / sliceCount;
    return {
      refractiveIndex: block.averageIndex + block.indexModulation * Math.cos(phase),
      thicknessM,
    };
  });
}

/** Samples the canonical strained hybrid grating into continuous-phase Maxwell layers. */
export function buildHybridBraggMaxwellLayers(
  design: HybridBraggDesignInputs,
  options: HybridMaxwellOptions,
): LayerSlice[] {
  const model = createHybridBraggModel(design);
  return buildHybridBraggMaxwellLayersFromStrain(design, options, {
    sampleStrain: (zM) => sampleStrainField(model.strain, zM),
  });
}

/** Samples a phase-continuous Maxwell layer chain from an actual mechanical strain sampler. */
export function buildHybridBraggMaxwellLayersFromStrain(
  design: HybridBraggDesignInputs,
  options: HybridMaxwellOptions,
  strain: HybridMaxwellStrainSample,
): LayerSlice[] {
  const model = createHybridBraggModel(design);
  const lengthM = model.grating.lengthM;
  const nominalPeriodM = design.gratingPeriodNm * 1e-9;
  const opticalSliceCount = Math.ceil((lengthM / nominalPeriodM) * Math.max(1, options.samplesPerPeriod));
  const blockSliceCount = Math.max(1, Math.round(options.envelopeBlocks)) * Math.max(1, options.samplesPerPeriod);
  const sliceCount = Math.max(1, Math.max(opticalSliceCount, blockSliceCount));
  const thicknessM = lengthM / sliceCount;
  const layers: LayerSlice[] = [];
  let phaseRadians = design.gratingPhaseRadians;

  for (let index = 0; index < sliceCount; index += 1) {
    const zM = (index + 0.5) * thicknessM;
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain.sampleStrain(zM));
    const layerPhase = phaseRadians + (Math.PI * thicknessM) / local.periodM;
    phaseRadians += (2 * Math.PI * thicknessM) / local.periodM;
    layers.push({
      refractiveIndex: local.averageIndex + design.indexModulation * Math.cos(layerPhase),
      thicknessM,
    });
  }

  return layers;
}

/** Solves the canonical hybrid grating with phase-continuous locally periodic mechanical blocks. */
export function solveHybridBraggMaxwellLocallyPeriodicPoint(
  design: HybridBraggDesignInputs,
  wavelengthNm: number,
  options: HybridMaxwellOptions,
): MaxwellPointResult {
  const model = createHybridBraggModel(design);
  const blockCount = Math.max(1, Math.round(options.envelopeBlocks));
  const blockLengthM = model.grating.lengthM / blockCount;
  let scattering = identityScattering();
  let phaseRadians = design.gratingPhaseRadians;

  for (let index = 0; index < blockCount; index += 1) {
    const startM = index * blockLengthM;
    const zM = startM + blockLengthM / 2;
    const strain = sampleStrainField(model.strain, zM);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
    const block: LocallyPeriodicBlock = {
      averageIndex: local.averageIndex,
      indexModulation: design.indexModulation,
      periodM: local.periodM,
      lengthM: blockLengthM,
      phaseRadians,
      samplesPerPeriod: options.samplesPerPeriod,
    };
    scattering = composeScattering(scattering, solveLocallyPeriodicBlockScattering(block, wavelengthNm, design.averageIndex));
    phaseRadians += (2 * Math.PI * blockLengthM) / local.periodM;
  }

  const reflectance = clampUnitInterval(magnitudeSquared(scattering.rLeft));
  const transmission = clampUnitInterval(magnitudeSquared(scattering.tLeftRight));
  return {
    wavelengthNm,
    reflectance,
    transmission,
    energyError: Math.abs(reflectance + transmission - 1),
  };
}

/** Solves the canonical hybrid grating with the independent Maxwell scattering path. */
export function solveHybridBraggMaxwellPoint(
  design: HybridBraggDesignInputs,
  wavelengthNm: number,
  options: HybridMaxwellOptions,
): MaxwellPointResult {
  return solveScatteringLayers(
    buildHybridBraggMaxwellLayers(design, options),
    wavelengthNm,
    design.averageIndex,
    design.averageIndex,
  );
}

function solveLocallyPeriodicBlockScattering(
  block: LocallyPeriodicBlock,
  wavelengthNm: number,
  incidentIndex: number,
): ScatteringMatrix {
  const periods = block.lengthM / block.periodM;
  const fullPeriods = Math.floor(periods);
  const fractionalPeriod = periods - fullPeriods;
  const cellScattering = solveInternalBlock(
    buildSinusoidalUnitCell(block),
    wavelengthNm,
    incidentIndex,
    incidentIndex,
  );
  const repeated = repeatScattering(cellScattering, fullPeriods);
  const tailPhase = block.phaseRadians + fullPeriods * 2 * Math.PI;
  const tail = solveInternalBlock(
    buildSinusoidalPartialPeriod({ ...block, phaseRadians: tailPhase }, fractionalPeriod, block.samplesPerPeriod),
    wavelengthNm,
    incidentIndex,
    incidentIndex,
  );
  return composeScattering(repeated, tail);
}

function solveInternalBlock(
  layers: LayerSlice[],
  wavelengthNm: number,
  incidentIndex: number,
  exitIndex: number,
): ScatteringMatrix {
  return solveLayerScattering(layers, wavelengthNm, incidentIndex, exitIndex);
}

function solveLayerScattering(
  layers: LayerSlice[],
  wavelengthNm: number,
  incidentIndex: number,
  exitIndex: number,
): ScatteringMatrix {
  let scattering = identityScattering();
  let previousIndex = incidentIndex;
  for (const layer of layers) {
    scattering = composeScattering(scattering, interfaceScattering(previousIndex, layer.refractiveIndex));
    scattering = composeScattering(scattering, propagationScattering(layer.refractiveIndex, layer.thicknessM, wavelengthNm));
    previousIndex = layer.refractiveIndex;
  }
  return composeScattering(scattering, interfaceScattering(previousIndex, exitIndex));
}

function buildSuffixScatteringAtCenters(
  layers: LayerSlice[],
  wavelengthNm: number,
  exitIndex: number,
): ScatteringMatrix[] {
  const suffixes: ScatteringMatrix[] = new Array(layers.length);
  let suffixFromRightEdge = identityScattering();
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    const nextIndex = layers[index + 1]?.refractiveIndex ?? exitIndex;
    const rightHalfToExit = composeScattering(
      propagationScattering(layer.refractiveIndex, layer.thicknessM / 2, wavelengthNm),
      composeScattering(interfaceScattering(layer.refractiveIndex, nextIndex), suffixFromRightEdge),
    );
    suffixes[index] = rightHalfToExit;
    suffixFromRightEdge = composeScattering(
      propagationScattering(layer.refractiveIndex, layer.thicknessM, wavelengthNm),
      composeScattering(interfaceScattering(layer.refractiveIndex, nextIndex), suffixFromRightEdge),
    );
  }
  return suffixes;
}

function interfaceScattering(leftIndex: number, rightIndex: number): ScatteringMatrix {
  const denominator = leftIndex + rightIndex;
  return {
    rLeft: complex((leftIndex - rightIndex) / denominator),
    tLeftRight: complex((2 * leftIndex) / denominator),
    tRightLeft: complex((2 * rightIndex) / denominator),
    rRight: complex((rightIndex - leftIndex) / denominator),
  };
}

function propagationScattering(refractiveIndex: number, thicknessM: number, wavelengthNm: number): ScatteringMatrix {
  const phaseRadians = (2 * Math.PI * refractiveIndex * thicknessM) / (wavelengthNm * 1e-9);
  const phase = expI(phaseRadians);
  return {
    rLeft: ZERO,
    tLeftRight: phase,
    tRightLeft: phase,
    rRight: ZERO,
  };
}

function expI(phaseRadians: number): Complex {
  return complex(Math.cos(phaseRadians), Math.sin(phaseRadians));
}

function clampUnitInterval(value: number): number {
  return Math.min(1, Math.max(0, value));
}
