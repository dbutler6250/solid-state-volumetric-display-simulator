import type { HybridBraggDesignInputs } from '../../types/simulation';
import { createHybridBraggModel, getHybridDesignBraggWavelengthNm } from '../structures/hybridBraggGrating';
import { solveHybridBraggCoupledModePoint, solveHybridBraggCoupledModeSpectrum } from '../solvers/coupledMode/spatialBraggSolver';

export type FixedLaserPulsePoint = {
  strainCenterMm: number;
  reflectance: number;
  enhancement: number;
  nominalSupportStartMm: number;
  nominalSupportEndMm: number;
  clippedSupportStartMm: number;
  clippedSupportEndMm: number;
  nominalOverlapMm: number;
};

export type OpticalContrastMetric = {
  onReflectance: number;
  offReflectance: number;
  contrast: number | null;
};

export type MovingPulseEffectiveWidth =
  | { status: 'single-peak'; widthMm: number; halfMaximumEnhancement: number }
  | { status: 'multiple-comparable-peaks'; widthMm: null; halfMaximumEnhancement: number }
  | { status: 'no-meaningful-enhancement'; widthMm: null; halfMaximumEnhancement: null };

export type MovingPulseMetrics = {
  staticReflectance: number;
  peakReflectance: number;
  peakEnhancement: number;
  peakGain: number | null;
  peakPositionMm: number;
  minReflectance: number;
  minPositionMm: number;
  meanReflectance: number;
  standardDeviationReflectance: number;
  uniformity: number | null;
  effectiveWidth: MovingPulseEffectiveWidth;
};

export type MovingPulseExperimentResult = {
  laserWavelengthNm: number;
  staticBraggWavelengthNm: number;
  strainWidthMm: number;
  strainShape: HybridBraggDesignInputs['strainShape'];
  segmentCount: number;
  positionStepMm: number;
  points: FixedLaserPulsePoint[];
  metrics: MovingPulseMetrics;
};

const MINIMUM_RATIO_DENOMINATOR = 1e-9;

/** Runs the permanent or strained hybrid spectrum for caller-supplied wavelength samples. */
export function solveHybridStaticSpectrum(
  design: HybridBraggDesignInputs,
  wavelengthsNm: number[],
) {
  return solveHybridBraggCoupledModeSpectrum(createHybridBraggModel(design), wavelengthsNm);
}

/** Steps a prescribed strain region through the grating at one fixed laser wavelength. */
export function solveFixedLaserPulseResponse(
  design: HybridBraggDesignInputs,
  strainCentersMm: number[],
): FixedLaserPulsePoint[] {
  const staticReflectance = solveStaticReflectance(design);
  return strainCentersMm.map((strainCenterMm) => {
    const reflectance = solveHybridBraggCoupledModePoint(
      createHybridBraggModel({ ...design, strainCenterMm }),
      design.fixedLaserWavelengthNm,
    ).reflectance;
    return {
      strainCenterMm,
      reflectance,
      enhancement: reflectance - staticReflectance,
      ...calculatePulseOverlapMetadata(design, strainCenterMm),
    };
  });
}

/** Calculates a guarded on/off contrast ratio for a selected fixed-laser response. */
export function calculateOpticalContrast(
  onReflectance: number,
  offReflectance: number,
  minimumOffReflectance = 1e-9,
): OpticalContrastMetric {
  return {
    onReflectance,
    offReflectance,
    contrast: offReflectance > minimumOffReflectance ? onReflectance / offReflectance : null,
  };
}

/** Runs the fixed-laser moving active-region experiment over the configured pulse-center range. */
export function solveMovingPulseExperiment(design: HybridBraggDesignInputs): MovingPulseExperimentResult {
  const positionStepMm = (design.pulseSweepEndMm - design.pulseSweepStartMm) / (design.pulseSweepPointCount - 1);
  const positionsMm = Array.from({ length: design.pulseSweepPointCount }, (_, index) =>
    Number((design.pulseSweepStartMm + positionStepMm * index).toPrecision(12)),
  );
  const points = solveFixedLaserPulseResponse(design, positionsMm);

  return {
    laserWavelengthNm: design.fixedLaserWavelengthNm,
    staticBraggWavelengthNm: getHybridDesignBraggWavelengthNm(design),
    strainWidthMm: design.strainWidthMm,
    strainShape: design.strainShape,
    segmentCount: design.segmentCount,
    positionStepMm,
    points,
    metrics: calculateMovingPulseMetrics(points, solveStaticReflectance(design)),
  };
}

/** Calculates fixed-laser moving-pulse metrics without assuming a final display interpretation. */
export function calculateMovingPulseMetrics(
  points: FixedLaserPulsePoint[],
  staticReflectance: number,
): MovingPulseMetrics {
  if (points.length === 0) {
    throw new Error('Moving pulse metrics require at least one position sample.');
  }

  const peak = points.reduce((best, point) => (point.reflectance > best.reflectance ? point : best), points[0]);
  const minimum = points.reduce((best, point) => (point.reflectance < best.reflectance ? point : best), points[0]);
  const meanReflectance = points.reduce((sum, point) => sum + point.reflectance, 0) / points.length;
  const variance = points.reduce((sum, point) => sum + (point.reflectance - meanReflectance) ** 2, 0) / points.length;
  const peakEnhancement = peak.reflectance - staticReflectance;

  return {
    staticReflectance,
    peakReflectance: peak.reflectance,
    peakEnhancement,
    peakGain: calculateOpticalContrast(peak.reflectance, staticReflectance, MINIMUM_RATIO_DENOMINATOR).contrast,
    peakPositionMm: peak.strainCenterMm,
    minReflectance: minimum.reflectance,
    minPositionMm: minimum.strainCenterMm,
    meanReflectance,
    standardDeviationReflectance: Math.sqrt(variance),
    uniformity: peak.reflectance > MINIMUM_RATIO_DENOMINATOR ? minimum.reflectance / peak.reflectance : null,
    effectiveWidth: calculateEffectiveOpticalResponseWidth(points, staticReflectance),
  };
}

/** Estimates an optical response FWHM only when one dominant enhancement peak exists. */
export function calculateEffectiveOpticalResponseWidth(
  points: FixedLaserPulsePoint[],
  staticReflectance: number,
): MovingPulseEffectiveWidth {
  const enhancements = points.map((point) => Math.max(0, point.reflectance - staticReflectance));
  const maxEnhancement = Math.max(...enhancements);
  if (maxEnhancement <= 1e-9) {
    return { status: 'no-meaningful-enhancement', widthMm: null, halfMaximumEnhancement: null };
  }

  const comparablePeakCount = countComparablePeaks(enhancements, maxEnhancement * 0.8);
  const halfMaximumEnhancement = maxEnhancement / 2;
  if (comparablePeakCount > 1) {
    return { status: 'multiple-comparable-peaks', widthMm: null, halfMaximumEnhancement };
  }

  const widthMm = interpolateThresholdWidth(points, enhancements, halfMaximumEnhancement);
  return { status: 'single-peak', widthMm, halfMaximumEnhancement };
}

function solveStaticReflectance(design: HybridBraggDesignInputs): number {
  return solveHybridBraggCoupledModePoint(
    createHybridBraggModel({ ...design, peakStrain: 0 }),
    design.fixedLaserWavelengthNm,
  ).reflectance;
}

function calculatePulseOverlapMetadata(
  design: HybridBraggDesignInputs,
  strainCenterMm: number,
): Omit<FixedLaserPulsePoint, 'strainCenterMm' | 'reflectance' | 'enhancement'> {
  const nominalSupportStartMm = strainCenterMm - design.strainWidthMm / 2;
  const nominalSupportEndMm = strainCenterMm + design.strainWidthMm / 2;
  const clippedSupportStartMm = Math.max(0, nominalSupportStartMm);
  const clippedSupportEndMm = Math.min(design.lengthMm, nominalSupportEndMm);
  return {
    nominalSupportStartMm,
    nominalSupportEndMm,
    clippedSupportStartMm,
    clippedSupportEndMm,
    nominalOverlapMm: Math.max(0, clippedSupportEndMm - clippedSupportStartMm),
  };
}

function countComparablePeaks(values: number[], threshold: number): number {
  return values.filter((value, index) => {
    const previous = values[index - 1] ?? Number.NEGATIVE_INFINITY;
    const next = values[index + 1] ?? Number.NEGATIVE_INFINITY;
    return value >= threshold && value >= previous && value >= next;
  }).length;
}

function interpolateThresholdWidth(
  points: FixedLaserPulsePoint[],
  values: number[],
  threshold: number,
): number {
  const firstIndex = values.findIndex((value) => value >= threshold);
  const lastIndex = values.length - 1 - [...values].reverse().findIndex((value) => value >= threshold);
  if (firstIndex < 0 || lastIndex < firstIndex) return 0;
  const left = interpolateCrossing(points, values, threshold, firstIndex - 1, firstIndex);
  const right = interpolateCrossing(points, values, threshold, lastIndex, lastIndex + 1);
  return Math.max(0, right - left);
}

function interpolateCrossing(
  points: FixedLaserPulsePoint[],
  values: number[],
  threshold: number,
  lowerIndex: number,
  upperIndex: number,
): number {
  if (lowerIndex < 0) return points[0].strainCenterMm;
  if (upperIndex >= values.length) return points[points.length - 1].strainCenterMm;
  const lowerValue = values[lowerIndex];
  const upperValue = values[upperIndex];
  const fraction = upperValue === lowerValue ? 0 : (threshold - lowerValue) / (upperValue - lowerValue);
  return points[lowerIndex].strainCenterMm +
    (points[upperIndex].strainCenterMm - points[lowerIndex].strainCenterMm) * fraction;
}
