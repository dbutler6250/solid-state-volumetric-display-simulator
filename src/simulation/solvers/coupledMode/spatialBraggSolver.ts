import type { SpectrumPoint } from '../../results/spectrum';
import type { HybridBraggModel, LocalBraggSample } from '../../structures/hybridBraggGrating';
import { sampleHybridBraggModel } from '../../structures/hybridBraggGrating';
import { add, complex, conjugate, divide, magnitudeSquared, multiply, scale, subtract, type Complex } from '../../math/complex';

export type CoupledModePointResult = SpectrumPoint & {
  sampledSegments: LocalBraggSample[];
  spatialField: SpatialCoupledModeFieldSample[];
};

export type SpatialCoupledModeFieldSample = LocalBraggSample & {
  forwardAmplitude: Complex;
  backwardAmplitude: Complex;
  forwardIntensity: number;
  backwardIntensity: number;
  normalizedBackwardIntensity: number;
};

export type CoupledModeSection = {
  couplingCoefficientPerM: number;
  detuningPerM: number;
  lengthM: number;
  phaseRadians?: number;
};

const M_PER_NM = 1e-9;

type ComplexMatrix2 = [[Complex, Complex], [Complex, Complex]];

const identity = (): ComplexMatrix2 => [
  [complex(1), complex(0)],
  [complex(0), complex(1)],
];

const multiplyMatrix = (a: ComplexMatrix2, b: ComplexMatrix2): ComplexMatrix2 => [
  [
    add(multiply(a[0][0], b[0][0]), multiply(a[0][1], b[1][0])),
    add(multiply(a[0][0], b[0][1]), multiply(a[0][1], b[1][1])),
  ],
  [
    add(multiply(a[1][0], b[0][0]), multiply(a[1][1], b[1][0])),
    add(multiply(a[1][0], b[0][1]), multiply(a[1][1], b[1][1])),
  ],
];

/** Solves the forward/backward amplitudes through piecewise-constant Bragg-grating segments. */
export function solveHybridBraggCoupledModePoint(
  model: HybridBraggModel,
  wavelengthNm: number,
): CoupledModePointResult {
  const wavelengthM = wavelengthNm * M_PER_NM;
  const samples = sampleHybridBraggModel(model, wavelengthM);
  const sectionResult = solveCoupledModeSections(samples.map((sample) => ({
    couplingCoefficientPerM: sample.couplingCoefficientPerM,
    detuningPerM: sample.detuningPerM,
    lengthM: sample.lengthM,
    phaseRadians: sample.gratingPhaseRadians,
  })));
  const reflectance = sectionResult.reflectance;
  const spatialField = calculateSpatialField(samples, sectionResult.segmentMatrices, sectionResult.reflectionAmplitude);
  return {
    wavelengthNm,
    reflectance,
    transmission: clampUnitInterval(1 - reflectance),
    sampledSegments: samples,
    spatialField,
  };
}

/** Multiplies exact uniform coupled-mode section propagators for piecewise-constant validation cases. */
export function solveCoupledModeSections(sections: CoupledModeSection[]) {
  const segmentMatrices = sections.map((section) =>
    segmentMatrix(
      getComplexCoupling(section.couplingCoefficientPerM, section.phaseRadians ?? 0),
      section.detuningPerM,
      section.lengthM,
    ),
  );
  const system = segmentMatrices.reduce((matrix, segment) => multiplyMatrix(segment, matrix), identity());
  const reflectionAmplitude = scale(divide(system[1][0], system[1][1]), -1);
  return {
    reflectance: clampUnitInterval(magnitudeSquared(reflectionAmplitude)),
    transmission: clampUnitInterval(1 - magnitudeSquared(reflectionAmplitude)),
    reflectionAmplitude,
    segmentMatrices,
  };
}

/** Evaluates the hybrid grating spectrum for a caller-supplied wavelength list. */
export function solveHybridBraggCoupledModeSpectrum(
  model: HybridBraggModel,
  wavelengthsNm: number[],
): SpectrumPoint[] {
  return wavelengthsNm.map((wavelengthNm) => solveHybridBraggCoupledModePoint(model, wavelengthNm));
}

/** Known uniform, on-resonance limit for the coupled-mode convention used by this solver. */
export function getUniformOnResonanceReflectance(couplingCoefficientPerM: number, lengthM: number): number {
  return Math.tanh(couplingCoefficientPerM * lengthM) ** 2;
}

/** Closed-form lossless uniform-grating reflectance for the solver's kappa/detuning convention. */
export function getUniformReflectance(
  couplingCoefficientPerM: number,
  detuningPerM: number,
  lengthM: number,
): number {
  const kappa = couplingCoefficientPerM;
  const delta = detuningPerM;
  const gammaSquared = kappa ** 2 - delta ** 2;
  if (Math.abs(gammaSquared) < 1e-24) {
    const numerator = (kappa * lengthM) ** 2;
    return clampUnitInterval(numerator / (1 + (delta * lengthM) ** 2));
  }

  if (gammaSquared > 0) {
    const gamma = Math.sqrt(gammaSquared);
    const sinh = Math.sinh(gamma * lengthM);
    const cosh = Math.cosh(gamma * lengthM);
    return clampUnitInterval((kappa ** 2 * sinh ** 2) / (gammaSquared * cosh ** 2 + delta ** 2 * sinh ** 2));
  }

  const qSquared = -gammaSquared;
  const q = Math.sqrt(qSquared);
  const sin = Math.sin(q * lengthM);
  const cos = Math.cos(q * lengthM);
  return clampUnitInterval((kappa ** 2 * sin ** 2) / (qSquared * cos ** 2 + delta ** 2 * sin ** 2));
}

function segmentMatrix(kappa: Complex, detuning: number, lengthM: number): ComplexMatrix2 {
  const gammaSquared = magnitudeSquared(kappa) - detuning ** 2;
  const gamma = sqrtRealToComplex(gammaSquared);
  const argument = scale(gamma, lengthM);
  const cosh = complexCosh(argument);
  const sinhOverGamma =
    magnitudeSquared(gamma) < 1e-30 ? complex(lengthM) : divide(complexSinh(argument), gamma);
  const i = complex(0, 1);
  return [
    [
      add(cosh, multiply(multiply(i, complex(detuning)), sinhOverGamma)),
      multiply(multiply(i, kappa), sinhOverGamma),
    ],
    [
      multiply(multiply(complex(0, -1), conjugate(kappa)), sinhOverGamma),
      subtract(cosh, multiply(multiply(i, complex(detuning)), sinhOverGamma)),
    ],
  ];
}

function calculateSpatialField(
  samples: LocalBraggSample[],
  segmentMatrices: ComplexMatrix2[],
  reflectionAmplitude: Complex,
): SpatialCoupledModeFieldSample[] {
  let prefix = identity();
  const inputState: [Complex, Complex] = [complex(1), reflectionAmplitude];
  const field = samples.map((sample, index) => {
    const halfSegment = segmentMatrix(
      getComplexCoupling(sample.couplingCoefficientPerM, sample.gratingPhaseRadians),
      sample.detuningPerM,
      sample.lengthM / 2,
    );
    const centerState = multiplyMatrixVector(multiplyMatrix(halfSegment, prefix), inputState);
    prefix = multiplyMatrix(segmentMatrices[index], prefix);
    return {
      ...sample,
      forwardAmplitude: centerState[0],
      backwardAmplitude: centerState[1],
      forwardIntensity: magnitudeSquared(centerState[0]),
      backwardIntensity: magnitudeSquared(centerState[1]),
      normalizedBackwardIntensity: 0,
    };
  });
  const maxBackwardIntensity = Math.max(...field.map((sample) => sample.backwardIntensity), 0);
  return field.map((sample) => ({
    ...sample,
    normalizedBackwardIntensity: maxBackwardIntensity > 0 ? sample.backwardIntensity / maxBackwardIntensity : 0,
  }));
}

function multiplyMatrixVector(matrix: ComplexMatrix2, vector: [Complex, Complex]): [Complex, Complex] {
  return [
    add(multiply(matrix[0][0], vector[0]), multiply(matrix[0][1], vector[1])),
    add(multiply(matrix[1][0], vector[0]), multiply(matrix[1][1], vector[1])),
  ];
}

function getComplexCoupling(couplingCoefficientPerM: number, phaseRadians: number): Complex {
  return complex(
    couplingCoefficientPerM * Math.cos(phaseRadians),
    couplingCoefficientPerM * Math.sin(phaseRadians),
  );
}

function sqrtRealToComplex(value: number): Complex {
  return value >= 0 ? complex(Math.sqrt(value)) : complex(0, Math.sqrt(-value));
}

function complexCosh(value: Complex): Complex {
  return complex(Math.cosh(value.re) * Math.cos(value.im), Math.sinh(value.re) * Math.sin(value.im));
}

function complexSinh(value: Complex): Complex {
  return complex(Math.sinh(value.re) * Math.cos(value.im), Math.cosh(value.re) * Math.sin(value.im));
}

function clampUnitInterval(value: number): number {
  return Math.min(1, Math.max(0, value));
}
