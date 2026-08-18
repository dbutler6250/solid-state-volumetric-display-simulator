import type { HybridBraggDesignInputs } from '../../types/simulation';
import {
  createHybridBraggModel,
  getCouplingCoefficientPerM,
  getHybridDesignBraggWavelengthNm,
} from '../structures/hybridBraggGrating';
import type { SpatialCoupledModeFieldSample } from '../solvers/coupledMode/spatialBraggSolver';
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

export type MovingResponseClassification =
  | 'single-dominant'
  | 'multi-peak'
  | 'broad'
  | 'weak'
  | 'no-enhancement'
  | 'periodic-multi-plane'
  | 'stationary-plane-array'
  | 'moving-envelope';

export type MovingResponsePeak = {
  positionMm: number;
  enhancement: number;
  reflectance: number;
};

export type MovingResponseLocalizationMetrics = {
  primaryPeak: MovingResponsePeak | null;
  secondaryPeak: MovingResponsePeak | null;
  peakDominance: number | null;
  secondaryPeakRatio: number | null;
  localizedFraction: number | null;
  boundaryDominated: boolean;
  interiorPeakEnhancement: number;
  responseClassification: MovingResponseClassification;
  oscillationCollapseCandidate: boolean;
};

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
  localization: MovingResponseLocalizationMetrics;
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

export type MovingPulseProgress = {
  completed: number;
  total: number;
};

export type MovingPulseSolveOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: MovingPulseProgress) => void;
};

export type MovingResponseRegimeMapQuantity =
  | 'classification'
  | 'peakEnhancement'
  | 'secondaryPeakRatio'
  | 'effectiveWidthMm'
  | 'staticReflectance'
  | 'peakReflectance'
  | 'localizedFraction';

export type MovingResponseRegimeMapCell = {
  detuningNm: number;
  laserWavelengthNm: number;
  strainWidthMm: number;
  strainWidthToCouplingLength: number | null;
  indexModulation: number;
  couplingCoefficientPerM: number;
  couplingLengthMm: number | null;
  kappaLengthProduct: number;
  staticReflectance: number;
  peakReflectance: number;
  peakEnhancement: number;
  primaryPeakPositionMm: number | null;
  secondaryPeakRatio: number | null;
  localizedFraction: number | null;
  effectiveWidthMm: number | null;
  effectiveWidthToCouplingLength: number | null;
  positionStdReflectance: number;
  classification: MovingResponseClassification;
  boundaryDominated: boolean;
  strainShape: HybridBraggDesignInputs['strainShape'];
  result: MovingPulseExperimentResult;
};

export type MovingResponseRegimeMapSlice = {
  strainShape: HybridBraggDesignInputs['strainShape'];
  indexModulation: number;
  couplingCoefficientPerM: number;
  couplingLengthMm: number | null;
  kappaLengthProduct: number;
  detuningValuesNm: number[];
  cells: MovingResponseRegimeMapCell[][];
};

export type MovingResponseRegimeMapResult = {
  staticBraggWavelengthNm: number;
  detuningValuesNm: number[];
  strainWidthValuesMm: number[];
  strainShapes: HybridBraggDesignInputs['strainShape'][];
  slices: MovingResponseRegimeMapSlice[];
  summary: {
    classificationCounts: Record<MovingResponseClassification, number>;
    overallOutcome: 'clear-regime-found' | 'marginal-fragile-regimes-found' | 'no-collapse-regime-found';
  };
};

export type MovingResponseRegimeMapSettings = {
  detuningValuesNm?: number[];
  strainWidthRatiosToCouplingLength?: number[];
  indexModulations?: number[];
  strainShapes?: HybridBraggDesignInputs['strainShape'][];
};

export type PerturbationFieldComparisonFamily = {
  strainShape: HybridBraggDesignInputs['strainShape'];
  parameterKind: 'position' | 'phase';
  staticReflectance: number;
  peakReflectance: number;
  peakEnhancement: number;
  secondaryPeakRatio: number | null;
  localizedFraction: number | null;
  effectiveWidthMm: number | null;
  repeatSpacingMm: number | null;
  phaseSensitivity: number | null;
  classification: MovingResponseClassification;
  opticalAssessment: 'most-promising' | 'promising-conditional' | 'unclear' | 'poor-current-model';
  result: MovingPulseExperimentResult;
};

export type PerturbationFieldComparisonResult = {
  staticBraggWavelengthNm: number;
  laserWavelengthNm: number;
  families: PerturbationFieldComparisonFamily[];
  mostPromising: PerturbationFieldComparisonFamily | null;
};

export type ReflectionRegion = {
  startMm: number;
  endMm: number;
  centerMm: number;
  peakMm: number;
  peakNormalizedIntensity: number;
  sectionIds: number[];
};

export type ReflectionRegionFrame = {
  parameterValue: number;
  parameterKind: 'position' | 'phase' | 'actuator-index';
  reflectance: number;
  spatialField: SpatialCoupledModeFieldSample[];
  regions: ReflectionRegion[];
  activeSectionIds: number[];
};

export type ReflectionRegionEvolutionResult = {
  thresholdFraction: number;
  frames: ReflectionRegionFrame[];
};

const MINIMUM_RATIO_DENOMINATOR = 1e-9;
const LOCALIZATION_MINIMUM_ENHANCEMENT = 1e-4;
const SINGLE_DOMINANT_SECONDARY_RATIO = 0.35;
const SINGLE_DOMINANT_LOCALIZED_FRACTION = 0.55;
const BROAD_WIDTH_TO_GRATING_LENGTH = 0.45;
const DEFAULT_WIDTH_RATIOS_TO_COUPLING_LENGTH = [0.1, 0.25, 0.5, 1, 2];
const DEFAULT_INDEX_MODULATIONS = [1e-5, 1e-4, 1e-3];
const DEFAULT_DETUNING_EDGE_MULTIPLES = [-4, -2, -1.1, -0.5, 0, 0.5, 1.1, 2, 4];
const DEFAULT_COMPARISON_SHAPES: HybridBraggDesignInputs['strainShape'][] = [
  'rectangular',
  'gaussian',
  'smooth-top-hat',
  'carrier-envelope',
  'traveling-sinusoid',
  'standing-wave',
  'multi-tone',
  'triangular',
];

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
  return strainCentersMm.map((strainCenterMm) => solveFixedLaserPulsePoint(design, strainCenterMm, staticReflectance));
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
  if (isPhaseScannedField(design.strainShape)) return solvePhaseSweepExperiment(design);
  const positionStepMm = (design.pulseSweepEndMm - design.pulseSweepStartMm) / (design.pulseSweepPointCount - 1);
  const positionsMm = Array.from({ length: design.pulseSweepPointCount }, (_, index) =>
    Number((design.pulseSweepStartMm + positionStepMm * index).toPrecision(12)),
  );
  const staticReflectance = solveStaticReflectance(design);
  const points = positionsMm.map((strainCenterMm) => solveFixedLaserPulsePoint(design, strainCenterMm, staticReflectance));

  return {
    laserWavelengthNm: design.fixedLaserWavelengthNm,
    staticBraggWavelengthNm: getHybridDesignBraggWavelengthNm(design),
    strainWidthMm: design.strainWidthMm,
    strainShape: design.strainShape,
    segmentCount: design.segmentCount,
    positionStepMm,
    points,
    metrics: calculateMovingPulseMetrics(points, staticReflectance),
  };
}

/** Runs the fixed-laser moving active-region experiment in cancellable position chunks. */
export async function solveMovingPulseExperimentAsync(
  design: HybridBraggDesignInputs,
  options: MovingPulseSolveOptions = {},
): Promise<MovingPulseExperimentResult> {
  if (isPhaseScannedField(design.strainShape)) {
    const result = solvePhaseSweepExperiment(design);
    options.onProgress?.({ completed: result.points.length, total: result.points.length });
    await yieldToBrowser();
    return result;
  }
  const positionStepMm = (design.pulseSweepEndMm - design.pulseSweepStartMm) / (design.pulseSweepPointCount - 1);
  const positionsMm = Array.from({ length: design.pulseSweepPointCount }, (_, index) =>
    Number((design.pulseSweepStartMm + positionStepMm * index).toPrecision(12)),
  );
  const staticReflectance = solveStaticReflectance(design);
  const points: FixedLaserPulsePoint[] = [];
  options.onProgress?.({ completed: 0, total: positionsMm.length });

  for (const strainCenterMm of positionsMm) {
    throwIfAborted(options.signal);
    points.push(solveFixedLaserPulsePoint(design, strainCenterMm, staticReflectance));
    options.onProgress?.({ completed: points.length, total: positionsMm.length });
    await yieldToBrowser();
  }

  throwIfAborted(options.signal);
  return {
    laserWavelengthNm: design.fixedLaserWavelengthNm,
    staticBraggWavelengthNm: getHybridDesignBraggWavelengthNm(design),
    strainWidthMm: design.strainWidthMm,
    strainShape: design.strainShape,
    segmentCount: design.segmentCount,
    positionStepMm,
    points,
    metrics: calculateMovingPulseMetrics(points, staticReflectance),
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
    localization: calculateMovingResponseLocalization(points, staticReflectance),
  };
}

/** Classifies whether enhancement is localized into one dominant interior response. */
export function calculateMovingResponseLocalization(
  points: FixedLaserPulsePoint[],
  staticReflectance: number,
): MovingResponseLocalizationMetrics {
  if (points.length === 0) {
    throw new Error('Moving response localization metrics require at least one position sample.');
  }

  const positiveEnhancements = points.map((point) => Math.max(0, point.reflectance - staticReflectance));
  const localPeakIndexes = findLocalPeakIndexes(positiveEnhancements)
    .filter((index) => positiveEnhancements[index] > MINIMUM_RATIO_DENOMINATOR)
    .sort((left, right) => positiveEnhancements[right] - positiveEnhancements[left]);
  const primaryIndex = localPeakIndexes[0] ?? indexOfMaximum(positiveEnhancements);
  const secondaryIndex = localPeakIndexes.find((index) => index !== primaryIndex) ?? null;
  const primaryEnhancement = positiveEnhancements[primaryIndex] ?? 0;
  const secondaryEnhancement = secondaryIndex === null ? 0 : positiveEnhancements[secondaryIndex];
  const effectiveWidth = calculateEffectiveOpticalResponseWidth(points, staticReflectance);
  const localizedFraction = calculateLocalizedFraction(points, positiveEnhancements, primaryIndex, effectiveWidth);
  const primaryPoint = points[primaryIndex];
  const secondaryPoint = secondaryIndex === null ? null : points[secondaryIndex];
  const boundaryDominated = isBoundaryDominated(primaryPoint);
  const interiorPeakEnhancement = points.reduce((best, point, index) => (
    isBoundaryDominated(point) ? best : Math.max(best, positiveEnhancements[index])
  ), 0);
  const peakDominance = secondaryEnhancement > MINIMUM_RATIO_DENOMINATOR
    ? primaryEnhancement / secondaryEnhancement
    : primaryEnhancement > MINIMUM_RATIO_DENOMINATOR ? null : 0;
  const secondaryPeakRatio = primaryEnhancement > MINIMUM_RATIO_DENOMINATOR
    ? secondaryEnhancement / primaryEnhancement
    : null;
  const responseClassification = classifyMovingResponse({
    peakEnhancement: primaryEnhancement,
    secondaryPeakRatio,
    localizedFraction,
    boundaryDominated,
    effectiveWidth,
    gratingLengthMm: inferGratingLengthMm(points),
  });

  return {
    primaryPeak: primaryEnhancement > MINIMUM_RATIO_DENOMINATOR
      ? {
          positionMm: primaryPoint.strainCenterMm,
          enhancement: primaryEnhancement,
          reflectance: primaryPoint.reflectance,
        }
      : null,
    secondaryPeak: secondaryPoint && secondaryEnhancement > MINIMUM_RATIO_DENOMINATOR
      ? {
          positionMm: secondaryPoint.strainCenterMm,
          enhancement: secondaryEnhancement,
          reflectance: secondaryPoint.reflectance,
        }
      : null,
    peakDominance,
    secondaryPeakRatio,
    localizedFraction,
    boundaryDominated,
    interiorPeakEnhancement,
    responseClassification,
    oscillationCollapseCandidate: responseClassification === 'single-dominant',
  };
}

/** Runs the detuning x strain-width x coupling research map for both configured strain shapes. */
export async function solveMovingResponseRegimeMapAsync(
  design: HybridBraggDesignInputs,
  settings: MovingResponseRegimeMapSettings = {},
  options: MovingPulseSolveOptions = {},
): Promise<MovingResponseRegimeMapResult> {
  const staticBraggWavelengthNm = getHybridDesignBraggWavelengthNm(design);
  const strainShapes = settings.strainShapes ?? ['rectangular', 'gaussian'];
  const indexModulations = settings.indexModulations ?? DEFAULT_INDEX_MODULATIONS;
  const widthRatios = settings.strainWidthRatiosToCouplingLength ?? DEFAULT_WIDTH_RATIOS_TO_COUPLING_LENGTH;
  const detuningCount = settings.detuningValuesNm?.length ?? DEFAULT_DETUNING_EDGE_MULTIPLES.length;
  const total = strainShapes.length * indexModulations.length * widthRatios.length * detuningCount;
  const classificationCounts = createClassificationCounts();
  const slices: MovingResponseRegimeMapSlice[] = [];
  let completed = 0;
  options.onProgress?.({ completed, total });

  for (const strainShape of strainShapes) {
    for (const indexModulation of indexModulations) {
      const couplingCoefficientPerM = getCouplingCoefficientPerM(indexModulation, staticBraggWavelengthNm / 1e9);
      const couplingLengthMm = couplingCoefficientPerM > MINIMUM_RATIO_DENOMINATOR
        ? 1e3 / couplingCoefficientPerM
        : null;
      const kappaLengthProduct = couplingCoefficientPerM * design.lengthMm / 1e3;
      const detuningValuesNm = settings.detuningValuesNm ?? getDefaultDetuningValuesNm({ ...design, indexModulation });
      const strainWidthValuesMm = widthRatios.map((ratio) =>
        couplingLengthMm === null ? design.strainWidthMm : Math.min(design.lengthMm, Math.max(0.001, ratio * couplingLengthMm)),
      );
      const cells: MovingResponseRegimeMapCell[][] = [];

      for (const strainWidthMm of strainWidthValuesMm) {
        const row: MovingResponseRegimeMapCell[] = [];
        for (const detuningNm of detuningValuesNm) {
          throwIfAborted(options.signal);
          const pointDesign = {
            ...design,
            indexModulation,
            strainShape,
            strainWidthMm,
            fixedLaserWavelengthNm: staticBraggWavelengthNm + detuningNm,
          };
          const result = solveMovingPulseExperiment(pointDesign);
          const effectiveWidthMm = result.metrics.effectiveWidth.widthMm;
          const cell: MovingResponseRegimeMapCell = {
            detuningNm,
            laserWavelengthNm: pointDesign.fixedLaserWavelengthNm,
            strainWidthMm,
            strainWidthToCouplingLength: couplingLengthMm ? strainWidthMm / couplingLengthMm : null,
            indexModulation,
            couplingCoefficientPerM,
            couplingLengthMm,
            kappaLengthProduct,
            staticReflectance: result.metrics.staticReflectance,
            peakReflectance: result.metrics.peakReflectance,
            peakEnhancement: result.metrics.peakEnhancement,
            primaryPeakPositionMm: result.metrics.localization.primaryPeak?.positionMm ?? null,
            secondaryPeakRatio: result.metrics.localization.secondaryPeakRatio,
            localizedFraction: result.metrics.localization.localizedFraction,
            effectiveWidthMm,
            effectiveWidthToCouplingLength: effectiveWidthMm !== null && couplingLengthMm ? effectiveWidthMm / couplingLengthMm : null,
            positionStdReflectance: result.metrics.standardDeviationReflectance,
            classification: result.metrics.localization.responseClassification,
            boundaryDominated: result.metrics.localization.boundaryDominated,
            strainShape,
            result,
          };
          classificationCounts[cell.classification] += 1;
          row.push(cell);
          completed += 1;
          options.onProgress?.({ completed, total });
          await yieldToBrowser();
        }
        cells.push(row);
      }

      slices.push({ strainShape, indexModulation, couplingCoefficientPerM, couplingLengthMm, kappaLengthProduct, detuningValuesNm, cells });
    }
  }

  return {
    staticBraggWavelengthNm,
    detuningValuesNm: slices[0]?.detuningValuesNm ?? [],
    strainWidthValuesMm: slices[0]?.cells.map((row) => row[0]?.strainWidthMm ?? 0) ?? [],
    strainShapes,
    slices,
    summary: {
      classificationCounts,
      overallOutcome: classifyOverallOutcome(classificationCounts),
    },
  };
}

/** Compares prescribed perturbation-field families on one permanent grating and fixed laser setup. */
export function solvePerturbationFieldComparison(
  design: HybridBraggDesignInputs,
  strainShapes: HybridBraggDesignInputs['strainShape'][] = DEFAULT_COMPARISON_SHAPES,
): PerturbationFieldComparisonResult {
  const families = strainShapes.map((strainShape) => {
    const parameterKind = isPhaseScannedField(strainShape) ? 'phase' : 'position';
    const familyDesign = { ...design, strainShape };
    const result = parameterKind === 'position'
      ? solveMovingPulseExperiment(familyDesign)
      : solvePhaseSweepExperiment(familyDesign);
    const metrics = result.metrics;
    const repeatSpacingMm = parameterKind === 'phase'
      ? estimateRepeatSpacingMm(result.points)
      : null;
    const classification = classifyComparisonFamily(strainShape, metrics.localization.responseClassification);
    return {
      strainShape,
      parameterKind,
      staticReflectance: metrics.staticReflectance,
      peakReflectance: metrics.peakReflectance,
      peakEnhancement: metrics.peakEnhancement,
      secondaryPeakRatio: metrics.localization.secondaryPeakRatio,
      localizedFraction: metrics.localization.localizedFraction,
      effectiveWidthMm: metrics.effectiveWidth.widthMm,
      repeatSpacingMm,
      phaseSensitivity: parameterKind === 'phase' ? metrics.standardDeviationReflectance : null,
      classification,
      opticalAssessment: assessComparisonFamily(metrics, classification),
      result: { ...result, metrics: { ...metrics, localization: { ...metrics.localization, responseClassification: classification } } },
    } satisfies PerturbationFieldComparisonFamily;
  });

  const rankedFamilies = [...families].sort((left, right) => scoreComparisonFamily(right) - scoreComparisonFamily(left));
  return {
    staticBraggWavelengthNm: getHybridDesignBraggWavelengthNm(design),
    laserWavelengthNm: design.fixedLaserWavelengthNm,
    families,
    mostPromising: rankedFamilies[0]?.opticalAssessment === 'poor-current-model' ? null : rankedFamilies[0] ?? null,
  };
}

/** Detects active regions from calculated backward optical intensity, not perturbation amplitude. */
export function detectReflectionRegions(
  spatialField: SpatialCoupledModeFieldSample[],
  thresholdFraction = 0.5,
): ReflectionRegion[] {
  if (spatialField.length === 0) return [];
  const threshold = Math.max(0, Math.min(1, thresholdFraction));
  const regions: ReflectionRegion[] = [];
  let startIndex: number | null = null;

  spatialField.forEach((sample, index) => {
    const active = sample.normalizedBackwardIntensity >= threshold && sample.backwardIntensity > MINIMUM_RATIO_DENOMINATOR;
    if (active && startIndex === null) startIndex = index;
    if ((!active || index === spatialField.length - 1) && startIndex !== null) {
      const endIndex = active && index === spatialField.length - 1 ? index : index - 1;
      regions.push(createReflectionRegion(spatialField, startIndex, endIndex));
      startIndex = null;
    }
  });

  return regions.sort((left, right) => right.peakNormalizedIntensity - left.peakNormalizedIntensity);
}

/** Generates calculated optical-field frames for reflection-region playback and depth-time maps. */
export function solveReflectionRegionEvolution(
  design: HybridBraggDesignInputs,
  thresholdFraction = 0.5,
): ReflectionRegionEvolutionResult {
  const parameterKind: ReflectionRegionFrame['parameterKind'] = design.strainShape === 'piezo-array'
    ? 'actuator-index'
    : isPhaseScannedField(design.strainShape) ? 'phase' : 'position';
  const parameterValues = parameterKind === 'phase'
    ? Array.from({ length: Math.max(3, design.pulseSweepPointCount) }, (_, index) =>
        Number((((2 * Math.PI) / Math.max(3, design.pulseSweepPointCount)) * index).toPrecision(12)),
      )
    : parameterKind === 'actuator-index'
      ? Array.from({ length: Math.max(1, Math.round(design.actuatorCount)) }, (_, index) => index)
      : Array.from({ length: design.pulseSweepPointCount }, (_, index) => {
        const step = (design.pulseSweepEndMm - design.pulseSweepStartMm) / (design.pulseSweepPointCount - 1);
        return Number((design.pulseSweepStartMm + step * index).toPrecision(12));
      });
  const frames = parameterValues.map((parameterValue) => {
    const frameDesign = parameterKind === 'phase'
      ? { ...design, perturbationTemporalPhaseRadians: parameterValue }
      : parameterKind === 'actuator-index'
        ? { ...design, activeActuatorIndex: parameterValue }
        : { ...design, strainCenterMm: parameterValue };
    const result = solveHybridBraggCoupledModePoint(createHybridBraggModel(frameDesign), design.fixedLaserWavelengthNm);
    const regions = detectReflectionRegions(result.spatialField, thresholdFraction);
    const activeSectionIds = getActiveSectionIds(regions);
    return {
      parameterValue,
      parameterKind,
      reflectance: result.reflectance,
      spatialField: result.spatialField,
      regions,
      activeSectionIds,
    };
  });

  return { thresholdFraction, frames };
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

function solveFixedLaserPulsePoint(
  design: HybridBraggDesignInputs,
  strainCenterMm: number,
  staticReflectance: number,
): FixedLaserPulsePoint {
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

function findLocalPeakIndexes(values: number[]): number[] {
  return values
    .map((value, index) => {
      const previous = values[index - 1] ?? Number.NEGATIVE_INFINITY;
      const next = values[index + 1] ?? Number.NEGATIVE_INFINITY;
      return value >= previous && value >= next ? index : -1;
    })
    .filter((index) => index >= 0);
}

function indexOfMaximum(values: number[]): number {
  return values.reduce((bestIndex, value, index) => (value > values[bestIndex] ? index : bestIndex), 0);
}

function calculateLocalizedFraction(
  points: FixedLaserPulsePoint[],
  enhancements: number[],
  primaryIndex: number,
  effectiveWidth: MovingPulseEffectiveWidth,
): number | null {
  const totalPositiveArea = integratePositiveEnhancement(points, enhancements, 0, points.length - 1);
  if (totalPositiveArea <= MINIMUM_RATIO_DENOMINATOR) return null;

  const sampleStepMm = points.length > 1
    ? Math.abs(points[1].strainCenterMm - points[0].strainCenterMm)
    : 0;
  const windowWidthMm = effectiveWidth.status === 'single-peak'
    ? Math.max(effectiveWidth.widthMm, sampleStepMm)
    : Math.max(sampleStepMm * 2, inferPulseWidthMm(points[primaryIndex]));
  const peakPositionMm = points[primaryIndex].strainCenterMm;
  const startMm = peakPositionMm - windowWidthMm / 2;
  const endMm = peakPositionMm + windowWidthMm / 2;
  const localizedArea = integratePositiveEnhancementWindow(points, enhancements, startMm, endMm);
  return Math.min(1, localizedArea / totalPositiveArea);
}

function integratePositiveEnhancement(
  points: FixedLaserPulsePoint[],
  enhancements: number[],
  startIndex: number,
  endIndex: number,
): number {
  if (points.length === 1) return enhancements[0];
  let area = 0;
  for (let index = Math.max(0, startIndex); index < Math.min(points.length - 1, endIndex); index += 1) {
    const widthMm = points[index + 1].strainCenterMm - points[index].strainCenterMm;
    area += Math.max(0, widthMm) * (enhancements[index] + enhancements[index + 1]) / 2;
  }
  return area;
}

function integratePositiveEnhancementWindow(
  points: FixedLaserPulsePoint[],
  enhancements: number[],
  startMm: number,
  endMm: number,
): number {
  if (points.length < 2 || endMm <= startMm) return 0;

  let area = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const x0 = points[index].strainCenterMm;
    const x1 = points[index + 1].strainCenterMm;
    const segmentStartMm = Math.max(startMm, x0);
    const segmentEndMm = Math.min(endMm, x1);
    if (segmentEndMm <= segmentStartMm || x1 <= x0) continue;

    const y0 = interpolateValueAtPosition(x0, enhancements[index], x1, enhancements[index + 1], segmentStartMm);
    const y1 = interpolateValueAtPosition(x0, enhancements[index], x1, enhancements[index + 1], segmentEndMm);
    area += (segmentEndMm - segmentStartMm) * (y0 + y1) / 2;
  }
  return area;
}

function interpolateValueAtPosition(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x: number,
): number {
  if (x1 === x0) return y0;
  const fraction = (x - x0) / (x1 - x0);
  return y0 + (y1 - y0) * fraction;
}

function classifyMovingResponse({
  peakEnhancement,
  secondaryPeakRatio,
  localizedFraction,
  boundaryDominated,
  effectiveWidth,
  gratingLengthMm,
}: {
  peakEnhancement: number;
  secondaryPeakRatio: number | null;
  localizedFraction: number | null;
  boundaryDominated: boolean;
  effectiveWidth: MovingPulseEffectiveWidth;
  gratingLengthMm: number;
}): MovingResponseClassification {
  if (peakEnhancement <= MINIMUM_RATIO_DENOMINATOR) return 'no-enhancement';
  if (peakEnhancement < LOCALIZATION_MINIMUM_ENHANCEMENT) return 'weak';
  if (effectiveWidth.status === 'multiple-comparable-peaks') return 'multi-peak';
  if (secondaryPeakRatio !== null && secondaryPeakRatio >= SINGLE_DOMINANT_SECONDARY_RATIO) return 'multi-peak';
  if (effectiveWidth.status !== 'single-peak') return 'broad';

  const widthRatio = gratingLengthMm > MINIMUM_RATIO_DENOMINATOR
    ? effectiveWidth.widthMm / gratingLengthMm
    : Number.POSITIVE_INFINITY;
  if (widthRatio > BROAD_WIDTH_TO_GRATING_LENGTH || (localizedFraction !== null && localizedFraction < SINGLE_DOMINANT_LOCALIZED_FRACTION)) {
    return 'broad';
  }
  return boundaryDominated ? 'broad' : 'single-dominant';
}

function isBoundaryDominated(point: FixedLaserPulsePoint): boolean {
  const nominalWidthMm = inferPulseWidthMm(point);
  return point.nominalOverlapMm + 1e-9 < nominalWidthMm;
}

function inferPulseWidthMm(point: FixedLaserPulsePoint): number {
  return Math.max(0, point.nominalSupportEndMm - point.nominalSupportStartMm);
}

function inferGratingLengthMm(points: FixedLaserPulsePoint[]): number {
  return points.reduce((maxEnd, point) => Math.max(maxEnd, point.clippedSupportEndMm), 0);
}

function getDefaultDetuningValuesNm(design: HybridBraggDesignInputs): number[] {
  const braggWavelengthNm = getHybridDesignBraggWavelengthNm(design);
  const edgeEstimateNm = Math.max(0.01, braggWavelengthNm * Math.max(Math.abs(design.indexModulation), 1e-5) / design.averageIndex);
  return DEFAULT_DETUNING_EDGE_MULTIPLES.map((multiple) =>
    Number((multiple * edgeEstimateNm).toPrecision(8)),
  );
}

function createClassificationCounts(): Record<MovingResponseClassification, number> {
  return {
    'single-dominant': 0,
    'multi-peak': 0,
    broad: 0,
    weak: 0,
    'no-enhancement': 0,
    'periodic-multi-plane': 0,
    'stationary-plane-array': 0,
    'moving-envelope': 0,
  };
}

function classifyOverallOutcome(
  counts: Record<MovingResponseClassification, number>,
): MovingResponseRegimeMapResult['summary']['overallOutcome'] {
  if (counts['single-dominant'] >= 3) return 'clear-regime-found';
  if (counts['single-dominant'] > 0) return 'marginal-fragile-regimes-found';
  return 'no-collapse-regime-found';
}

function solvePhaseSweepExperiment(design: HybridBraggDesignInputs): MovingPulseExperimentResult {
  const phaseCount = Math.max(3, design.pulseSweepPointCount);
  const staticReflectance = solveStaticReflectance(design);
  const phaseStep = (2 * Math.PI) / phaseCount;
  const points = Array.from({ length: phaseCount }, (_, index) => {
    const phase = Number((phaseStep * index).toPrecision(12));
    const reflectance = solveHybridBraggCoupledModePoint(
      createHybridBraggModel({ ...design, perturbationTemporalPhaseRadians: phase }),
      design.fixedLaserWavelengthNm,
    ).reflectance;
    return {
      strainCenterMm: phase,
      reflectance,
      enhancement: reflectance - staticReflectance,
      nominalSupportStartMm: phase - phaseStep / 2,
      nominalSupportEndMm: phase + phaseStep / 2,
      clippedSupportStartMm: phase - phaseStep / 2,
      clippedSupportEndMm: phase + phaseStep / 2,
      nominalOverlapMm: phaseStep,
    };
  });
  return {
    laserWavelengthNm: design.fixedLaserWavelengthNm,
    staticBraggWavelengthNm: getHybridDesignBraggWavelengthNm(design),
    strainWidthMm: design.strainWidthMm,
    strainShape: design.strainShape,
    segmentCount: design.segmentCount,
    positionStepMm: phaseStep,
    points,
    metrics: calculateMovingPulseMetrics(points, staticReflectance),
  };
}

function isPhaseScannedField(strainShape: HybridBraggDesignInputs['strainShape']): boolean {
  return strainShape === 'traveling-sinusoid' || strainShape === 'standing-wave' || strainShape === 'multi-tone';
}

function classifyComparisonFamily(
  strainShape: HybridBraggDesignInputs['strainShape'],
  baseClassification: MovingResponseClassification,
): MovingResponseClassification {
  if (baseClassification === 'no-enhancement' || baseClassification === 'weak') return baseClassification;
  if (strainShape === 'traveling-sinusoid' || strainShape === 'multi-tone') return 'periodic-multi-plane';
  if (strainShape === 'standing-wave') return 'stationary-plane-array';
  if (strainShape === 'carrier-envelope') return 'moving-envelope';
  return baseClassification;
}

function assessComparisonFamily(
  metrics: MovingPulseMetrics,
  classification: MovingResponseClassification,
): PerturbationFieldComparisonFamily['opticalAssessment'] {
  if (metrics.peakEnhancement < LOCALIZATION_MINIMUM_ENHANCEMENT) return 'poor-current-model';
  if (classification === 'single-dominant') return 'most-promising';
  if (classification === 'moving-envelope' || classification === 'periodic-multi-plane' || classification === 'stationary-plane-array') {
    return metrics.localization.secondaryPeakRatio !== null && metrics.localization.secondaryPeakRatio > 0.85
      ? 'unclear'
      : 'promising-conditional';
  }
  if (classification === 'multi-peak' || classification === 'broad') return 'unclear';
  return 'poor-current-model';
}

function scoreComparisonFamily(family: PerturbationFieldComparisonFamily): number {
  const localizedFraction = family.localizedFraction ?? 0;
  const secondaryPenalty = family.secondaryPeakRatio ?? 0;
  const assessmentBonus = family.opticalAssessment === 'most-promising'
    ? 2
    : family.opticalAssessment === 'promising-conditional'
      ? 1
      : family.opticalAssessment === 'unclear'
        ? 0.25
        : -1;
  return family.peakEnhancement * 10 + localizedFraction - secondaryPenalty + assessmentBonus;
}

function estimateRepeatSpacingMm(points: FixedLaserPulsePoint[]): number | null {
  const peakIndexes = findLocalPeakIndexes(points.map((point) => Math.max(0, point.enhancement)));
  if (peakIndexes.length < 2) return null;
  const spacings = peakIndexes.slice(1).map((index, offset) =>
    points[index].strainCenterMm - points[peakIndexes[offset]].strainCenterMm,
  );
  return spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;
}

function createReflectionRegion(
  spatialField: SpatialCoupledModeFieldSample[],
  startIndex: number,
  endIndex: number,
): ReflectionRegion {
  const samples = spatialField.slice(startIndex, endIndex + 1);
  const peak = samples.reduce((best, sample) =>
    sample.normalizedBackwardIntensity > best.normalizedBackwardIntensity ? sample : best,
  samples[0]);
  const startMm = spatialField[startIndex].zM * 1e3;
  const endMm = spatialField[endIndex].zM * 1e3;
  const sectionIds = Array.from(new Set(samples
    .map((sample) => sample.sectionId)
    .filter((sectionId): sectionId is number => sectionId !== null)));

  return {
    startMm,
    endMm,
    centerMm: (startMm + endMm) / 2,
    peakMm: peak.zM * 1e3,
    peakNormalizedIntensity: peak.normalizedBackwardIntensity,
    sectionIds,
  };
}

function getActiveSectionIds(regions: ReflectionRegion[]): number[] {
  return Array.from(new Set(regions.flatMap((region) => region.sectionIds))).sort((left, right) => left - right);
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

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error('The stale moving-region calculation was cancelled.');
  error.name = 'AbortError';
  throw error;
}

async function yieldToBrowser(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
