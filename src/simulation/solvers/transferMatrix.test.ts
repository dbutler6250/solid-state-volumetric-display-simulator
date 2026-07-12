import { describe, expect, it } from 'vitest';
import type { QuarterWaveStackInputs, SimulationResult } from '../../types/simulation';
import type { LayerStack } from '../layers/stack';
import { AIR } from '../materials/catalog';
import type { Material } from '../materials/material';
import {
  solveLayerStack,
  solveQuarterWaveStack,
  solveQuarterWaveStackParameterSweep,
} from './transferMatrix';

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

// Exercises solver accuracy, energy conservation, and band metrics.
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

  it('computes the center wavelength from the stopband instead of forcing the design wavelength', () => {
    const designWavelengthNm = 600;
    const highIndexMaterial = makeMaterial('nH', 2.4);
    const lowIndexMaterial = makeMaterial('nL', 1.45);
    const inputs: QuarterWaveStackInputs = {
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

    const result = solveQuarterWaveStack(inputs);

    expect(Math.abs(result.centerWavelengthNm - designWavelengthNm)).toBeGreaterThan(10);
    expect(result.peakReflectance).toBeGreaterThan(0.95);
    expect(result.bandwidthNm).toBeGreaterThan(0);
  });

  it('interpolates peak and bandwidth metrics between sampled wavelengths', () => {
    const wavelengthStartNm = 440;
    const wavelengthEndNm = 760;
    const wavelengthPointCount = 41;
    const inputs: QuarterWaveStackInputs = {
      highIndexMaterial: makeMaterial('nH', 2.4),
      lowIndexMaterial: makeMaterial('nL', 1.45),
      periodCount: 6,
      designWavelengthNm: 603,
      incidentAngleDegrees: 0,
      polarization: 'TE',
      wavelengthStartNm,
      wavelengthEndNm,
      wavelengthPointCount,
    };

    const result = solveQuarterWaveStack(inputs);
    const sampledPeakReflectance = Math.max(...result.spectrum.map((point) => point.reflectance));
    const sampleStepNm = (wavelengthEndNm - wavelengthStartNm) / (wavelengthPointCount - 1);
    const nearestSampleStepCount = Math.round(result.bandwidthNm / sampleStepNm);

    expect(result.peakReflectance).toBeGreaterThanOrEqual(sampledPeakReflectance);
    expect(Math.abs(result.bandwidthNm - nearestSampleStepCount * sampleStepNm)).toBeGreaterThan(1e-6);
  });

  it('conserves energy for a lossless quarter-wave stack sweep', () => {
    const designWavelengthNm = 600;
    const highIndexMaterial = makeMaterial('nH', 2.4);
    const lowIndexMaterial = makeMaterial('nL', 1.45);
    const result = solveQuarterWaveStack({
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

  it('sweeps design wavelength and returns summary metrics for each point', () => {
    const inputs: QuarterWaveStackInputs = {
      highIndexMaterial: makeMaterial('nH', 2.4),
      lowIndexMaterial: makeMaterial('nL', 1.45),
      periodCount: 6,
      designWavelengthNm: 600,
      incidentAngleDegrees: 0,
      polarization: 'TE',
      wavelengthStartNm: 400,
      wavelengthEndNm: 900,
      wavelengthPointCount: 101,
    };

    const result = solveQuarterWaveStackParameterSweep(inputs, {
      parameter: 'designWavelengthNm',
      start: 500,
      end: 700,
      pointCount: 3,
    });

    expect(result.points.map((point) => point.parameterValue)).toEqual([500, 600, 700]);
    expect(
      result.points.every(
        (point) => point.peakReflectance !== null && point.peakReflectance > 0,
      ),
    ).toBe(true);
    expect(
      result.points.every(
        (point) => point.centerWavelengthNm !== null && point.centerWavelengthNm > 0,
      ),
    ).toBe(true);
  });

  it('includes a required wavelength in the sampled spectrum', () => {
    const result = solveQuarterWaveStack(
      {
        highIndexMaterial: makeMaterial('nH', 2.4),
        lowIndexMaterial: makeMaterial('nL', 1.45),
        periodCount: 6,
        designWavelengthNm: 600,
        incidentAngleDegrees: 0,
        polarization: 'TE',
        wavelengthStartNm: 300,
        wavelengthEndNm: 900,
        wavelengthPointCount: 2,
      },
      { requiredWavelengthNm: 600 },
    );

    expect(result.spectrum.map((point) => point.wavelengthNm)).toEqual([300, 600, 900]);
  });

  it('suppresses parameter sweep band metrics when the band touches the analysis boundary', () => {
    const result = solveQuarterWaveStackParameterSweep(
      {
        highIndexMaterial: makeMaterial('nH', 2.4),
        lowIndexMaterial: makeMaterial('nL', 1.45),
        periodCount: 8,
        designWavelengthNm: 600,
        incidentAngleDegrees: 0,
        polarization: 'TE',
        wavelengthStartNm: 300,
        wavelengthEndNm: 900,
        wavelengthPointCount: 301,
      },
      {
        parameter: 'designWavelengthNm',
        start: 600,
        end: 900,
        pointCount: 2,
      },
    );

    expect(result.points[0].centerWavelengthNm).not.toBeNull();
    expect(result.points[0].bandwidthNm).not.toBeNull();
    expect(result.points[1]).toMatchObject({
      peakReflectance: null,
      centerWavelengthNm: null,
      bandwidthNm: null,
    });
  });

  it('sweeps period count as integer values', () => {
    const inputs: QuarterWaveStackInputs = {
      highIndexMaterial: makeMaterial('nH', 2.4),
      lowIndexMaterial: makeMaterial('nL', 1.45),
      periodCount: 6,
      designWavelengthNm: 600,
      incidentAngleDegrees: 0,
      polarization: 'TE',
      wavelengthStartNm: 450,
      wavelengthEndNm: 750,
      wavelengthPointCount: 81,
    };

    const result = solveQuarterWaveStackParameterSweep(inputs, {
      parameter: 'periodCount',
      start: 3,
      end: 7,
      pointCount: 5,
    });

    expect(result.points.map((point) => point.parameterValue)).toEqual([3, 4, 5, 6, 7]);
    const firstPeakReflectance = result.points[0].peakReflectance ?? 0;
    const lastPeakReflectance = result.points[result.points.length - 1].peakReflectance ?? 0;

    expect(lastPeakReflectance).toBeGreaterThan(firstPeakReflectance);
  });
});
