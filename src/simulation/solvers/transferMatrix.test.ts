import { describe, expect, it } from 'vitest';
import type { BraggReflectorInputs, SimulationResult } from '../../types/simulation';
import type { LayerStack } from '../layers/stack';
import { AIR } from '../materials/catalog';
import type { Material } from '../materials/material';
import { solveBraggReflector, solveLayerStack } from './transferMatrix';

const expectCloseTo = (actual: number, expected: number, tolerance: number) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const maxEnergyError = (result: SimulationResult): number =>
  Math.max(...result.spectrum.map((point) => Math.abs(point.reflectance + point.transmission - 1)));

const makeMaterial = (id: string, refractiveIndex: number): Material => ({
  id,
  name: id,
  refractiveIndex,
});

describe('transfer matrix solver', () => {
  it('returns zero reflectance and unit transmission for an empty air-to-air stack', () => {
    const stack: LayerStack = {
      incidentMedium: AIR,
      layers: [],
      exitMedium: AIR,
    };

    const result = solveLayerStack(stack, {
      wavelengthNm: 600,
      incidentAngleDegrees: 0,
      polarization: 'TE',
    });

    expectCloseTo(result.reflectance, 0, 1e-12);
    expectCloseTo(result.transmission, 1, 1e-12);
  });

  it('returns zero reflectance and unit transmission for a uniform air layer', () => {
    const stack: LayerStack = {
      incidentMedium: AIR,
      layers: [
        {
          material: AIR,
          thicknessNm: 250,
        },
      ],
      exitMedium: AIR,
    };

    const result = solveLayerStack(stack, {
      wavelengthNm: 600,
      incidentAngleDegrees: 0,
      polarization: 'TM',
    });

    expectCloseTo(result.reflectance, 0, 1e-12);
    expectCloseTo(result.transmission, 1, 1e-12);
  });

  it('places the quarter-wave Bragg peak near the design wavelength', () => {
    const designWavelengthNm = 600;
    const highIndexMaterial = makeMaterial('nH', 2.4);
    const lowIndexMaterial = makeMaterial('nL', 1.45);
    const inputs: BraggReflectorInputs = {
      highIndexMaterial,
      lowIndexMaterial,
      periodCount: 8,
      designWavelengthNm,
      incidentAngleDegrees: 0,
      polarization: 'TE',
      wavelengthStartNm: 450,
      wavelengthEndNm: 750,
      wavelengthPointCount: 301,
    };

    const result = solveBraggReflector(inputs);

    expect(Math.abs(result.centerWavelengthNm - designWavelengthNm)).toBeLessThanOrEqual(10);
    expect(result.peakReflectance).toBeGreaterThan(0.95);
  });

  it('conserves energy for a lossless Bragg reflector sweep', () => {
    const designWavelengthNm = 600;
    const highIndexMaterial = makeMaterial('nH', 2.4);
    const lowIndexMaterial = makeMaterial('nL', 1.45);
    const result = solveBraggReflector({
      highIndexMaterial,
      lowIndexMaterial,
      periodCount: 6,
      designWavelengthNm,
      incidentAngleDegrees: 25,
      polarization: 'TE',
      wavelengthStartNm: 450,
      wavelengthEndNm: 750,
      wavelengthPointCount: 121,
    });

    expect(maxEnergyError(result)).toBeLessThan(1e-10);
    expect(result.maxEnergyConservationError).toBeLessThan(1e-10);
  });
});
