import type { BraggReflectorInputs, SimulationResult } from '../../types/simulation';
import type { LayerStack } from '../layers/stack';
import { add, complex, divide, magnitudeSquared, multiply, scale, subtract } from '../math/complex';
import { identityMatrix2, multiplyMatrix2, type Matrix2 } from '../math/matrix2';
import { buildBraggReflectorStack } from '../structures/braggReflector';
import { validateBraggReflectorInputs } from '../validation/braggReflectorValidation';

const DEGREES_TO_RADIANS = Math.PI / 180;

type SolveLayerStackOptions = {
  wavelengthNm: number;
  incidentAngleDegrees: number;
  polarization: BraggReflectorInputs['polarization'];
};

type LayerStackPointResult = {
  wavelengthNm: number;
  reflectance: number;
  transmission: number;
};

type SweepSettings = {
  startNm: number;
  endNm: number;
  pointCount: number;
};

const getSweepSettings = (inputs: BraggReflectorInputs): SweepSettings => ({
  startNm: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
  endNm: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
  pointCount: inputs.wavelengthPointCount ?? 500,
});

const assertValidInputs = (inputs: BraggReflectorInputs) => {
  const issues = validateBraggReflectorInputs(inputs);

  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join(' '));
  }
};

const getLayerCosine = (
  incidentIndex: number,
  layerIndex: number,
  incidentAngleRadians: number,
): number => {
  const sinTheta = (incidentIndex / layerIndex) * Math.sin(incidentAngleRadians);
  const cosineSquared = 1 - sinTheta * sinTheta;

  if (cosineSquared < -1e-12) {
    throw new Error('Total internal reflection with real-valued indices is not supported yet.');
  }

  return Math.sqrt(Math.max(0, cosineSquared));
};

const getOpticalAdmittance = (
  refractiveIndex: number,
  cosTheta: number,
  polarization: BraggReflectorInputs['polarization'],
): number => {
  if (polarization === 'TE') {
    return refractiveIndex * cosTheta;
  }

  return refractiveIndex / cosTheta;
};

const getLayerMatrix = (
  refractiveIndex: number,
  thicknessNm: number,
  wavelengthNm: number,
  cosTheta: number,
  admittance: number,
): Matrix2 => {
  const phaseThickness = (2 * Math.PI * refractiveIndex * thicknessNm * cosTheta) / wavelengthNm;
  const cosPhase = Math.cos(phaseThickness);
  const sinPhase = Math.sin(phaseThickness);

  return [
    [complex(cosPhase), complex(0, sinPhase / admittance)],
    [complex(0, admittance * sinPhase), complex(cosPhase)],
  ];
};

export function solveLayerStack(
  stack: LayerStack,
  options: SolveLayerStackOptions,
): LayerStackPointResult {
  const incidentAngleRadians = options.incidentAngleDegrees * DEGREES_TO_RADIANS;
  const incidentIndex = stack.incidentMedium.refractiveIndex;
  const incidentCosine = Math.cos(incidentAngleRadians);
  const exitCosine = getLayerCosine(
    incidentIndex,
    stack.exitMedium.refractiveIndex,
    incidentAngleRadians,
  );
  const incidentAdmittance = getOpticalAdmittance(
    incidentIndex,
    incidentCosine,
    options.polarization,
  );
  const exitAdmittance = getOpticalAdmittance(
    stack.exitMedium.refractiveIndex,
    exitCosine,
    options.polarization,
  );

  const systemMatrix = stack.layers.reduce((matrix, layer) => {
    const refractiveIndex = layer.material.refractiveIndex;
    const cosTheta = getLayerCosine(incidentIndex, refractiveIndex, incidentAngleRadians);
    const admittance = getOpticalAdmittance(refractiveIndex, cosTheta, options.polarization);
    const layerMatrix = getLayerMatrix(
      refractiveIndex,
      layer.thicknessNm,
      options.wavelengthNm,
      cosTheta,
      admittance,
    );

    return multiplyMatrix2(matrix, layerMatrix);
  }, identityMatrix2());

  const m11 = systemMatrix[0][0];
  const m12 = systemMatrix[0][1];
  const m21 = systemMatrix[1][0];
  const m22 = systemMatrix[1][1];
  const exitAdmittanceComplex = complex(exitAdmittance);
  const incidentAdmittanceComplex = complex(incidentAdmittance);
  const fieldB = add(m11, multiply(m12, exitAdmittanceComplex));
  const fieldC = add(m21, multiply(m22, exitAdmittanceComplex));
  const denominator = add(multiply(incidentAdmittanceComplex, fieldB), fieldC);
  const reflectionAmplitude = divide(
    subtract(multiply(incidentAdmittanceComplex, fieldB), fieldC),
    denominator,
  );
  const transmissionAmplitude = divide(scale(incidentAdmittanceComplex, 2), denominator);
  const reflectance = magnitudeSquared(reflectionAmplitude);
  const transmission =
    (exitAdmittance / incidentAdmittance) * magnitudeSquared(transmissionAmplitude);

  return {
    wavelengthNm: options.wavelengthNm,
    reflectance: clampUnitInterval(reflectance),
    transmission: clampUnitInterval(transmission),
  };
}

const clampUnitInterval = (value: number): number => Math.min(1, Math.max(0, value));

const createWavelengthSweep = ({ startNm, endNm, pointCount }: SweepSettings): number[] => {
  if (startNm <= 0 || endNm <= startNm) {
    throw new Error('Wavelength sweep must have a positive start and an end greater than start.');
  }

  if (pointCount < 2 || !Number.isInteger(pointCount)) {
    throw new Error('Wavelength sweep must include at least two integer points.');
  }

  const step = (endNm - startNm) / (pointCount - 1);

  return Array.from({ length: pointCount }, (_, index) => startNm + step * index);
};

const findHalfMaximumBand = (
  spectrum: LayerStackPointResult[],
  peakIndex: number,
  halfPeakReflectance: number,
): [number, number] | null => {
  let lowerIndex = peakIndex;
  let upperIndex = peakIndex;

  while (lowerIndex > 0 && spectrum[lowerIndex - 1].reflectance >= halfPeakReflectance) {
    lowerIndex -= 1;
  }

  while (
    upperIndex < spectrum.length - 1 &&
    spectrum[upperIndex + 1].reflectance >= halfPeakReflectance
  ) {
    upperIndex += 1;
  }

  if (lowerIndex === upperIndex) {
    return null;
  }

  return [spectrum[lowerIndex].wavelengthNm, spectrum[upperIndex].wavelengthNm];
};

const calculateMetrics = (
  spectrum: LayerStackPointResult[],
): Pick<
  SimulationResult,
  'peakReflectance' | 'centerWavelengthNm' | 'bandwidthNm' | 'maxEnergyConservationError'
> => {
  const peakIndex = spectrum.reduce(
    (bestIndex, point, index, points) =>
      point.reflectance > points[bestIndex].reflectance ? index : bestIndex,
    0,
  );
  const peak = spectrum[peakIndex];
  const halfPeakReflectance = peak.reflectance / 2;
  const halfMaximumBand = findHalfMaximumBand(spectrum, peakIndex, halfPeakReflectance);
  const maxEnergyConservationError = spectrum.reduce(
    (worstError, point) =>
      Math.max(worstError, Math.abs(point.reflectance + point.transmission - 1)),
    0,
  );

  if (!halfMaximumBand) {
    return {
      peakReflectance: peak.reflectance,
      centerWavelengthNm: peak.wavelengthNm,
      bandwidthNm: 0,
      maxEnergyConservationError,
    };
  }

  const [lowerEdge, upperEdge] = halfMaximumBand;

  return {
    peakReflectance: peak.reflectance,
    centerWavelengthNm: (lowerEdge + upperEdge) / 2,
    bandwidthNm: upperEdge - lowerEdge,
    maxEnergyConservationError,
  };
};

export function solveBraggReflector(inputs: BraggReflectorInputs): SimulationResult {
  assertValidInputs(inputs);

  const stack = buildBraggReflectorStack(inputs);
  const wavelengths = createWavelengthSweep(getSweepSettings(inputs));
  const spectrum = wavelengths.map((wavelengthNm) =>
    solveLayerStack(stack, {
      wavelengthNm,
      incidentAngleDegrees: inputs.incidentAngleDegrees,
      polarization: inputs.polarization,
    }),
  );
  const metrics = calculateMetrics(spectrum);

  return {
    spectrum,
    ...metrics,
  };
}
