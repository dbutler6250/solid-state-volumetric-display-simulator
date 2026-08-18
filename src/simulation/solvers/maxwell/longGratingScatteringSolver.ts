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

export type HybridMaxwellOptions = {
  samplesPerPeriod: number;
  envelopeBlocks: number;
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
  let scattering = identityScattering();
  let previousIndex = incidentIndex;
  for (const layer of layers) {
    scattering = composeScattering(scattering, interfaceScattering(previousIndex, layer.refractiveIndex));
    scattering = composeScattering(scattering, propagationScattering(layer.refractiveIndex, layer.thicknessM, wavelengthNm));
    previousIndex = layer.refractiveIndex;
  }
  scattering = composeScattering(scattering, interfaceScattering(previousIndex, exitIndex));

  const reflectance = clampUnitInterval(magnitudeSquared(scattering.rLeft));
  const transmission = clampUnitInterval((exitIndex / incidentIndex) * magnitudeSquared(scattering.tLeftRight));
  return {
    wavelengthNm,
    reflectance,
    transmission,
    energyError: Math.abs(reflectance + transmission - 1),
  };
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

/** Samples the canonical strained hybrid grating into continuous-phase Maxwell layers. */
export function buildHybridBraggMaxwellLayers(
  design: HybridBraggDesignInputs,
  options: HybridMaxwellOptions,
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
    const strain = sampleStrainField(model.strain, zM);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
    const layerPhase = phaseRadians + (Math.PI * thicknessM) / local.periodM;
    phaseRadians += (2 * Math.PI * thicknessM) / local.periodM;
    layers.push({
      refractiveIndex: local.averageIndex + design.indexModulation * Math.cos(layerPhase),
      thicknessM,
    });
  }

  return layers;
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

function solveInternalBlock(
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
