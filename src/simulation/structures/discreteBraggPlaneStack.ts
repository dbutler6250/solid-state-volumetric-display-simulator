import { solveCoupledModeSections, type CoupledModeSection } from '../solvers/coupledMode/spatialBraggSolver';
import { getCouplingCoefficientPerM } from './hybridBraggGrating';

export type DiscreteBraggPlane = {
  centerM: number;
  thicknessM: number;
  periodM: number;
  averageIndex: number;
  indexModulation: number;
  phaseRadians: number;
  nativeBraggWavelengthM: number;
  activationState: 'off' | 'on';
};

export type DiscreteBraggPlaneStack = {
  planes: DiscreteBraggPlane[];
  totalLengthM: number;
  incidentIndex: number;
  exitIndex: number;
};

export type DiscretePlaneFieldSample = {
  zM: number;
  startM: number;
  endM: number;
  lengthM: number;
  planeIndex: number | null;
  backwardIntensity: number;
  normalizedBackwardIntensity: number;
};

export type DiscretePlaneRegionMetric = {
  planeIndex: number;
  centerM: number;
  thicknessM: number;
  fractionOfBackwardIntensity: number;
  meanNormalizedBackwardIntensity: number;
};

export type DiscretePlaneStackResult = {
  reflectance: number;
  transmission: number;
  selectedPlaneIndex: number | null;
  selectedPlaneFraction: number | null;
  largestCompetitorPlaneIndex: number | null;
  secondaryToPrimaryRatio: number | null;
  planeMetrics: DiscretePlaneRegionMetric[];
  field: DiscretePlaneFieldSample[];
};

type StackSegment = CoupledModeSection & {
  startM: number;
  endM: number;
  planeIndex: number | null;
};

const EPSILON = 1e-12;

/** Builds an ordered discrete Bragg-plane stack with transparent gaps in a continuous substrate. */
export function createUniformDiscreteBraggPlaneStack(options: {
  totalLengthM: number;
  planeCount: number;
  planeThicknessM: number;
  averageIndex: number;
  nativeBraggWavelengthM: number;
  offIndexModulation: number;
  onIndexModulation: number;
  selectedPlaneIndex: number | null;
  spacing: 'periodic' | 'aperiodic' | 'phase-scrambled';
}): DiscreteBraggPlaneStack {
  const pitchM = options.totalLengthM / options.planeCount;
  if (options.planeThicknessM >= pitchM) {
    throw new Error('Plane thickness must be smaller than plane pitch.');
  }
  const periodM = options.nativeBraggWavelengthM / (2 * options.averageIndex);
  const planes = Array.from({ length: options.planeCount }, (_, index) => {
    const centerM = planeCenterM(index, pitchM, options.totalLengthM, options.spacing);
    return {
      centerM,
      thicknessM: options.planeThicknessM,
      periodM,
      averageIndex: options.averageIndex,
      indexModulation: index === options.selectedPlaneIndex ? options.onIndexModulation : options.offIndexModulation,
      phaseRadians: options.spacing === 'phase-scrambled' ? deterministicPhase(index) : 0,
      nativeBraggWavelengthM: options.nativeBraggWavelengthM,
      activationState: index === options.selectedPlaneIndex ? 'on' as const : 'off' as const,
    };
  }).sort((left, right) => left.centerM - right.centerM);
  return {
    planes,
    totalLengthM: options.totalLengthM,
    incidentIndex: options.averageIndex,
    exitIndex: options.averageIndex,
  };
}

/** Solves a discrete Bragg-plane stack as coupled-mode plane sections separated by coherent phase gaps. */
export function solveDiscreteBraggPlaneStack(stack: DiscreteBraggPlaneStack, wavelengthM: number): DiscretePlaneStackResult {
  const segments = buildStackSegments(stack, wavelengthM);
  const sectionResult = solveCoupledModeSections(segments);
  const rawField = segments.map((segment) => ({
    zM: (segment.startM + segment.endM) / 2,
    startM: segment.startM,
    endM: segment.endM,
    lengthM: segment.lengthM,
    planeIndex: segment.planeIndex,
    backwardIntensity: planeBackwardIntensityProxy(segment, sectionResult.reflectance),
    normalizedBackwardIntensity: 0,
  }));
  const maxBackward = Math.max(...rawField.map((sample) => sample.backwardIntensity), EPSILON);
  const field = rawField.map((sample) => ({
    ...sample,
    normalizedBackwardIntensity: sample.backwardIntensity / maxBackward,
  }));
  const planeMetrics = stack.planes.map((plane, planeIndex) => {
    const samples = field.filter((sample) => sample.planeIndex === planeIndex);
    const totalBackward = field.reduce((sum, sample) => sum + sample.backwardIntensity * sample.lengthM, 0);
    const planeBackward = samples.reduce((sum, sample) => sum + sample.backwardIntensity * sample.lengthM, 0);
    return {
      planeIndex,
      centerM: plane.centerM,
      thicknessM: plane.thicknessM,
      fractionOfBackwardIntensity: totalBackward > 0 ? planeBackward / totalBackward : 0,
      meanNormalizedBackwardIntensity: average(samples.map((sample) => sample.normalizedBackwardIntensity)),
    };
  });
  const selectedPlaneIndex = stack.planes.findIndex((plane) => plane.activationState === 'on');
  const selected = selectedPlaneIndex >= 0 ? planeMetrics[selectedPlaneIndex] : null;
  const competitors = planeMetrics.filter((metric) => metric.planeIndex !== selectedPlaneIndex);
  const largestCompetitor = [...competitors].sort((left, right) => right.fractionOfBackwardIntensity - left.fractionOfBackwardIntensity)[0] ?? null;
  return {
    reflectance: sectionResult.reflectance,
    transmission: sectionResult.transmission,
    selectedPlaneIndex: selectedPlaneIndex >= 0 ? selectedPlaneIndex : null,
    selectedPlaneFraction: selected?.fractionOfBackwardIntensity ?? null,
    largestCompetitorPlaneIndex: largestCompetitor?.planeIndex ?? null,
    secondaryToPrimaryRatio: selected && selected.fractionOfBackwardIntensity > 0
      ? (largestCompetitor?.fractionOfBackwardIntensity ?? 0) / selected.fractionOfBackwardIntensity
      : null,
    planeMetrics,
    field,
  };
}

/** Returns the weak-grating Delta n required for an isolated plane reflectance target. */
export function getRequiredPlaneIndexModulation(reflectance: number, thicknessM: number, braggWavelengthM: number): number {
  const kappa = atanh(Math.sqrt(reflectance)) / thicknessM;
  return kappa * braggWavelengthM / Math.PI;
}

function buildStackSegments(stack: DiscreteBraggPlaneStack, wavelengthM: number): StackSegment[] {
  const segments: StackSegment[] = [];
  let cursorM = 0;
  stack.planes.forEach((plane, planeIndex) => {
    const startM = Math.max(0, plane.centerM - plane.thicknessM / 2);
    const endM = Math.min(stack.totalLengthM, plane.centerM + plane.thicknessM / 2);
    if (startM > cursorM + EPSILON) {
      segments.push(createGapSegment(cursorM, startM, plane.averageIndex, wavelengthM));
    }
    segments.push(createPlaneSegment(startM, endM, plane, wavelengthM, planeIndex));
    cursorM = endM;
  });
  if (cursorM < stack.totalLengthM - EPSILON) {
    const averageIndex = stack.planes[0]?.averageIndex ?? stack.incidentIndex;
    segments.push(createGapSegment(cursorM, stack.totalLengthM, averageIndex, wavelengthM));
  }
  return segments.filter((segment) => segment.lengthM > EPSILON);
}

function createPlaneSegment(startM: number, endM: number, plane: DiscreteBraggPlane, wavelengthM: number, planeIndex: number): StackSegment {
  return {
    startM,
    endM,
    planeIndex,
    lengthM: endM - startM,
    couplingCoefficientPerM: getCouplingCoefficientPerM(plane.indexModulation, plane.nativeBraggWavelengthM),
    detuningPerM: detuningPerM(plane.averageIndex, plane.periodM, wavelengthM),
    phaseRadians: plane.phaseRadians,
  };
}

function createGapSegment(startM: number, endM: number, averageIndex: number, wavelengthM: number): StackSegment {
  return {
    startM,
    endM,
    planeIndex: null,
    lengthM: endM - startM,
    couplingCoefficientPerM: 0,
    detuningPerM: (2 * Math.PI * averageIndex) / wavelengthM,
  };
}

function detuningPerM(averageIndex: number, periodM: number, wavelengthM: number): number {
  return (2 * Math.PI * averageIndex) / wavelengthM - Math.PI / periodM;
}

function planeBackwardIntensityProxy(segment: StackSegment, reflectance: number): number {
  if (segment.planeIndex === null) return reflectance * 1e-4;
  const couplingLengthProduct = Math.abs(segment.couplingCoefficientPerM) * segment.lengthM;
  return reflectance * Math.max(1e-8, couplingLengthProduct ** 2);
}

function planeCenterM(index: number, pitchM: number, totalLengthM: number, spacing: 'periodic' | 'aperiodic' | 'phase-scrambled'): number {
  const nominal = (index + 0.5) * pitchM;
  if (spacing === 'periodic' || spacing === 'phase-scrambled') return nominal;
  const jitter = 0.18 * pitchM * Math.sin((index + 1) * 2.399963229728653);
  return Math.min(totalLengthM - 0.5 * pitchM, Math.max(0.5 * pitchM, nominal + jitter));
}

function deterministicPhase(index: number): number {
  return ((index * 2.399963229728653) % (2 * Math.PI));
}

function atanh(value: number): number {
  return 0.5 * Math.log((1 + value) / (1 - value));
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
