import type { HybridBraggDesignInputs } from '../../types/simulation';
import type { SpatialCoupledModeFieldSample } from '../solvers/coupledMode/spatialBraggSolver';
import { createHybridBraggModel } from '../structures/hybridBraggGrating';
import { solveHybridBraggCoupledModePoint } from '../solvers/coupledMode/spatialBraggSolver';
import { detectReflectionRegions, solveReflectionRegionEvolution, type ReflectionRegion } from '../experiments/hybridBraggExperiments';

export type TargetRegionWeighting =
  | { kind: 'rectangular' }
  | { kind: 'gaussian'; sigmaFractionOfWidth: number };

export type TargetReflectionState = {
  targetDepthMm: number;
  targetWidthMm: number;
  controlState: number;
  controlKind: 'position' | 'phase' | 'actuator-index';
  targetSectionId?: number;
  weighting?: TargetRegionWeighting;
};

export type ObjectiveMetrics = {
  targetPower: number;
  offTargetPower: number;
  strongestCompetitorPower: number;
  targetSelectivity: number | null;
  totalReflectance: number;
  staticReflectance: number;
  peakEnhancement: number;
  activeRegionWidthMm: number | null;
  activeRegionCount: number;
  secondaryPeakRatio: number | null;
};

export type UsefulResponseClassification =
  | 'high-selectivity / meaningful-response'
  | 'high-selectivity / weak-response'
  | 'low-selectivity';

export type MultiStateObjectiveMetrics = {
  states: Array<TargetReflectionState & { metrics: ObjectiveMetrics }>;
  minimumSelectivity: number | null;
  medianSelectivity: number | null;
  meanSelectivity: number | null;
  addressableFractions: Record<string, number>;
};

const DEFAULT_THRESHOLDS = [1.1, 1.5, 2];
const EPSILON = 1e-12;

/** Evaluates one requested optical depth state against calculated normalized backward intensity. */
export function evaluateTargetReflectionState(
  design: HybridBraggDesignInputs,
  target: TargetReflectionState,
): ObjectiveMetrics {
  const stateDesign = applyTargetControlState(design, target);
  const staticReflectance = solveHybridBraggCoupledModePoint(
    createHybridBraggModel({ ...stateDesign, peakStrain: 0 }),
    stateDesign.fixedLaserWavelengthNm,
  ).reflectance;
  const result = solveHybridBraggCoupledModePoint(createHybridBraggModel(stateDesign), stateDesign.fixedLaserWavelengthNm);
  const regions = detectReflectionRegions(result.spatialField, 0.5);
  const targetPower = integrateTargetPower(result.spatialField, target);
  const totalPower = integratePower(result.spatialField, () => 1);
  const offTargetPower = Math.max(0, totalPower - targetPower);
  const strongestCompetitorPower = getStrongestCompetitorPower(result.spatialField, regions, target);
  const activeRegion = getTargetRegion(regions, target);
  const targetSelectivity = strongestCompetitorPower > EPSILON
    ? targetPower / strongestCompetitorPower
    : targetPower > EPSILON ? null : 0;

  return {
    targetPower,
    offTargetPower,
    strongestCompetitorPower,
    targetSelectivity,
    totalReflectance: result.reflectance,
    staticReflectance,
    peakEnhancement: result.reflectance - staticReflectance,
    activeRegionWidthMm: activeRegion ? activeRegion.endMm - activeRegion.startMm : null,
    activeRegionCount: regions.length,
    secondaryPeakRatio: strongestCompetitorPower > EPSILON && targetPower > EPSILON ? strongestCompetitorPower / targetPower : null,
  };
}

/** Aggregates target-state metrics without hiding the raw per-depth selectivity distribution. */
export function evaluateMultiStateObjective(
  design: HybridBraggDesignInputs,
  targets: TargetReflectionState[],
  thresholds = DEFAULT_THRESHOLDS,
): MultiStateObjectiveMetrics {
  const states = targets.map((target) => ({ ...target, metrics: evaluateTargetReflectionState(design, target) }));
  const selectivities = states
    .map((state) => state.metrics.targetSelectivity)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const sorted = [...selectivities].sort((left, right) => left - right);
  const addressableFractions = Object.fromEntries(thresholds.map((threshold) => [
    `S>${threshold}`,
    targets.length === 0 ? 0 : selectivities.filter((value) => value > threshold).length / targets.length,
  ]));

  return {
    states,
    minimumSelectivity: sorted[0] ?? null,
    medianSelectivity: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    meanSelectivity: sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null,
    addressableFractions,
  };
}

/** Builds a deterministic lookup table by choosing the best sampled control state for each target depth. */
export function buildDepthAddressLookup(
  design: HybridBraggDesignInputs,
  targetDepthsMm: number[],
  targetWidthMm: number,
): MultiStateObjectiveMetrics {
  const evolution = solveReflectionRegionEvolution(design, 0.5);
  const targets = targetDepthsMm.map((targetDepthMm) => {
    const bestFrame = evolution.frames
      .map((frame) => ({
        frame,
        metrics: evaluateTargetReflectionState(design, {
          targetDepthMm,
          targetWidthMm,
          controlState: frame.parameterValue,
          controlKind: frame.parameterKind,
        }),
      }))
      .sort((left, right) => compareObjectiveMetrics(right.metrics, left.metrics))[0];
    return {
      targetDepthMm,
      targetWidthMm,
      controlState: bestFrame?.frame.parameterValue ?? 0,
      controlKind: bestFrame?.frame.parameterKind ?? 'phase',
    } satisfies TargetReflectionState;
  });
  return evaluateMultiStateObjective(design, targets);
}

export function compareObjectiveMetrics(left: ObjectiveMetrics, right: ObjectiveMetrics): number {
  const leftSelectivity = left.targetSelectivity ?? 0;
  const rightSelectivity = right.targetSelectivity ?? 0;
  return leftSelectivity - rightSelectivity || left.peakEnhancement - right.peakEnhancement;
}

/** Flags research cases where a high ratio is produced by a weak optical response. */
export function classifyUsefulResponse(
  metrics: ObjectiveMetrics,
  selectivityThreshold = 2,
  minimumTargetPower = 0.05,
): UsefulResponseClassification {
  const selectivity = metrics.targetSelectivity ?? 0;
  if (selectivity < selectivityThreshold) return 'low-selectivity';
  return metrics.targetPower >= minimumTargetPower
    ? 'high-selectivity / meaningful-response'
    : 'high-selectivity / weak-response';
}

function applyTargetControlState(design: HybridBraggDesignInputs, target: TargetReflectionState): HybridBraggDesignInputs {
  return target.controlKind === 'phase'
    ? { ...design, perturbationTemporalPhaseRadians: target.controlState }
    : target.controlKind === 'actuator-index'
      ? { ...design, activeActuatorIndex: target.controlState }
      : { ...design, strainCenterMm: target.controlState };
}

function integrateTargetPower(field: SpatialCoupledModeFieldSample[], target: TargetReflectionState): number {
  return integratePower(field, (sample) => targetWeight(sample.zM * 1e3, target));
}

function integratePower(field: SpatialCoupledModeFieldSample[], weight: (sample: SpatialCoupledModeFieldSample) => number): number {
  return field.reduce((sum, sample) => sum + sample.normalizedBackwardIntensity * sample.lengthM * 1e3 * weight(sample), 0);
}

function targetWeight(zMm: number, target: TargetReflectionState): number {
  const distanceMm = Math.abs(zMm - target.targetDepthMm);
  const weighting = target.weighting ?? { kind: 'rectangular' };
  if (weighting.kind === 'rectangular') return distanceMm <= target.targetWidthMm / 2 ? 1 : 0;
  const sigma = Math.max(1e-9, target.targetWidthMm * weighting.sigmaFractionOfWidth);
  return Math.exp(-0.5 * (distanceMm / sigma) ** 2);
}

function getStrongestCompetitorPower(
  field: SpatialCoupledModeFieldSample[],
  regions: ReflectionRegion[],
  target: TargetReflectionState,
): number {
  const targetStartMm = target.targetDepthMm - target.targetWidthMm / 2;
  const targetEndMm = target.targetDepthMm + target.targetWidthMm / 2;
  const competitorPowers = regions.map((region) =>
    integratePower(field.filter((sample) => {
      const zMm = sample.zM * 1e3;
      const inRegion = zMm >= region.startMm && zMm <= region.endMm;
      const inTarget = zMm >= targetStartMm && zMm <= targetEndMm;
      return inRegion && !inTarget;
    }), () => 1),
  );
  return competitorPowers.length ? Math.max(...competitorPowers) : 0;
}

function getTargetRegion(regions: ReflectionRegion[], target: TargetReflectionState): ReflectionRegion | null {
  return regions.find((region) => region.startMm <= target.targetDepthMm && region.endMm >= target.targetDepthMm) ?? null;
}
