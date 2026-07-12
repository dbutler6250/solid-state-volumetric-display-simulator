import type {
  ParameterSweepResult,
  ParameterSweepSettings,
  QuarterWaveStackInputs,
  SimulationResult,
} from '../../types/simulation';
import type { LayerStack } from '../layers/stack';
import { add, complex, divide, magnitudeSquared, multiply, scale, subtract } from '../math/complex';
import { identityMatrix2, multiplyMatrix2, type Matrix2 } from '../math/matrix2';
import { buildQuarterWaveStack } from '../structures/quarterWaveStack';
import { validateQuarterWaveStackInputs } from '../validation/quarterWaveStackValidation';

const DEGREES_TO_RADIANS = Math.PI / 180;

type SolveLayerStackOptions = {
  wavelengthNm: number;
  incidentAngleDegrees: number;
  polarization: QuarterWaveStackInputs['polarization'];
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
  requiredWavelengthNm?: number;
};

const getSweepSettings = (inputs: QuarterWaveStackInputs): SweepSettings => ({
  startNm: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
  endNm: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
  pointCount: inputs.wavelengthPointCount ?? 500,
});

/** Validates the input bundle before any solver work begins. */
const assertValidInputs = (inputs: QuarterWaveStackInputs) => {
  const issues = validateQuarterWaveStackInputs(inputs);
  if (issues.length > 0) throw new Error(issues.map((issue) => issue.message).join(' '));
};

/** Computes the propagation angle inside a layer using Snell's law. */
const getLayerCosine = (incidentIndex: number, layerIndex: number, incidentAngleRadians: number) => {
  const sinTheta = (incidentIndex / layerIndex) * Math.sin(incidentAngleRadians);
  const cosineSquared = 1 - sinTheta * sinTheta;
  if (cosineSquared < -1e-12) throw new Error('Total internal reflection with real-valued indices is not supported yet.');
  return Math.sqrt(Math.max(0, cosineSquared));
};

/** Converts refractive index and angle into the TE/TM optical admittance. */
const getOpticalAdmittance = (
  refractiveIndex: number,
  cosTheta: number,
  polarization: QuarterWaveStackInputs['polarization'],
): number => (polarization === 'TE' ? refractiveIndex * cosTheta : refractiveIndex / cosTheta);

/** Builds the characteristic matrix for one homogeneous layer. */
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

/** Solves one stack at a single wavelength and incident angle. */
export function solveLayerStack(stack: LayerStack, options: SolveLayerStackOptions) {
  const incidentAngleRadians = options.incidentAngleDegrees * DEGREES_TO_RADIANS;
  const incidentIndex = stack.incidentMedium.refractiveIndex;
  const incidentCosine = Math.cos(incidentAngleRadians);
  const exitCosine = getLayerCosine(incidentIndex, stack.exitMedium.refractiveIndex, incidentAngleRadians);
  const incidentAdmittance = getOpticalAdmittance(incidentIndex, incidentCosine, options.polarization);
  const exitAdmittance = getOpticalAdmittance(stack.exitMedium.refractiveIndex, exitCosine, options.polarization);

  const systemMatrix = stack.layers.reduce((matrix, layer) => {
    const refractiveIndex = layer.material.refractiveIndex;
    const cosTheta = getLayerCosine(incidentIndex, refractiveIndex, incidentAngleRadians);
    const admittance = getOpticalAdmittance(refractiveIndex, cosTheta, options.polarization);
    return multiplyMatrix2(matrix, getLayerMatrix(refractiveIndex, layer.thicknessNm, options.wavelengthNm, cosTheta, admittance));
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
  const reflectionAmplitude = divide(subtract(multiply(incidentAdmittanceComplex, fieldB), fieldC), denominator);
  const transmissionAmplitude = divide(scale(incidentAdmittanceComplex, 2), denominator);
  const reflectance = magnitudeSquared(reflectionAmplitude);
  const transmission = (exitAdmittance / incidentAdmittance) * magnitudeSquared(transmissionAmplitude);

  return {
    wavelengthNm: options.wavelengthNm,
    reflectance: clampUnitInterval(reflectance),
    transmission: clampUnitInterval(transmission),
  };
}

const clampUnitInterval = (value: number): number => Math.min(1, Math.max(0, value));

/** Expands the spectrum around the design wavelength when no sweep is specified. */
const createWavelengthSweep = ({
  startNm,
  endNm,
  pointCount,
  requiredWavelengthNm,
}: SweepSettings): number[] => {
  if (startNm <= 0 || endNm <= startNm) throw new Error('Wavelength sweep must have a positive start and an end greater than start.');
  if (pointCount < 2 || !Number.isInteger(pointCount)) throw new Error('Wavelength sweep must include at least two integer points.');
  const step = (endNm - startNm) / (pointCount - 1);
  const wavelengths = Array.from({ length: pointCount }, (_, index) => startNm + step * index);

  if (
    requiredWavelengthNm !== undefined &&
    requiredWavelengthNm >= startNm &&
    requiredWavelengthNm <= endNm &&
    !wavelengths.some((wavelengthNm) => Math.abs(wavelengthNm - requiredWavelengthNm) < 1e-9)
  ) {
    wavelengths.push(requiredWavelengthNm);
  }

  return wavelengths.sort((a, b) => a - b);
};

/** Finds the half-maximum band edges around the spectral peak. */
const findHalfMaximumBand = (spectrum: LayerStackPointResult[], peakIndex: number, halfPeakReflectance: number): [number, number] | null => {
  let lowerIndex = peakIndex;
  let upperIndex = peakIndex;
  while (lowerIndex > 0 && spectrum[lowerIndex - 1].reflectance >= halfPeakReflectance) lowerIndex -= 1;
  while (upperIndex < spectrum.length - 1 && spectrum[upperIndex + 1].reflectance >= halfPeakReflectance) upperIndex += 1;
  if (lowerIndex === upperIndex) return null;
  return [spectrum[lowerIndex].wavelengthNm, spectrum[upperIndex].wavelengthNm];
};

/** Derives peak, center, bandwidth, and energy-conservation metrics from the spectrum. */
const calculateMetrics = (spectrum: LayerStackPointResult[]) => {
  const peakIndex = spectrum.reduce((bestIndex, point, index, points) => (point.reflectance > points[bestIndex].reflectance ? index : bestIndex), 0);
  const peak = spectrum[peakIndex];
  const halfPeakReflectance = peak.reflectance / 2;
  const halfMaximumBand = findHalfMaximumBand(spectrum, peakIndex, halfPeakReflectance);
  const maxEnergyConservationError = spectrum.reduce((worstError, point) => Math.max(worstError, Math.abs(point.reflectance + point.transmission - 1)), 0);
  if (!halfMaximumBand) return { peakReflectance: peak.reflectance, centerWavelengthNm: peak.wavelengthNm, bandwidthNm: 0, maxEnergyConservationError, bandTouchesBoundary: peakIndex === 0 || peakIndex === spectrum.length - 1 };
  const [lowerEdge, upperEdge] = halfMaximumBand;
  const bandTouchesBoundary =
    lowerEdge === spectrum[0].wavelengthNm || upperEdge === spectrum[spectrum.length - 1].wavelengthNm;

  return { peakReflectance: peak.reflectance, centerWavelengthNm: (lowerEdge + upperEdge) / 2, bandwidthNm: upperEdge - lowerEdge, maxEnergyConservationError, bandTouchesBoundary };
};

/** Runs the quarter-wave stack sweep and returns the plotted spectrum and summary metrics. */
export function solveQuarterWaveStack(
  inputs: QuarterWaveStackInputs,
  options: { requiredWavelengthNm?: number } = {},
): SimulationResult {
  assertValidInputs(inputs);
  const stack = buildQuarterWaveStack(inputs);
  const wavelengths = createWavelengthSweep({
    ...getSweepSettings(inputs),
    requiredWavelengthNm: options.requiredWavelengthNm,
  });
  const spectrum = wavelengths.map((wavelengthNm) =>
    solveLayerStack(stack, {
      wavelengthNm,
      incidentAngleDegrees: inputs.incidentAngleDegrees,
      polarization: inputs.polarization,
    }),
  );
  const metrics = calculateMetrics(spectrum);
  return { spectrum, ...metrics };
}

/** Runs a parameter sweep across the current quarter-wave stack model. */
export function solveQuarterWaveStackParameterSweep(
  inputs: QuarterWaveStackInputs,
  settings: ParameterSweepSettings,
): ParameterSweepResult {
  const values = createParameterSweepValues(settings);
  const points = values.map((parameterValue) => {
    const result = solveQuarterWaveStack({
      ...inputs,
      [settings.parameter]:
        settings.parameter === 'periodCount' ? Math.round(parameterValue) : parameterValue,
    }, {
      requiredWavelengthNm:
        settings.parameter === 'designWavelengthNm' ? parameterValue : undefined,
    });

    return {
      parameterValue: settings.parameter === 'periodCount' ? Math.round(parameterValue) : parameterValue,
      peakReflectance: result.bandTouchesBoundary ? null : result.peakReflectance,
      centerWavelengthNm: result.bandTouchesBoundary ? null : result.centerWavelengthNm,
      bandwidthNm: result.bandTouchesBoundary ? null : result.bandwidthNm,
    };
  });

  return { settings, points };
}

/** Creates inclusive sweep values while preserving integer period counts. */
function createParameterSweepValues(settings: ParameterSweepSettings): number[] {
  if (settings.end <= settings.start) throw new Error('Parameter sweep end must be greater than start.');
  if (settings.pointCount < 2 || !Number.isInteger(settings.pointCount)) {
    throw new Error('Parameter sweep must include at least two integer points.');
  }

  if (settings.parameter === 'periodCount') {
    const start = Math.max(1, Math.round(settings.start));
    const end = Math.max(start + 1, Math.round(settings.end));
    const count = Math.min(settings.pointCount, end - start + 1);
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, index) => Math.round(start + step * index)).filter(
      (value, index, values) => index === 0 || value !== values[index - 1],
    );
  }

  const step = (settings.end - settings.start) / (settings.pointCount - 1);
  return Array.from({ length: settings.pointCount }, (_, index) => settings.start + step * index);
}
