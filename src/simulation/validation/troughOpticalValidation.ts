import type { HybridBraggDesignInputs } from '../../types/simulation';
import type { LayerStack } from '../layers/stack';
import { sampleStrainField } from '../perturbations/strainField';
import { applyMaterialStrainResponse } from '../responses/strainOpticResponse';
import { solveLayerStack } from '../solvers/transferMatrix';
import {
  solveCoupledModeSections,
  solveHybridBraggCoupledModePoint,
  type CoupledModeSection,
} from '../solvers/coupledMode/spatialBraggSolver';
import {
  createHybridBraggModel,
  getCouplingCoefficientPerM,
  sampleHybridBraggModel,
} from '../structures/hybridBraggGrating';

export type CanonicalOpticalConvention = {
  coordinate: 'reference-z';
  strainFieldCoordinate: 'reference-z';
  physicalLength: 'unchanged-reference-length';
  gratingPeriod: 'locally-stretched-by-1-plus-epsilon';
  gratingPhase: 'continuous-accumulated-local-period';
  averageIndex: 'photoelastic-first-order';
  indexModulation: 'peak-sinusoidal-delta-n';
};

export type OpticalValidationCase = {
  label: string;
  design: HybridBraggDesignInputs;
  wavelengthsNm: number[];
};

export type TmmResolution = {
  slicesPerPeriod: number;
  envelopeBlocks: number;
};

export type SpectrumComparisonPoint = {
  wavelengthNm: number;
  cmtReflectance: number;
  tmmReflectance: number;
  tmmTransmission: number;
  tmmEnergyError: number;
};

export type OpticalValidationResult = {
  label: string;
  convention: CanonicalOpticalConvention;
  piecewiseCmtReflectance: number;
  spatialCmtReflectance: number;
  cmtAbsoluteDifference: number;
  maxTmmEnergyError: number;
  spectrum: SpectrumComparisonPoint[];
};

export const REFERENCE_COORDINATE_CONVENTION: CanonicalOpticalConvention = {
  coordinate: 'reference-z',
  strainFieldCoordinate: 'reference-z',
  physicalLength: 'unchanged-reference-length',
  gratingPeriod: 'locally-stretched-by-1-plus-epsilon',
  gratingPhase: 'continuous-accumulated-local-period',
  averageIndex: 'photoelastic-first-order',
  indexModulation: 'peak-sinusoidal-delta-n',
};

/** Runs one canonical solver-parity case under the documented reference-coordinate convention. */
export function runOpticalValidationCase(
  validationCase: OpticalValidationCase,
  resolution: TmmResolution,
): OpticalValidationResult {
  const model = createHybridBraggModel(validationCase.design);
  const laserWavelengthNm = validationCase.design.fixedLaserWavelengthNm;
  const sections = sampleHybridBraggModel(model, laserWavelengthNm * 1e-9).map((sample): CoupledModeSection => ({
    couplingCoefficientPerM: sample.couplingCoefficientPerM,
    detuningPerM: sample.detuningPerM,
    lengthM: sample.lengthM,
    phaseRadians: sample.gratingPhaseRadians,
  }));
  const piecewise = solveCoupledModeSections(sections);
  const spatial = solveHybridBraggCoupledModePoint(model, laserWavelengthNm);
  const stack = buildContinuousPhaseTmmStack(validationCase.design, resolution);
  const spectrum = validationCase.wavelengthsNm.map((wavelengthNm) => {
    const cmt = solveHybridBraggCoupledModePoint(model, wavelengthNm);
    const tmm = solveLayerStack(stack, {
      wavelengthNm,
      incidentAngleDegrees: 0,
      polarization: 'TE',
    });
    return {
      wavelengthNm,
      cmtReflectance: cmt.reflectance,
      tmmReflectance: tmm.reflectance,
      tmmTransmission: tmm.transmission,
      tmmEnergyError: Math.abs(tmm.reflectance + tmm.transmission - 1),
    };
  });

  return {
    label: validationCase.label,
    convention: REFERENCE_COORDINATE_CONVENTION,
    piecewiseCmtReflectance: piecewise.reflectance,
    spatialCmtReflectance: spatial.reflectance,
    cmtAbsoluteDifference: Math.abs(piecewise.reflectance - spatial.reflectance),
    maxTmmEnergyError: Math.max(...spectrum.map((point) => point.tmmEnergyError), 0),
    spectrum,
  };
}

/** Builds a research TMM stack for the same strained sinusoidal grating represented by the CMT sampler. */
export function buildContinuousPhaseTmmStack(
  design: HybridBraggDesignInputs,
  resolution: TmmResolution,
): LayerStack {
  const model = createHybridBraggModel(design);
  const opticalPeriods = design.lengthMm * 1e6 / design.gratingPeriodNm;
  const sliceCount = Math.max(
    1,
    Math.round(opticalPeriods * resolution.slicesPerPeriod * Math.max(1, resolution.envelopeBlocks) / Math.max(1, resolution.envelopeBlocks)),
  );
  const thicknessNm = design.lengthMm * 1e6 / sliceCount;
  const thicknessM = thicknessNm * 1e-9;
  const background = { id: 'hybrid-background', name: 'Hybrid background', refractiveIndex: design.averageIndex };
  let phaseRadians = design.gratingPhaseRadians;

  return {
    incidentMedium: background,
    exitMedium: background,
    layers: Array.from({ length: sliceCount }, (_, index) => {
      const zM = (index + 0.5) * thicknessM;
      const strain = sampleStrainField(model.strain, zM);
      const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
      const layerPhase = phaseRadians + Math.PI * thicknessM / local.periodM;
      phaseRadians += (2 * Math.PI * thicknessM) / local.periodM;
      return {
        thicknessNm,
        material: {
          id: `continuous-phase-tmm-${index}`,
          name: `Continuous phase TMM ${index}`,
          refractiveIndex: local.averageIndex + design.indexModulation * Math.cos(layerPhase),
        },
      };
    }),
  };
}

export function createUniformStrainDesign(
  design: HybridBraggDesignInputs,
  strain: number,
): HybridBraggDesignInputs {
  return {
    ...design,
    peakStrain: strain,
    strainBias: 0,
    strainShape: 'rectangular',
    strainCenterMm: design.lengthMm / 2,
    strainWidthMm: design.lengthMm,
    perturbationEdgeWidthMm: 0,
  };
}

export function createSharpTroughDesign(design: HybridBraggDesignInputs): HybridBraggDesignInputs {
  return {
    ...design,
    strainShape: 'piezo-trough',
    perturbationEdgeWidthMm: 0,
  };
}

export function calculateLocalDetuningRatios(design: HybridBraggDesignInputs, zMmValues: number[]) {
  const model = createHybridBraggModel(design);
  return zMmValues.map((zMm) => {
    const zM = zMm / 1e3;
    const strain = sampleStrainField(model.strain, zM);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, strain);
    const kappa = getCouplingCoefficientPerM(design.indexModulation, local.braggWavelengthM);
    const beta = (2 * Math.PI * local.averageIndex) / (design.fixedLaserWavelengthNm * 1e-9);
    const delta = beta - Math.PI / local.periodM;
    return {
      zMm,
      strain,
      localBraggWavelengthNm: local.braggWavelengthM * 1e9,
      detuningPerM: delta,
      couplingCoefficientPerM: kappa,
      absoluteDetuningOverKappa: kappa > 0 ? Math.abs(delta) / kappa : Infinity,
    };
  });
}
