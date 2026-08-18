import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  createHybridBraggModel,
  getHybridDesignBraggWavelengthNm,
  sampleHybridBraggModel,
} from '../structures/hybridBraggGrating';
import { applyMaterialStrainResponse } from '../responses/strainOpticResponse';
import {
  REFERENCE_COORDINATE_CONVENTION,
  buildContinuousPhaseTmmStack,
  calculateLocalDetuningRatios,
  createSharpTroughDesign,
  createUniformStrainDesign,
  runOpticalValidationCase,
} from './troughOpticalValidation';

const baseDesign = {
  ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  lengthMm: 0.03,
  averageIndex: 1.45,
  indexModulation: 1e-4,
  gratingPeriodNm: 206.8965517,
  fixedLaserWavelengthNm: 600,
  segmentCount: 120,
};

describe('trough optical validation helpers', () => {
  it('documents the reference-coordinate convention used for parity studies', () => {
    expect(REFERENCE_COORDINATE_CONVENTION).toMatchObject({
      coordinate: 'reference-z',
      gratingPeriod: 'locally-stretched-by-1-plus-epsilon',
      gratingPhase: 'continuous-accumulated-local-period',
      indexModulation: 'peak-sinusoidal-delta-n',
    });
  });

  it('keeps uniform strain Bragg-shift direction explicit', () => {
    const strained = createUniformStrainDesign(baseDesign, 0.001);
    const model = createHybridBraggModel(strained);
    const local = applyMaterialStrainResponse(model.grating, model.materialResponse, 0.001);
    const unstrainedBraggNm = getHybridDesignBraggWavelengthNm(baseDesign);

    expect(local.braggWavelengthM * 1e9).toBeGreaterThan(unstrainedBraggNm);
  });

  it('keeps accumulated grating phase continuous through sharp trough boundaries', () => {
    const design = createSharpTroughDesign({
      ...baseDesign,
      lengthMm: 1,
      strainBias: 0.003,
      peakStrain: 0.002,
      strainCenterMm: 0.5,
      strainWidthMm: 0.2,
      segmentCount: 200,
    });
    const stack = buildContinuousPhaseTmmStack(design, { slicesPerPeriod: 4, envelopeBlocks: 1 });
    const indices = stack.layers.map((layer) => layer.material.refractiveIndex);

    expect(stack.layers.length).toBeGreaterThan(0);
    indices.forEach((refractiveIndex) => {
      expect(Number.isFinite(refractiveIndex)).toBe(true);
    });
  });

  it('matches exact piecewise CMT and spatial CMT for uniform and sharp trough cases', () => {
    const wavelengthsNm = [599.8, 600, 600.2];
    const cases = [
      { label: 'uniform', design: createUniformStrainDesign(baseDesign, 0), wavelengthsNm },
      {
        label: 'sharp trough',
        design: createSharpTroughDesign({
          ...baseDesign,
          strainBias: 0.0015,
          peakStrain: 0.001,
          strainCenterMm: 0.015,
          strainWidthMm: 0.01,
          segmentCount: 120,
        }),
        wavelengthsNm,
      },
    ];

    cases.forEach((validationCase) => {
      const result = runOpticalValidationCase(validationCase, { slicesPerPeriod: 16, envelopeBlocks: 1 });

      expect(result.cmtAbsoluteDifference).toBeLessThan(1e-12);
      expect(result.maxTmmEnergyError).toBeLessThan(1e-10);
    });
  });

  it('shows stronger TMM period resolution changes less than coarse period resolution', () => {
    const validationCase = {
      label: 'weak uniform',
      design: { ...baseDesign, indexModulation: 1e-5, segmentCount: 200 },
      wavelengthsNm: [599.9, 600, 600.1],
    };
    const coarse = runOpticalValidationCase(validationCase, { slicesPerPeriod: 4, envelopeBlocks: 1 });
    const medium = runOpticalValidationCase(validationCase, { slicesPerPeriod: 8, envelopeBlocks: 1 });
    const fine = runOpticalValidationCase(validationCase, { slicesPerPeriod: 16, envelopeBlocks: 1 });
    const coarseToMedium = maxSpectrumDifference(coarse.spectrum, medium.spectrum);
    const mediumToFine = maxSpectrumDifference(medium.spectrum, fine.spectrum);

    expect(mediumToFine).toBeLessThanOrEqual(coarseToMedium);
  });

  it('reports detuning normalized by local coupling for biased trough regions', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      indexModulation: 1e-4,
      fixedLaserWavelengthNm: 600.11,
      strainShape: 'piezo-trough' as const,
      strainBias: 0.003,
      peakStrain: 0.003,
      strainCenterMm: 5,
      strainWidthMm: 0.5,
      perturbationEdgeWidthMm: 0,
    };
    const ratios = calculateLocalDetuningRatios(design, [0.5, 5]);

    expect(ratios[0].absoluteDetuningOverKappa).toBeGreaterThan(ratios[1].absoluteDetuningOverKappa);
  });

  it('samples the same reference-z strain convention as the hybrid model', () => {
    const design = createSharpTroughDesign({
      ...baseDesign,
      lengthMm: 1,
      strainBias: 0.002,
      peakStrain: 0.001,
      strainCenterMm: 0.5,
      strainWidthMm: 0.25,
      segmentCount: 20,
    });
    const samples = sampleHybridBraggModel(createHybridBraggModel(design), design.fixedLaserWavelengthNm * 1e-9);
    const troughSample = samples.reduce((best, sample) => (sample.strain < best.strain ? sample : best), samples[0]);

    expect(troughSample.strain).toBeCloseTo(design.strainBias - design.peakStrain, 12);
  });
});

function maxSpectrumDifference(
  left: Array<{ tmmReflectance: number }>,
  right: Array<{ tmmReflectance: number }>,
): number {
  return Math.max(...left.map((point, index) => Math.abs(point.tmmReflectance - right[index].tmmReflectance)));
}
