import type { HybridBraggDesignInputs } from '../../types/simulation';
import type { ReflectionRegion } from '../experiments/hybridBraggExperiments';
import {
  reconstructHybridBraggMaxwellFields,
  type MaxwellFieldResult,
  type MaxwellFieldSample,
} from '../solvers/maxwell/longGratingScatteringSolver';

export type SpatialMaxwellValidationResult = {
  identity: string;
  result: MaxwellFieldResult;
  regions: ReflectionRegion[];
};

/** Creates a deterministic identity for solver inputs that affect one spatial Maxwell validation. */
export function createSpatialMaxwellValidationIdentity(design: HybridBraggDesignInputs): string {
  return JSON.stringify({
    lengthMm: design.lengthMm,
    averageIndex: design.averageIndex,
    indexModulation: design.indexModulation,
    gratingPeriodNm: design.gratingPeriodNm,
    gratingPhaseRadians: design.gratingPhaseRadians,
    couplingProfile: design.couplingProfile,
    phaseProfile: design.phaseProfile,
    permanentGratingMode: design.permanentGratingMode,
    braggSectionCount: design.braggSectionCount,
    braggSectionGapMm: design.braggSectionGapMm,
    braggSectionPhaseMode: design.braggSectionPhaseMode,
    braggSectionPhaseSequenceRadians: design.braggSectionPhaseSequenceRadians,
    braggSectionRandomSeed: design.braggSectionRandomSeed,
    peakStrain: design.peakStrain,
    strainCenterMm: design.strainCenterMm,
    strainWidthMm: design.strainWidthMm,
    strainShape: design.strainShape,
    perturbationEdgeWidthMm: design.perturbationEdgeWidthMm,
    perturbationPeriodMm: design.perturbationPeriodMm,
    perturbationPhaseRadians: design.perturbationPhaseRadians,
    perturbationTemporalPhaseRadians: design.perturbationTemporalPhaseRadians,
    perturbationSecondaryPeriodMm: design.perturbationSecondaryPeriodMm,
    perturbationSecondaryAmplitudeRatio: design.perturbationSecondaryAmplitudeRatio,
    perturbationSecondaryPhaseRadians: design.perturbationSecondaryPhaseRadians,
    strainBias: design.strainBias,
    actuatorCount: design.actuatorCount,
    actuatorPitchMm: design.actuatorPitchMm,
    activeActuatorIndex: design.activeActuatorIndex,
    actuatorCommandAmplitude: design.actuatorCommandAmplitude,
    actuatorAdjacentCommandAmplitude: design.actuatorAdjacentCommandAmplitude,
    actuatorPolarity: design.actuatorPolarity,
    effectivePhotoelasticCoefficient: design.effectivePhotoelasticCoefficient,
    segmentCount: design.segmentCount,
    fixedLaserWavelengthNm: design.fixedLaserWavelengthNm,
  });
}

/** Runs one explicit Maxwell reference validation for the current spatial addressing state. */
export function validateSpatialAddressingWithMaxwell(
  design: HybridBraggDesignInputs,
  thresholdFraction: number,
): SpatialMaxwellValidationResult {
  const result = reconstructHybridBraggMaxwellFields(design, design.fixedLaserWavelengthNm, {
    samplesPerPeriod: 8,
    envelopeBlocks: 5,
  });
  return {
    identity: createSpatialMaxwellValidationIdentity(design),
    result,
    regions: detectMaxwellRegions(result.samples, thresholdFraction),
  };
}

function detectMaxwellRegions(samples: MaxwellFieldSample[], thresholdFraction: number): ReflectionRegion[] {
  const threshold = Math.max(0, Math.min(1, thresholdFraction));
  const regions: ReflectionRegion[] = [];
  let startIndex: number | null = null;

  samples.forEach((sample, index) => {
    const active = sample.normalizedBackwardIntensity >= threshold && sample.backwardIntensity > 1e-9;
    if (active && startIndex === null) startIndex = index;
    if ((!active || index === samples.length - 1) && startIndex !== null) {
      const endIndex = active && index === samples.length - 1 ? index : index - 1;
      regions.push(createMaxwellRegion(samples, startIndex, endIndex));
      startIndex = null;
    }
  });

  return regions.sort((left, right) => right.peakNormalizedIntensity - left.peakNormalizedIntensity);
}

function createMaxwellRegion(samples: MaxwellFieldSample[], startIndex: number, endIndex: number): ReflectionRegion {
  const regionSamples = samples.slice(startIndex, endIndex + 1);
  const peak = regionSamples.reduce((best, sample) =>
    sample.normalizedBackwardIntensity > best.normalizedBackwardIntensity ? sample : best,
  regionSamples[0]);
  const startMm = samples[startIndex].zM * 1e3;
  const endMm = samples[endIndex].zM * 1e3;
  return {
    startMm,
    endMm,
    centerMm: (startMm + endMm) / 2,
    peakMm: peak.zM * 1e3,
    peakNormalizedIntensity: peak.normalizedBackwardIntensity,
    sectionIds: [],
  };
}
