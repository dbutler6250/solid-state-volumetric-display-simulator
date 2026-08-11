import type { HybridBraggDesignInputs } from '../../types/simulation';
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
  strain: number;
  averageIndex: number;
  periodM: number;
  braggWavelengthM: number;
  couplingCoefficientPerM: number;
  detuningPerM: number;
};

const NM_PER_M = 1e9;
const MM_PER_M = 1e3;

/** Default v2 hybrid inputs use SI-derived UI units while keeping all fields explicit. */
export const DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS: HybridBraggDesignInputs = {
  lengthMm: 10,
  averageIndex: 1.45,
  indexModulation: 1e-4,
  gratingPeriodNm: 206.9,
  gratingPhaseRadians: 0,
  peakStrain: 0,
  strainCenterMm: 5,
  strainWidthMm: 1,
  strainShape: 'rectangular',
  effectivePhotoelasticCoefficient: 0.22,
  segmentCount: 400,
  fixedLaserWavelengthNm: 600,
  pulseSweepStartMm: 0,
  pulseSweepEndMm: 10,
  pulseSweepPointCount: 81,
};

/** Converts UI/import units into the pure headless hybrid model used by solvers. */
export function createHybridBraggModel(design: HybridBraggDesignInputs): HybridBraggModel {
  return {
    grating: {
      lengthM: design.lengthMm / MM_PER_M,
      averageIndex: design.averageIndex,
      indexModulation: design.indexModulation,
      periodM: design.gratingPeriodNm / NM_PER_M,
      phaseRadians: design.gratingPhaseRadians,
    },
    strain: {
      peakStrain: design.peakStrain,
      centerM: design.strainCenterMm / MM_PER_M,
      widthM: design.strainWidthMm / MM_PER_M,
      shape: design.strainShape,
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
  const segmentLengthM = model.grating.lengthM / model.segmentCount;
  return Array.from({ length: model.segmentCount }, (_, index) => {
    const zM = (index + 0.5) * segmentLengthM;
    const strain = sampleStrainField(model.strain, zM);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
    const couplingCoefficientPerM = getCouplingCoefficientPerM(
      model.grating.indexModulation,
      local.braggWavelengthM,
    );
    const betaPerM = (2 * Math.PI * local.averageIndex) / wavelengthM;
    const gratingWaveNumberPerM = Math.PI / local.periodM;
    const detuningPerM = betaPerM - gratingWaveNumberPerM;
    return {
      zM,
      strain,
      averageIndex: local.averageIndex,
      periodM: local.periodM,
      braggWavelengthM: local.braggWavelengthM,
      couplingCoefficientPerM,
      detuningPerM,
    };
  });
}

export function getHybridDesignBraggWavelengthNm(design: HybridBraggDesignInputs): number {
  return 2 * design.averageIndex * design.gratingPeriodNm;
}

export function getHybridLengthNm(design: HybridBraggDesignInputs): number {
  return design.lengthMm * 1e6;
}

export type { MaterialStrainResponse, StrainField };
export { applyMaterialStrainResponse, sampleStrainField };
