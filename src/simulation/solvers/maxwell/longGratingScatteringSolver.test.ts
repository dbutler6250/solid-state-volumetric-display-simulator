import { describe, expect, it } from 'vitest';
import {
  buildHybridBraggMaxwellLayers,
  buildSinusoidalUnitCell,
  composeScattering,
  identityScattering,
  repeatScattering,
  solveHybridBraggMaxwellPoint,
  solveScatteringLayers,
  type ScatteringMatrix,
} from './longGratingScatteringSolver';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../../structures/hybridBraggGrating';

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
});
