import type {
  HybridBraggDesignInputs,
  HybridCouplingProfile,
  HybridPhaseProfile,
  HybridSectionPhaseMode,
} from '../../types/simulation';
import type { StrainField } from '../perturbations/strainField';
import { sampleStrainField } from '../perturbations/strainField';
import type { MaterialStrainResponse } from '../responses/strainOpticResponse';
import { applyMaterialStrainResponse } from '../responses/strainOpticResponse';

export type PermanentBraggGrating = {
  lengthM: number;
  averageIndex: number;
  indexModulation: number;
  periodM: number;
  phaseRadians: number;
  couplingProfile: HybridCouplingProfile;
  phaseProfile: HybridPhaseProfile;
  structure:
    | { mode: 'global' }
    | {
        mode: 'segmented';
        sectionCount: number;
        sectionLengthM: number;
        gapLengthM: number;
        phaseMode: HybridSectionPhaseMode;
        phaseSequenceRadians: number[];
        randomSeed: number;
      };
};

export type HybridBraggModel = {
  grating: PermanentBraggGrating;
  strain: StrainField;
  materialResponse: MaterialStrainResponse;
  segmentCount: number;
  fixedLaserWavelengthM: number;
};

export type LocalBraggSample = {
  zM: number;
  startM: number;
  endM: number;
  lengthM: number;
  sectionId: number | null;
  sectionStartM: number | null;
  sectionEndM: number | null;
  gratingPhaseRadians: number;
  inBraggSection: boolean;
  strain: number;
  averageIndex: number;
  periodM: number;
  braggWavelengthM: number;
  couplingCoefficientPerM: number;
  detuningPerM: number;
};

const NM_PER_M = 1e9;
const MM_PER_M = 1e3;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Default v2 hybrid inputs use SI-derived UI units while keeping all fields explicit. */
export const DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS: HybridBraggDesignInputs = {
  lengthMm: 10,
  averageIndex: 1.45,
  indexModulation: 1e-4,
  gratingPeriodNm: 206.9,
  gratingPhaseRadians: 0,
  couplingProfile: { family: 'uniform' },
  phaseProfile: { family: 'constant' },
  permanentGratingMode: 'global',
  braggSectionCount: 1,
  braggSectionGapMm: 0,
  braggSectionPhaseMode: 'continuous',
  braggSectionPhaseSequenceRadians: [],
  braggSectionRandomSeed: 1,
  peakStrain: 0,
  strainCenterMm: 5,
  strainWidthMm: 1,
  strainShape: 'rectangular',
  perturbationEdgeWidthMm: 0.2,
  perturbationPeriodMm: 1,
  perturbationPhaseRadians: 0,
  perturbationTemporalPhaseRadians: 0,
  perturbationVelocityMps: 5000,
  perturbationSecondaryPeriodMm: 1.2,
  perturbationSecondaryAmplitudeRatio: 1,
  perturbationSecondaryPhaseRadians: 0,
  effectivePhotoelasticCoefficient: 0.22,
  segmentCount: 400,
  fixedLaserWavelengthNm: 600,
  pulseSweepStartMm: 0,
  pulseSweepEndMm: 10,
  pulseSweepPointCount: 81,
};

/** Converts UI/import units into the pure headless hybrid model used by solvers. */
export function createHybridBraggModel(design: HybridBraggDesignInputs): HybridBraggModel {
  const lengthM = design.lengthMm / MM_PER_M;
  const sectionCount = Math.max(1, Math.round(design.braggSectionCount));
  const requestedGapLengthM = Math.max(0, design.braggSectionGapMm / MM_PER_M);
  const maxGapLengthM = sectionCount > 1 ? lengthM / (sectionCount - 1) * 0.95 : 0;
  const gapLengthM = Math.min(requestedGapLengthM, maxGapLengthM);
  const sectionLengthM = sectionCount > 0
    ? Math.max(0, (lengthM - gapLengthM * (sectionCount - 1)) / sectionCount)
    : lengthM;
  return {
    grating: {
      lengthM,
      averageIndex: design.averageIndex,
      indexModulation: design.indexModulation,
      periodM: design.gratingPeriodNm / NM_PER_M,
      phaseRadians: design.gratingPhaseRadians,
      couplingProfile: design.couplingProfile ?? { family: 'uniform' },
      phaseProfile: design.phaseProfile ?? { family: 'constant' },
      structure: design.permanentGratingMode === 'segmented'
        ? {
            mode: 'segmented',
            sectionCount,
            sectionLengthM,
            gapLengthM,
            phaseMode: design.braggSectionPhaseMode,
            phaseSequenceRadians: design.braggSectionPhaseSequenceRadians,
            randomSeed: design.braggSectionRandomSeed,
          }
        : { mode: 'global' },
    },
    strain: {
      peakStrain: design.peakStrain,
      centerM: design.strainCenterMm / MM_PER_M,
      widthM: design.strainWidthMm / MM_PER_M,
      shape: design.strainShape,
      edgeWidthM: design.perturbationEdgeWidthMm / MM_PER_M,
      periodM: design.perturbationPeriodMm / MM_PER_M,
      phaseRadians: design.perturbationPhaseRadians,
      temporalPhaseRadians: design.perturbationTemporalPhaseRadians,
      velocityMps: design.perturbationVelocityMps,
      secondaryPeriodM: design.perturbationSecondaryPeriodMm / MM_PER_M,
      secondaryAmplitudeRatio: design.perturbationSecondaryAmplitudeRatio,
      secondaryPhaseRadians: design.perturbationSecondaryPhaseRadians,
    },
    materialResponse: {
      effectivePhotoelasticCoefficient: design.effectivePhotoelasticCoefficient,
    },
    segmentCount: Math.max(1, Math.round(design.segmentCount)),
    fixedLaserWavelengthM: design.fixedLaserWavelengthNm / NM_PER_M,
  };
}

/** Uses the standard weak sinusoidal grating convention kappa = pi * delta-n / lambda_B. */
export function getCouplingCoefficientPerM(indexModulation: number, braggWavelengthM: number): number {
  return Math.PI * Math.abs(indexModulation) / braggWavelengthM;
}

/** Samples the spatial model into solver-specific segments without making slices part of the domain model. */
export function sampleHybridBraggModel(
  model: HybridBraggModel,
  wavelengthM: number,
): LocalBraggSample[] {
  const intervals = createSolverIntervals(model);
  return intervals.map(({ startM, endM }) => {
    const zM = (startM + endM) / 2;
    const section = getSectionAtZ(model.grating, zM);
    const strain = sampleStrainField(model.strain, zM);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
    const effectiveIndexModulation = section.inBraggSection
      ? model.grating.indexModulation * getCouplingProfileMultiplier(model.grating.couplingProfile, zM, model.grating.lengthM)
      : 0;
    const couplingCoefficientPerM = getCouplingCoefficientPerM(
      effectiveIndexModulation,
      local.braggWavelengthM,
    );
    const betaPerM = (2 * Math.PI * local.averageIndex) / wavelengthM;
    const gratingWaveNumberPerM = Math.PI / local.periodM;
    const detuningPerM = betaPerM - gratingWaveNumberPerM;
    return {
      zM,
      startM,
      endM,
      lengthM: endM - startM,
      sectionId: section.sectionId,
      sectionStartM: section.sectionStartM,
      sectionEndM: section.sectionEndM,
      gratingPhaseRadians: section.phaseRadians + getPhaseProfileOffset(model.grating.phaseProfile, zM, model.grating.lengthM),
      inBraggSection: section.inBraggSection,
      strain,
      averageIndex: local.averageIndex,
      periodM: local.periodM,
      braggWavelengthM: local.braggWavelengthM,
      couplingCoefficientPerM,
      detuningPerM,
    };
  });
}

/** Samples an interpretable permanent coupling profile at a normalized grating coordinate. */
export function getCouplingProfileMultiplier(profile: HybridCouplingProfile, zM: number, lengthM: number): number {
  const x = lengthM > 0 ? clamp(zM / lengthM, 0, 1) : 0;
  switch (profile.family) {
    case 'uniform':
      return 1;
    case 'gaussian': {
      const sigma = Math.max(1e-6, profile.widthFraction);
      const base = profile.peakMultiplier * Math.exp(-0.5 * ((x - 0.5) / sigma) ** 2);
      return profile.normalizeIntegratedCoupling ? base / estimateMeanCouplingMultiplier(profile) : base;
    }
    case 'raised-cosine': {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * x);
      const base = profile.floorMultiplier + (profile.peakMultiplier - profile.floorMultiplier) * window;
      return profile.normalizeIntegratedCoupling ? base / estimateMeanCouplingMultiplier(profile) : base;
    }
    case 'tukey': {
      const alpha = clamp(profile.taperFraction, 0, 1);
      const window = alpha <= 0 ? 1 : alpha >= 1 ? 0.5 - 0.5 * Math.cos(2 * Math.PI * x) : tukeyWindow(x, alpha);
      const base = profile.floorMultiplier + (profile.peakMultiplier - profile.floorMultiplier) * window;
      return profile.normalizeIntegratedCoupling ? base / estimateMeanCouplingMultiplier(profile) : base;
    }
    case 'piecewise': {
      const zones = profile.zoneMultipliers.length > 0 ? profile.zoneMultipliers : [1];
      const index = Math.min(zones.length - 1, Math.floor(x * zones.length));
      const base = zones[index] ?? 1;
      return profile.normalizeIntegratedCoupling ? base / estimateMeanCouplingMultiplier(profile) : base;
    }
    default:
      return 1;
  }
}

/** Samples low-dimensional permanent grating phase profiles without creating arbitrary high-resolution arrays. */
export function getPhaseProfileOffset(profile: HybridPhaseProfile, zM: number, lengthM: number): number {
  const x = lengthM > 0 ? clamp(zM / lengthM, 0, 1) : 0;
  switch (profile.family) {
    case 'constant':
      return 0;
    case 'linear-ramp':
      return profile.totalPhaseRadians * x;
    case 'piecewise': {
      const zones = profile.zonePhaseRadians.length > 0 ? profile.zonePhaseRadians : [0];
      return zones[Math.min(zones.length - 1, Math.floor(x * zones.length))] ?? 0;
    }
    case 'alternating': {
      const zoneCount = Math.max(1, Math.round(profile.zoneCount));
      return Math.floor(x * zoneCount) % 2 === 0 ? 0 : profile.phaseStepRadians;
    }
    default:
      return 0;
  }
}

function tukeyWindow(x: number, alpha: number): number {
  if (x < alpha / 2) return 0.5 * (1 + Math.cos((2 * Math.PI / alpha) * (x - alpha / 2)));
  if (x <= 1 - alpha / 2) return 1;
  return 0.5 * (1 + Math.cos((2 * Math.PI / alpha) * (x - 1 + alpha / 2)));
}

function estimateMeanCouplingMultiplier(profile: HybridCouplingProfile): number {
  const sampleCount = 401;
  let sum = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const zM = index / (sampleCount - 1);
    sum += getRawCouplingProfileMultiplier(profile, zM, 1);
  }
  return Math.max(1e-9, sum / sampleCount);
}

function getRawCouplingProfileMultiplier(profile: HybridCouplingProfile, zM: number, lengthM: number): number {
  switch (profile.family) {
    case 'gaussian':
      return getCouplingProfileMultiplier({ ...profile, normalizeIntegratedCoupling: false }, zM, lengthM);
    case 'raised-cosine':
      return getCouplingProfileMultiplier({ ...profile, normalizeIntegratedCoupling: false }, zM, lengthM);
    case 'tukey':
      return getCouplingProfileMultiplier({ ...profile, normalizeIntegratedCoupling: false }, zM, lengthM);
    case 'piecewise':
      return getCouplingProfileMultiplier({ ...profile, normalizeIntegratedCoupling: false }, zM, lengthM);
    case 'uniform':
      return 1;
    default:
      return 1;
  }
}

function createSolverIntervals(model: HybridBraggModel): Array<{ startM: number; endM: number }> {
  const grid = Array.from({ length: model.segmentCount + 1 }, (_, index) =>
    (model.grating.lengthM * index) / model.segmentCount,
  );
  const structuralBoundaries = model.grating.structure.mode === 'segmented'
    ? getSegmentedStructureBoundaries(model.grating)
    : [];
  const boundaries = Array.from(new Set([...grid, ...structuralBoundaries]
    .map((value) => clamp(value, 0, model.grating.lengthM))
    .map((value) => Number(value.toPrecision(15)))))
    .sort((left, right) => left - right);

  const intervals: Array<{ startM: number; endM: number }> = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startM = boundaries[index];
    const endM = boundaries[index + 1];
    if (endM > startM) intervals.push({ startM, endM });
  }
  return intervals;
}

function getSegmentedStructureBoundaries(grating: PermanentBraggGrating): number[] {
  if (grating.structure.mode === 'global') return [];
  const pitchM = grating.structure.sectionLengthM + grating.structure.gapLengthM;
  const boundaries = [0, grating.lengthM];
  for (let sectionId = 0; sectionId < grating.structure.sectionCount; sectionId += 1) {
    const sectionStartM = sectionId * pitchM;
    boundaries.push(sectionStartM, sectionStartM + grating.structure.sectionLengthM);
  }
  return boundaries;
}

type SectionSample = Pick<
  LocalBraggSample,
  'sectionId' | 'sectionStartM' | 'sectionEndM' | 'gratingPhaseRadians' | 'inBraggSection'
> & {
  phaseRadians: number;
};

function getSectionAtZ(grating: PermanentBraggGrating, zM: number): SectionSample {
  if (grating.structure.mode === 'global') {
    return {
      sectionId: 0,
      sectionStartM: 0,
      sectionEndM: grating.lengthM,
      gratingPhaseRadians: grating.phaseRadians,
      phaseRadians: grating.phaseRadians,
      inBraggSection: true,
    };
  }

  const pitchM = grating.structure.sectionLengthM + grating.structure.gapLengthM;
  const rawIndex = pitchM > 0 ? Math.floor(zM / pitchM) : 0;
  const sectionId = Math.min(grating.structure.sectionCount - 1, Math.max(0, rawIndex));
  const sectionStartM = sectionId * pitchM;
  const sectionEndM = sectionStartM + grating.structure.sectionLengthM;
  const inBraggSection = zM >= sectionStartM && zM <= sectionEndM && sectionEndM <= grating.lengthM + 1e-15;
  const phaseRadians = getSectionPhaseRadians(grating, sectionId, sectionStartM);

  return {
    sectionId: inBraggSection ? sectionId : null,
    sectionStartM: inBraggSection ? sectionStartM : null,
    sectionEndM: inBraggSection ? sectionEndM : null,
    gratingPhaseRadians: phaseRadians,
    phaseRadians,
    inBraggSection,
  };
}

function getSectionPhaseRadians(grating: PermanentBraggGrating, sectionId: number, sectionStartM: number): number {
  if (grating.structure.mode === 'global') return grating.phaseRadians;

  const resetPhase = grating.phaseRadians - (2 * Math.PI * sectionStartM) / grating.periodM;
  switch (grating.structure.phaseMode) {
    case 'continuous':
      return grating.phaseRadians;
    case 'fixed-reset':
      return resetPhase;
    case 'alternating':
      return resetPhase + (sectionId % 2 === 0 ? 0 : Math.PI);
    case 'explicit':
      return grating.phaseRadians + (grating.structure.phaseSequenceRadians[sectionId] ?? 0);
    case 'seeded-random':
      return grating.phaseRadians + seededPhase(grating.structure.randomSeed, sectionId);
    default:
      return grating.phaseRadians;
  }
}

function seededPhase(seed: number, index: number): number {
  const value = Math.sin((Math.trunc(seed) + 1) * 12.9898 + index * 78.233) * 43758.5453;
  return 2 * Math.PI * (value - Math.floor(value));
}

export function getHybridDesignBraggWavelengthNm(design: HybridBraggDesignInputs): number {
  return 2 * design.averageIndex * design.gratingPeriodNm;
}

export function getHybridLengthNm(design: HybridBraggDesignInputs): number {
  return design.lengthMm * 1e6;
}

export type { MaterialStrainResponse, StrainField };
export { applyMaterialStrainResponse, sampleStrainField };
