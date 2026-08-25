import { describe, expect, it } from 'vitest';
import {
  buildExplicitLocallyPeriodicBlockLayers,
  buildHybridBraggMaxwellLayers,
  buildSinusoidalUnitCell,
  composeScattering,
  identityScattering,
  repeatScattering,
  reconstructHybridBraggMaxwellFields,
  reconstructScatteringLayerFields,
  solveHybridBraggMaxwellLocallyPeriodicPoint,
  solveHybridBraggMaxwellPoint,
  solveLocallyPeriodicBlock,
  solveScatteringLayers,
  type LocallyPeriodicBlock,
  type ScatteringMatrix,
} from './longGratingScatteringSolver';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../../structures/hybridBraggGrating';
import { magnitudeSquared } from '../../math/complex';

const airBlock: ScatteringMatrix = {
  rLeft: { re: 0, im: 0 },
  tLeftRight: { re: 0.2, im: 0.98 },
  tRightLeft: { re: 0.2, im: 0.98 },
  rRight: { re: 0, im: 0 },
};

describe('long grating Maxwell scattering solver', () => {
  it('keeps the identity two-port neutral under composition', () => {
    expect(composeScattering(identityScattering(), airBlock)).toEqual(airBlock);
    expect(composeScattering(airBlock, identityScattering())).toEqual(airBlock);
  });

  it('composes repeated blocks consistently with explicit repeated composition', () => {
    const repeated = repeatScattering(airBlock, 5);
    let explicit = identityScattering();
    for (let index = 0; index < 5; index += 1) explicit = composeScattering(explicit, airBlock);

    expect(repeated.tLeftRight.re).toBeCloseTo(explicit.tLeftRight.re, 12);
    expect(repeated.tLeftRight.im).toBeCloseTo(explicit.tLeftRight.im, 12);
    expect(repeated.rLeft.re).toBeCloseTo(explicit.rLeft.re, 12);
  });

  it('is associative within numerical tolerance for scalar lossless blocks', () => {
    const a = solveScatteringLayers([{ refractiveIndex: 1.3, thicknessM: 80e-9 }], 600, 1.45);
    const b = solveScatteringLayers([{ refractiveIndex: 1.5, thicknessM: 120e-9 }], 600, 1.45);
    expect(a.energyError).toBeLessThan(1e-12);
    expect(b.energyError).toBeLessThan(1e-12);
  });

  it('samples one sinusoidal period with the requested physical length and phase offset', () => {
    const cell = buildSinusoidalUnitCell({
      averageIndex: 1.45,
      indexModulation: 1e-4,
      periodM: 250e-9,
      phaseRadians: Math.PI / 2,
      samplesPerPeriod: 16,
    });

    expect(cell).toHaveLength(16);
    expect(cell.reduce((sum, layer) => sum + layer.thicknessM, 0)).toBeCloseTo(250e-9, 18);
    expect(cell[0].refractiveIndex).toBeLessThan(1.45 + 1e-4);
  });

  it('conserves energy for a simple slab and a short sinusoidal grating', () => {
    const slab = solveScatteringLayers([{ refractiveIndex: 1.7, thicknessM: 300e-9 }], 600, 1);
    const grating = solveScatteringLayers(
      buildSinusoidalUnitCell({
        averageIndex: 1.45,
        indexModulation: 1e-4,
        periodM: 206.9e-9,
        phaseRadians: 0,
        samplesPerPeriod: 32,
      }),
      600,
      1.45,
    );

    expect(slab.energyError).toBeLessThan(1e-12);
    expect(grating.energyError).toBeLessThan(1e-12);
  });

  it('reconstructs entrance reflection consistently with the scattering boundary result', () => {
    const layers = [
      { refractiveIndex: 1.7, thicknessM: 120e-9 },
      { refractiveIndex: 1.35, thicknessM: 95e-9 },
      { refractiveIndex: 1.55, thicknessM: 210e-9 },
    ];
    const boundary = solveScatteringLayers(layers, 600, 1);
    const field = reconstructScatteringLayerFields(layers, 600, 1);

    expect(field.reflectance).toBeCloseTo(boundary.reflectance, 12);
    expect(field.transmission).toBeCloseTo(boundary.transmission, 12);
    expect(magnitudeSquared(field.reflectionAmplitude)).toBeCloseTo(boundary.reflectance, 12);
    expect(field.samples.every((sample) => Number.isFinite(sample.forwardIntensity))).toBe(true);
    expect(field.samples.every((sample) => Number.isFinite(sample.backwardIntensity))).toBe(true);
  });

  it('keeps a matched-index slab backward field below numerical noise', () => {
    const field = reconstructScatteringLayerFields([{ refractiveIndex: 1.45, thicknessM: 2e-6 }], 600, 1.45);

    expect(field.reflectance).toBeLessThan(1e-24);
    expect(field.samples[0].backwardIntensity).toBeLessThan(1e-24);
    expect(field.samples[0].forwardFlux).toBeCloseTo(1.45, 12);
  });

  it('matches explicit short-grating field boundary metrics', () => {
    const layers = buildSinusoidalUnitCell({
      averageIndex: 1.45,
      indexModulation: 1e-4,
      periodM: 206.9e-9,
      phaseRadians: 0.11,
      samplesPerPeriod: 32,
    });
    const boundary = solveScatteringLayers(layers, 600.01, 1.45);
    const field = reconstructScatteringLayerFields(layers, 600.01, 1.45);

    expect(field.samples).toHaveLength(layers.length);
    expect(field.reflectance).toBeCloseTo(boundary.reflectance, 12);
    expect(Math.max(...field.samples.map((sample) => sample.normalizedBackwardIntensity))).toBeCloseTo(1, 12);
  });

  it('keeps large repeated lossless blocks finite', () => {
    const repeated = repeatScattering(airBlock, 10_000);
    for (const value of Object.values(repeated)) {
      expect(Number.isFinite(value.re)).toBe(true);
      expect(Number.isFinite(value.im)).toBe(true);
    }
  });

  it('preserves total length for fractional-period hybrid sampling', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 0.0103,
      gratingPeriodNm: 206.9,
      indexModulation: 1e-4,
      segmentCount: 12,
    };
    const layers = buildHybridBraggMaxwellLayers(design, { samplesPerPeriod: 8, envelopeBlocks: 5 });
    const totalLengthM = layers.reduce((sum, layer) => sum + layer.thicknessM, 0);

    expect(totalLengthM).toBeCloseTo(10.3e-6, 15);
  });

  it('does not reset microscopic phase at envelope block boundaries', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 0.005,
      gratingPeriodNm: 250,
      indexModulation: 1e-3,
      peakStrain: 200e-6,
      strainShape: 'smooth-top-hat' as const,
      perturbationEdgeWidthMm: 0.001,
    };
    const coarse = solveHybridBraggMaxwellPoint(design, 725, { samplesPerPeriod: 8, envelopeBlocks: 2 });
    const finer = solveHybridBraggMaxwellPoint(design, 725, { samplesPerPeriod: 8, envelopeBlocks: 6 });

    expect(coarse.energyError).toBeLessThan(1e-9);
    expect(finer.energyError).toBeLessThan(1e-9);
    expect(Math.abs(coarse.reflectance - finer.reflectance)).toBeLessThan(0.05);
  });

  it.each([1, 2, 5, 10, 50, 100])('matches explicit chains for %i repeated cells', (repeatCount) => {
    const block: LocallyPeriodicBlock = {
      averageIndex: 1.45,
      indexModulation: 1e-4,
      periodM: 206.9e-9,
      lengthM: repeatCount * 206.9e-9,
      phaseRadians: 0.37,
      samplesPerPeriod: 24,
    };
    const explicit = solveScatteringLayers(buildExplicitLocallyPeriodicBlockLayers(block), 600.01, block.averageIndex);
    const accelerated = solveLocallyPeriodicBlock(block, 600.01, block.averageIndex);

    expect(accelerated.reflectance).toBeCloseTo(explicit.reflectance, 8);
    expect(accelerated.transmission).toBeCloseTo(explicit.transmission, 8);
  });

  it('matches explicit discretization for fractional-period blocks', () => {
    const block: LocallyPeriodicBlock = {
      averageIndex: 1.45,
      indexModulation: 1e-4,
      periodM: 206.9e-9,
      lengthM: (0.25 + 10 + 0.4) * 206.9e-9,
      phaseRadians: 0.19,
      samplesPerPeriod: 48,
    };
    const explicit = solveScatteringLayers(buildExplicitLocallyPeriodicBlockLayers(block), 600.01, block.averageIndex);
    const accelerated = solveLocallyPeriodicBlock(block, 600.01, block.averageIndex);

    expect(accelerated.reflectance).toBeCloseTo(explicit.reflectance, 6);
    expect(accelerated.transmission).toBeCloseTo(explicit.transmission, 6);
  });

  it.each([1, 2, 10, 100])('keeps split uniform gratings equivalent across %i mechanical blocks', (envelopeBlocks) => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 0.1,
      peakStrain: 0,
      strainBias: 0,
      indexModulation: 1e-4,
      gratingPhaseRadians: 0.29,
      fixedLaserWavelengthNm: 600.01,
    };
    const unsplit = solveHybridBraggMaxwellLocallyPeriodicPoint(design, 600.01, {
      samplesPerPeriod: 24,
      envelopeBlocks: 1,
    });
    const split = solveHybridBraggMaxwellLocallyPeriodicPoint(design, 600.01, {
      samplesPerPeriod: 24,
      envelopeBlocks,
    });

    expect(split.reflectance).toBeCloseTo(unsplit.reflectance, 8);
    expect(split.transmission).toBeCloseTo(unsplit.transmission, 8);
  });

  it('keeps reconstructed hybrid fields independent of artificial mechanical block partitioning', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 0.02,
      peakStrain: 0,
      strainBias: 0,
      indexModulation: 1e-4,
      gratingPhaseRadians: 0.29,
      fixedLaserWavelengthNm: 600.01,
    };
    const coarse = reconstructHybridBraggMaxwellFields(design, 600.01, {
      samplesPerPeriod: 16,
      envelopeBlocks: 1,
    });
    const split = reconstructHybridBraggMaxwellFields(design, 600.01, {
      samplesPerPeriod: 16,
      envelopeBlocks: 10,
    });

    expect(split.reflectance).toBeCloseTo(coarse.reflectance, 12);
    expect(split.samples.length).toBe(coarse.samples.length);
    expect(split.samples[split.samples.length - 1]?.normalizedBackwardIntensity).toBeCloseTo(
      coarse.samples[coarse.samples.length - 1]!.normalizedBackwardIntensity,
      12,
    );
  });

  it('keeps full-length locally periodic structures finite and energy conserving', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 10,
      indexModulation: 1e-4,
      peakStrain: 0.0015,
      strainBias: 0.0015,
      strainShape: 'piezo-trough' as const,
      perturbationEdgeWidthMm: 0.25,
      fixedLaserWavelengthNm: 600.11,
    };
    const result = solveHybridBraggMaxwellLocallyPeriodicPoint(design, 600.11, {
      samplesPerPeriod: 16,
      envelopeBlocks: 100,
    });

    expect(Number.isFinite(result.reflectance)).toBe(true);
    expect(Number.isFinite(result.transmission)).toBe(true);
    expect(result.energyError).toBeLessThan(1e-9);
  });
});
