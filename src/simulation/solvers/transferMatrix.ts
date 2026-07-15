import type {
  ParameterSweepResult,
  ParameterSweepSettings,
  QuarterWaveStackInputs,
  ReflectanceHeatmapResult,
  ReflectanceHeatmapSettings,
  SimulationDocument,
  SimulationResult,
} from '../../types/simulation';
import type { LayerStack } from '../layers/stack';
import {
  add,
  complex,
  cos,
  divide,
  magnitudeSquared,
  multiply,
  scale,
  sin,
  sqrt,
  subtract,
  type Complex,
} from '../math/complex';
import { identityMatrix2, multiplyMatrix2, type Matrix2 } from '../math/matrix2';
import {
  applySweepValue,
  createSimulationDocument,
  documentToLegacyInputs,
  resolveSimulationDocument,
  type ResolvedStructure,
} from '../structures/structureResolver';
import { getAcousticSlicesPerPeriod } from '../structures/acoustoOpticGrating';
import {
  MAX_AUTOMATIC_ACOUSTIC_LAYERS,
  MAX_PARAMETER_SWEEP_POINTS,
  MAX_PARAMETER_SWEEP_WORK,
} from '../simulationLimits';
import { validateQuarterWaveStackInputs } from '../validation/quarterWaveStackValidation';
import { toComplexRefractiveIndex } from '../materials/material';

const DEGREES_TO_RADIANS = Math.PI / 180;
const MAX_INCIDENT_ANGLE_DEGREES = 89.9;

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

type WavelengthSweepSettings = {
  startNm: number;
  endNm: number;
  pointCount: number;
  requiredWavelengthNm?: number;
};

/** Validates the input bundle before any solver work begins. */
const assertValidInputs = (inputs: QuarterWaveStackInputs) => {
  const issues = validateQuarterWaveStackInputs(inputs);
  if (issues.length > 0) throw new Error(issues.map((issue) => issue.message).join(' '));
};

/** Computes the propagation angle inside a layer using Snell's law. */
const getLayerCosine = (
  incidentIndex: Complex,
  layerIndex: Complex,
  incidentAngleRadians: number,
): Complex => {
  const sinIncident = complex(Math.sin(incidentAngleRadians));
  const sinTheta = multiply(divide(incidentIndex, layerIndex), sinIncident);
  const cosineSquared = subtract(complex(1), multiply(sinTheta, sinTheta));
  return sqrt(cosineSquared);
};

/** Converts refractive index and angle into the TE/TM optical admittance. */
const getOpticalAdmittance = (
  refractiveIndex: Complex,
  cosTheta: Complex,
  polarization: QuarterWaveStackInputs['polarization'],
): Complex => (polarization === 'TE' ? multiply(refractiveIndex, cosTheta) : divide(refractiveIndex, cosTheta));

/** Builds the characteristic matrix for one homogeneous layer. */
const getLayerMatrix = (
  refractiveIndex: Complex,
  thicknessNm: number,
  wavelengthNm: number,
  cosTheta: Complex,
  admittance: Complex,
): Matrix2 => {
  const phaseThickness = scale(multiply(refractiveIndex, cosTheta), (2 * Math.PI * thicknessNm) / wavelengthNm);
  const cosPhase = cos(phaseThickness);
  const sinPhase = sin(phaseThickness);
  return [
    [cosPhase, multiply(complex(0, 1), divide(sinPhase, admittance))],
    [multiply(complex(0, 1), multiply(admittance, sinPhase)), cosPhase],
  ];
};

/** Solves one stack at a single wavelength and incident angle. */
export function solveLayerStack(stack: LayerStack, options: SolveLayerStackOptions) {
  const incidentAngleRadians = options.incidentAngleDegrees * DEGREES_TO_RADIANS;
  const incidentIndex = toComplexRefractiveIndex(stack.incidentMedium.refractiveIndex);
  const exitIndex = toComplexRefractiveIndex(stack.exitMedium.refractiveIndex);
  const incidentCosine = complex(Math.cos(incidentAngleRadians));
  const exitCosine = getLayerCosine(incidentIndex, exitIndex, incidentAngleRadians);
  const incidentAdmittance = getOpticalAdmittance(incidentIndex, incidentCosine, options.polarization);
  const exitAdmittance = getOpticalAdmittance(exitIndex, exitCosine, options.polarization);

  const systemMatrix = stack.layers.reduce((matrix, layer) => {
    const refractiveIndex = toComplexRefractiveIndex(layer.material.refractiveIndex);
    const cosTheta = getLayerCosine(incidentIndex, refractiveIndex, incidentAngleRadians);
    const admittance = getOpticalAdmittance(refractiveIndex, cosTheta, options.polarization);
    return multiplyMatrix2(matrix, getLayerMatrix(refractiveIndex, layer.thicknessNm, options.wavelengthNm, cosTheta, admittance));
  }, identityMatrix2());

  const m11 = systemMatrix[0][0];
  const m12 = systemMatrix[0][1];
  const m21 = systemMatrix[1][0];
  const m22 = systemMatrix[1][1];
  const fieldB = add(m11, multiply(m12, exitAdmittance));
  const fieldC = add(m21, multiply(m22, exitAdmittance));
  const denominator = add(multiply(incidentAdmittance, fieldB), fieldC);
  const reflectionAmplitude = divide(subtract(multiply(incidentAdmittance, fieldB), fieldC), denominator);
  const transmissionAmplitude = divide(scale(incidentAdmittance, 2), denominator);
  const reflectance = magnitudeSquared(reflectionAmplitude);
  const incidentPower = getPowerFlowFactor(incidentAdmittance);
  const exitPower = getPowerFlowFactor(exitAdmittance);
  const transmission = (exitPower / incidentPower) * magnitudeSquared(transmissionAmplitude);

  return {
    wavelengthNm: options.wavelengthNm,
    reflectance: clampUnitInterval(reflectance),
    transmission: clampUnitInterval(transmission),
  };
}

const clampUnitInterval = (value: number): number => Math.min(1, Math.max(0, value));

/** Approximates the real power flow factor for a complex admittance. */
const getPowerFlowFactor = (admittance: Complex): number => Math.max(0, admittance.re);

/** Expands the spectrum around the design wavelength when no sweep is specified. */
const createWavelengthSweep = ({
  startNm,
  endNm,
  pointCount,
  requiredWavelengthNm,
}: WavelengthSweepSettings): number[] => {
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

type InterpolatedPeak = {
  wavelengthNm: number;
  reflectance: number;
};

/** Estimates the smooth local maximum from the peak sample and its neighbors. */
const interpolatePeak = (spectrum: LayerStackPointResult[], peakIndex: number): InterpolatedPeak => {
  const peak = spectrum[peakIndex];
  if (peakIndex === 0 || peakIndex === spectrum.length - 1) {
    return { wavelengthNm: peak.wavelengthNm, reflectance: peak.reflectance };
  }

  const left = spectrum[peakIndex - 1];
  const right = spectrum[peakIndex + 1];
  const denominator = left.reflectance - 2 * peak.reflectance + right.reflectance;
  if (Math.abs(denominator) < 1e-12) {
    return { wavelengthNm: peak.wavelengthNm, reflectance: peak.reflectance };
  }

  // Parabolic interpolation is a local, lightweight refinement for smooth spectra near the sampled maximum.
  const offset = 0.5 * (left.reflectance - right.reflectance) / denominator;
  if (Math.abs(offset) > 1) {
    return { wavelengthNm: peak.wavelengthNm, reflectance: peak.reflectance };
  }

  const leftStepNm = peak.wavelengthNm - left.wavelengthNm;
  const rightStepNm = right.wavelengthNm - peak.wavelengthNm;
  const wavelengthNm = peak.wavelengthNm + (offset < 0 ? offset * leftStepNm : offset * rightStepNm);
  const reflectance = peak.reflectance - 0.25 * (left.reflectance - right.reflectance) * offset;
  return { wavelengthNm, reflectance: clampUnitInterval(reflectance) };
};

const interpolateThresholdWavelength = (
  innerPoint: LayerStackPointResult,
  outerPoint: LayerStackPointResult,
  thresholdReflectance: number,
): number => {
  const reflectanceDelta = outerPoint.reflectance - innerPoint.reflectance;
  if (Math.abs(reflectanceDelta) < 1e-12) return innerPoint.wavelengthNm;
  const fraction = (thresholdReflectance - innerPoint.reflectance) / reflectanceDelta;
  return innerPoint.wavelengthNm + fraction * (outerPoint.wavelengthNm - innerPoint.wavelengthNm);
};

/** Finds interpolated half-maximum band edges around the spectral peak. */
const findHalfMaximumBand = (spectrum: LayerStackPointResult[], peakIndex: number, halfPeakReflectance: number): [number, number] | null => {
  let lowerIndex = peakIndex;
  let upperIndex = peakIndex;
  while (lowerIndex > 0 && spectrum[lowerIndex - 1].reflectance >= halfPeakReflectance) lowerIndex -= 1;
  while (upperIndex < spectrum.length - 1 && spectrum[upperIndex + 1].reflectance >= halfPeakReflectance) upperIndex += 1;
  const lowerEdge =
    lowerIndex === 0
      ? spectrum[lowerIndex].wavelengthNm
      : interpolateThresholdWavelength(spectrum[lowerIndex], spectrum[lowerIndex - 1], halfPeakReflectance);
  const upperEdge =
    upperIndex === spectrum.length - 1
      ? spectrum[upperIndex].wavelengthNm
      : interpolateThresholdWavelength(spectrum[upperIndex], spectrum[upperIndex + 1], halfPeakReflectance);

  return upperEdge > lowerEdge ? [lowerEdge, upperEdge] : null;
};

/** Derives peak, center, bandwidth, and energy-conservation metrics from the spectrum. */
const calculateMetrics = (spectrum: LayerStackPointResult[]) => {
  const peakIndex = spectrum.reduce((bestIndex, point, index, points) => (point.reflectance > points[bestIndex].reflectance ? index : bestIndex), 0);
  const peak = interpolatePeak(spectrum, peakIndex);
  const halfPeakReflectance = peak.reflectance / 2;
  const halfMaximumBand = findHalfMaximumBand(spectrum, peakIndex, halfPeakReflectance);
  const maxEnergyConservationError = spectrum.reduce((worstError, point) => Math.max(worstError, Math.abs(point.reflectance + point.transmission - 1)), 0);
  if (!halfMaximumBand) return { peakReflectance: peak.reflectance, centerWavelengthNm: peak.wavelengthNm, bandwidthNm: 0, maxEnergyConservationError, bandTouchesBoundary: peakIndex === 0 || peakIndex === spectrum.length - 1 };
  const [lowerEdge, upperEdge] = halfMaximumBand;
  const bandTouchesBoundary =
    lowerEdge === spectrum[0].wavelengthNm || upperEdge === spectrum[spectrum.length - 1].wavelengthNm;

  return { peakReflectance: peak.reflectance, centerWavelengthNm: (lowerEdge + upperEdge) / 2, bandwidthNm: upperEdge - lowerEdge, maxEnergyConservationError, bandTouchesBoundary };
};

/** Solves the exact resolved layer stack using shared analysis settings. */
export function solveResolvedStructure(
  resolved: ResolvedStructure,
  analysis: SimulationDocument['analysis'],
  options: { requiredWavelengthNm?: number } = {},
): SimulationResult {
  const wavelengths = createWavelengthSweep({
    startNm: analysis.wavelengthStartNm,
    endNm: analysis.wavelengthEndNm,
    pointCount: analysis.wavelengthPointCount,
    requiredWavelengthNm: options.requiredWavelengthNm,
  });
  const spectrum = wavelengths.map((wavelengthNm) =>
    solveLayerStack(resolved.stack, {
      wavelengthNm,
      incidentAngleDegrees: analysis.incidentAngleDegrees,
      polarization: analysis.polarization,
    }),
  );
  const metrics = calculateMetrics(spectrum);
  return { spectrum, ...metrics };
}

type AsyncSolveOptions = {
  requiredWavelengthNm?: number;
  signal?: AbortSignal;
};

/** Solves a resolved stack in cancellable wavelength chunks for responsive acoustic editing. */
export async function solveResolvedStructureAsync(
  resolved: ResolvedStructure,
  analysis: SimulationDocument['analysis'],
  options: AsyncSolveOptions = {},
): Promise<SimulationResult> {
  const wavelengths = createWavelengthSweep({
    startNm: analysis.wavelengthStartNm,
    endNm: analysis.wavelengthEndNm,
    pointCount: analysis.wavelengthPointCount,
    requiredWavelengthNm: options.requiredWavelengthNm,
  });
  const spectrum: LayerStackPointResult[] = [];

  for (const wavelengthNm of wavelengths) {
    throwIfAborted(options.signal);
    spectrum.push(
      solveLayerStack(resolved.stack, {
        wavelengthNm,
        incidentAngleDegrees: analysis.incidentAngleDegrees,
        polarization: analysis.polarization,
      }),
    );
    await yieldToBrowser();
  }

  throwIfAborted(options.signal);
  return { spectrum, ...calculateMetrics(spectrum) };
}

/** Resolves and solves one canonical simulation document. */
export function solveSimulationDocument(
  document: SimulationDocument,
  options: { requiredWavelengthNm?: number } = {},
): SimulationResult {
  const resolved = resolveSimulationDocument(document);
  return solveResolvedStructure(resolved, document.analysis, options);
}

/** Backward-compatible adapter for existing flat inputs. */
export function solveQuarterWaveStack(
  inputs: QuarterWaveStackInputs,
  options: { requiredWavelengthNm?: number } = {},
): SimulationResult {
  assertValidInputs(inputs);
  return solveSimulationDocument(createSimulationDocument(inputs), options);
}

/** Runs a parameter sweep across the current quarter-wave stack model. */
export function solveQuarterWaveStackParameterSweep(
  inputs: QuarterWaveStackInputs,
  settings: ParameterSweepSettings,
): ParameterSweepResult {
  assertValidInputs(inputs);
  return solveSimulationDocumentParameterSweep(createSimulationDocument(inputs), settings);
}

/** Resolves every sweep point after updating the active discriminated structure field. */
export function solveSimulationDocumentParameterSweep(
  document: SimulationDocument,
  settings: ParameterSweepSettings,
): ParameterSweepResult {
  const supported = resolveSimulationDocument(document).sweepParameters;
  if (!supported.includes(settings.parameter)) {
    throw new Error(`Sweep parameter ${settings.parameter} is not supported by the active structure.`);
  }
  const values = createParameterSweepValues(settings);
  assertParameterSweepIsSafe(document, settings, values);
  const points = values.map((parameterValue) => {
    const sweptDocument = applySweepValue(document, settings, parameterValue);
    const result = solveSimulationDocument(sweptDocument, {
      requiredWavelengthNm:
        settings.parameter === 'designWavelengthNm' ? parameterValue : undefined,
    });

    return {
      parameterValue:
        settings.parameter === 'periodCount' || settings.parameter === 'acousticPeriodCount'
          ? Math.round(parameterValue)
          : parameterValue,
      peakReflectance: result.bandTouchesBoundary ? null : result.peakReflectance,
      centerWavelengthNm: result.bandTouchesBoundary ? null : result.centerWavelengthNm,
      bandwidthNm: result.bandTouchesBoundary ? null : result.bandwidthNm,
    };
  });

  return { settings, points };
}

const heatmapResultCache = new Map<string, ReflectanceHeatmapResult>();

/** Resolves a general 2D reflectance grid for the active document. */
export function solveSimulationDocumentReflectanceHeatmap(
  document: SimulationDocument,
  settings: ReflectanceHeatmapSettings,
): ReflectanceHeatmapResult {
  const cacheKey = createHeatmapCacheKey(document, settings);
  const cached = heatmapResultCache.get(cacheKey);
  if (cached) return cached;

  const resolved = resolveSimulationDocument(document);
  const supported = resolved.sweepParameters;
  if (!supported.includes(settings.xAxis.parameter) || !supported.includes(settings.yAxis.parameter)) {
    throw new Error('One or both heatmap axes are not supported by the active structure.');
  }

  const xValues = createParameterSweepValues(settings.xAxis);
  const yValues = createParameterSweepValues(settings.yAxis);
  assertHeatmapSweepIsSafe(document, settings, xValues, yValues);
  const pointCache = new Map<string, number>();
  const reflectance: number[][] = [];
  for (const yValue of yValues) {
    const row: number[] = [];
    for (const xValue of xValues) {
      const pointKey = createHeatmapPointKey(xValue, yValue);
      const cachedValue = pointCache.get(pointKey);
      if (cachedValue !== undefined) {
        row.push(cachedValue);
        continue;
      }

      const sweptDocument = applySweepValue(
        applySweepValue(document, settings.xAxis, xValue),
        settings.yAxis,
        yValue,
      );
      const result = solveSimulationDocument(sweptDocument, {
        requiredWavelengthNm:
          settings.xAxis.parameter === 'designWavelengthNm'
            ? xValue
            : settings.yAxis.parameter === 'designWavelengthNm'
              ? yValue
              : undefined,
      });
      const peakReflectance = result.peakReflectance;
      pointCache.set(pointKey, peakReflectance);
      row.push(peakReflectance);
    }
    reflectance.push(row);
  }

  const heatmapResult: ReflectanceHeatmapResult = {
    settings,
    xAxis: { settings: settings.xAxis, values: xValues },
    yAxis: { settings: settings.yAxis, values: yValues },
    reflectance,
  };
  heatmapResultCache.set(cacheKey, heatmapResult);
  return heatmapResult;
}

/** Resolves a general 2D reflectance grid without blocking the main thread for large sweeps. */
export async function solveSimulationDocumentReflectanceHeatmapAsync(
  document: SimulationDocument,
  settings: ReflectanceHeatmapSettings,
  options: { signal?: AbortSignal } = {},
): Promise<ReflectanceHeatmapResult> {
  const cacheKey = createHeatmapCacheKey(document, settings);
  const cached = heatmapResultCache.get(cacheKey);
  if (cached) return cached;

  const resolved = resolveSimulationDocument(document);
  const supported = resolved.sweepParameters;
  if (!supported.includes(settings.xAxis.parameter) || !supported.includes(settings.yAxis.parameter)) {
    throw new Error('One or both heatmap axes are not supported by the active structure.');
  }

  const xValues = createParameterSweepValues(settings.xAxis);
  const yValues = createParameterSweepValues(settings.yAxis);
  assertHeatmapSweepIsSafe(document, settings, xValues, yValues, { async: true });
  const pointCache = new Map<string, number>();
  const reflectance: number[][] = [];

  for (const yValue of yValues) {
    throwIfAborted(options.signal);
    const row: number[] = [];
    for (const xValue of xValues) {
      throwIfAborted(options.signal);
      const pointKey = createHeatmapPointKey(xValue, yValue);
      const cachedValue = pointCache.get(pointKey);
      if (cachedValue !== undefined) {
        row.push(cachedValue);
        continue;
      }

      const sweptDocument = applySweepValue(applySweepValue(document, settings.xAxis, xValue), settings.yAxis, yValue);
      const result = solveSimulationDocument(sweptDocument, {
        requiredWavelengthNm:
          settings.xAxis.parameter === 'designWavelengthNm'
            ? xValue
            : settings.yAxis.parameter === 'designWavelengthNm'
              ? yValue
              : undefined,
      });
      const peakReflectance = result.peakReflectance;
      pointCache.set(pointKey, peakReflectance);
      row.push(peakReflectance);
      await yieldToBrowser();
    }
    reflectance.push(row);
  }

  const heatmapResult: ReflectanceHeatmapResult = {
    settings,
    xAxis: { settings: settings.xAxis, values: xValues },
    yAxis: { settings: settings.yAxis, values: yValues },
    reflectance,
  };
  heatmapResultCache.set(cacheKey, heatmapResult);
  return heatmapResult;
}

/** Creates inclusive sweep values while preserving integer period counts. */
function createParameterSweepValues(settings: ParameterSweepSettings): number[] {
  if (settings.parameter === 'incidentAngleDegrees') {
    const start = clampIncidentAngle(settings.start);
    const end = clampIncidentAngle(settings.end);
    if (end <= start) throw new Error('Parameter sweep end must be greater than start.');
    if (settings.pointCount < 2 || !Number.isInteger(settings.pointCount)) {
      throw new Error('Parameter sweep must include at least two integer points.');
    }

    const step = (end - start) / (settings.pointCount - 1);
    return Array.from({ length: settings.pointCount }, (_, index) => start + step * index);
  }

  if (settings.end <= settings.start) throw new Error('Parameter sweep end must be greater than start.');
  if (settings.pointCount < 2 || !Number.isInteger(settings.pointCount)) {
    throw new Error('Parameter sweep must include at least two integer points.');
  }

  if (settings.parameter === 'periodCount' || settings.parameter === 'acousticPeriodCount') {
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

function createHeatmapPointKey(xValue: number, yValue: number): string {
  return `${xValue}::${yValue}`;
}

function createHeatmapCacheKey(
  document: SimulationDocument,
  settings: ReflectanceHeatmapSettings,
): string {
  return JSON.stringify({ document, settings });
}

/** Rejects the entire heatmap before resolving any over-limit stack or excessive workload. */
function assertHeatmapSweepIsSafe(
  document: SimulationDocument,
  settings: ReflectanceHeatmapSettings,
  xValues: number[],
  yValues: number[],
  options: { async?: boolean } = {},
): void {
  const pointCount = xValues.length * yValues.length;
  if (pointCount > MAX_PARAMETER_SWEEP_POINTS * MAX_PARAMETER_SWEEP_POINTS) {
    throw new Error('The heatmap sweep is too large to evaluate synchronously.');
  }

  let aggregateWork = 0;
  for (const yValue of yValues) {
    for (const xValue of xValues) {
      const sweptDocument = applySweepValue(applySweepValue(document, settings.xAxis, xValue), settings.yAxis, yValue);
      const sweptInputs = documentToLegacyInputs(sweptDocument);
      const issues = validateQuarterWaveStackInputs(sweptInputs);
      if (issues.length > 0) {
        throw new Error(`Invalid heatmap value ${xValue}, ${yValue}: ${issues.map((issue) => issue.message).join(' ')}`);
      }

      const layerCount =
        sweptDocument.structure.type === 'acousto-optic-grating'
          ? sweptDocument.structure.design.acousticPeriodCount *
            getAcousticSlicesPerPeriod(sweptDocument.structure.design.acousticRepresentationMode)
          : sweptDocument.structure.periodCount * 2;
      if (layerCount > MAX_AUTOMATIC_ACOUSTIC_LAYERS && sweptDocument.structure.type === 'acousto-optic-grating') {
        throw new Error(
          `Heatmap value ${xValue}, ${yValue} requires ${layerCount.toLocaleString()} slices; automatic sweeps are limited to ${MAX_AUTOMATIC_ACOUSTIC_LAYERS.toLocaleString()} slices per point. Reduce the acoustic-period bounds or representation detail.`,
        );
      }
      aggregateWork += layerCount * sweptDocument.analysis.wavelengthPointCount;
    }
  }

  if (!options.async && aggregateWork > MAX_PARAMETER_SWEEP_WORK) {
    throw new Error(
      `This heatmap requires approximately ${aggregateWork.toLocaleString()} layer-wavelength evaluations; the synchronous sweep limit is ${MAX_PARAMETER_SWEEP_WORK.toLocaleString()}. Reduce the bounds, points, wavelength samples, or representation detail.`,
    );
  }
}

/** Rejects the entire sweep before resolving any over-limit stack or excessive workload. */
function assertParameterSweepIsSafe(
  document: SimulationDocument,
  settings: ParameterSweepSettings,
  values: number[],
): void {
  if (values.length > MAX_PARAMETER_SWEEP_POINTS) {
    throw new Error(
      `Parameter sweeps are limited to ${MAX_PARAMETER_SWEEP_POINTS.toLocaleString()} points. Reduce the bounds or point count.`,
    );
  }

  let aggregateWork = 0;
  for (const value of values) {
    const sweptDocument = applySweepValue(document, settings, value);
    const sweptInputs = documentToLegacyInputs(sweptDocument);
    const issues = validateQuarterWaveStackInputs(sweptInputs);
    if (issues.length > 0) {
      throw new Error(`Invalid sweep value ${value}: ${issues.map((issue) => issue.message).join(' ')}`);
    }

    const layerCount = sweptDocument.structure.type === 'acousto-optic-grating'
      ? sweptDocument.structure.design.acousticPeriodCount *
        getAcousticSlicesPerPeriod(sweptDocument.structure.design.acousticRepresentationMode)
      : sweptDocument.structure.periodCount * 2;
    if (layerCount > MAX_AUTOMATIC_ACOUSTIC_LAYERS && sweptDocument.structure.type === 'acousto-optic-grating') {
      throw new Error(
        `Acoustic sweep value ${value} requires ${layerCount.toLocaleString()} slices; automatic sweeps are limited to ${MAX_AUTOMATIC_ACOUSTIC_LAYERS.toLocaleString()} slices per point. Reduce the acoustic-period bounds or representation detail.`,
      );
    }
    aggregateWork += layerCount * sweptDocument.analysis.wavelengthPointCount;
  }

  if (aggregateWork > MAX_PARAMETER_SWEEP_WORK) {
    throw new Error(
      `This sweep requires approximately ${aggregateWork.toLocaleString()} layer-wavelength evaluations; the synchronous sweep limit is ${MAX_PARAMETER_SWEEP_WORK.toLocaleString()}. Reduce the bounds, points, wavelength samples, or representation detail.`,
    );
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error('The stale acoustic calculation was cancelled.');
  error.name = 'AbortError';
  throw error;
}

async function yieldToBrowser(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Clamps angle sweeps to the physically valid open interval below 90 degrees. */
function clampIncidentAngle(angleDegrees: number): number {
  return Math.min(MAX_INCIDENT_ANGLE_DEGREES, Math.max(0, angleDegrees));
}
