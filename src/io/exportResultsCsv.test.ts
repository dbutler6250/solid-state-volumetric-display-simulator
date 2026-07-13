import { describe, expect, it } from 'vitest';
import { exportResultsCsv } from './exportResultsCsv';
import type { QuarterWaveStackInputs, SimulationResult } from '../types/simulation';
import type { Material } from '../simulation/materials/material';
import { DEFAULT_ACOUSTIC_DESIGN_INPUTS } from '../simulation/structures/acoustoOpticGrating';

const makeMaterial = (id: string, name: string, refractiveIndex: Material['refractiveIndex']): Material => ({
  id,
  name,
  refractiveIndex,
});

const inputs: QuarterWaveStackInputs = {
  highIndexMaterial: makeMaterial('hi, "quoted"', 'High\nIndex', 2.45),
  lowIndexMaterial: makeMaterial('lo', 'Low Index', 1.52),
  periodCount: 8,
  designWavelengthNm: 620,
  incidentAngleDegrees: 15,
  polarization: 'TE',
  thicknessMode: 'derived',
  wavelengthStartNm: 500,
  wavelengthEndNm: 700,
  wavelengthPointCount: 3,
};

const result: SimulationResult = {
  peakReflectance: 0.9876,
  centerWavelengthNm: 623.4,
  bandwidthNm: 41.2,
  maxEnergyConservationError: 1.23e-12,
  bandTouchesBoundary: false,
  spectrum: [
    { wavelengthNm: 500, reflectance: 0.1, transmission: 0.9 },
    { wavelengthNm: 600.5, reflectance: 0.2, transmission: 0.8 },
    { wavelengthNm: 700, reflectance: 0.3, transmission: 0.7 },
  ],
};

// Keeps the exported CSV schema and metadata headers stable.
describe('exportResultsCsv', () => {
  it('exports metadata comments and spectrum rows', () => {
    const csv = exportResultsCsv(inputs, result);
    const lines = csv.trimEnd().split('\n');

    expect(lines[0]).toBe('# Solid State Volumetric Display Simulator');
    expect(lines[1]).toBe('# Optical stack spectrum export');
    expect(lines[2]).toBe('# schema: ssvds-results-csv-v1');
    expect(lines).toContain('# highIndexMaterial.name: High\\nIndex');
    expect(lines).toContain('# highIndexMaterial.id: hi, \\"quoted\\"');
    expect(lines).toContain('wavelength_nm,reflectance,transmission');
    expect(lines[lines.length - 1]).toBe('700,0.3,0.7');
  });

  it('escapes commas, quotes, and newlines in comment metadata values', () => {
    const csv = exportResultsCsv(inputs, result);

    expect(csv).toContain('# highIndexMaterial.id: hi, \\"quoted\\"');
    expect(csv).toContain('# highIndexMaterial.name: High\\nIndex');
  });

  it('formats complex refractive-index metadata for CSV comments', () => {
    const complexCsv = exportResultsCsv(
      {
        ...inputs,
        highIndexMaterial: makeMaterial('absorber', 'Absorber', { real: 2.2, imag: 0.12 }),
      },
      result,
    );

    expect(complexCsv).toContain('# highIndexMaterial.refractiveIndex: n=2.200 + i0.120');
  });

  it('distinguishes manual stacks by their resolved physical thicknesses', () => {
    const first = exportResultsCsv({
      ...inputs,
      thicknessMode: 'manual',
      highIndexThicknessNm: 70,
      lowIndexThicknessNm: 100,
    }, result);
    const second = exportResultsCsv({
      ...inputs,
      thicknessMode: 'manual',
      highIndexThicknessNm: 90,
      lowIndexThicknessNm: 130,
    }, result);

    expect(first).toContain('# thicknessStrategy: manual');
    expect(first).toContain('# highIndexThicknessNm: 70');
    expect(first).toContain('# lowIndexThicknessNm: 100');
    expect(first).toContain('# resolvedTotalThicknessNm: 1360');
    expect(second).toContain('# resolvedTotalThicknessNm: 1760');
    expect(first).not.toBe(second);
  });

  it('exports resolved acoustic geometry and preserves a complex material index', () => {
    const csv = exportResultsCsv({
      ...inputs,
      thicknessMode: 'acoustic',
      acousticDesign: {
        ...DEFAULT_ACOUSTIC_DESIGN_INPUTS,
        acousticMaterial: makeMaterial('lossy', 'Lossy glass', { real: 1.5, imag: 0.02 }),
        acousticPeriodCount: 3,
        acousticRepresentationMode: 'fast',
      },
    }, result);

    expect(csv).toContain('# acousticMaterial.refractiveIndex: n=1.500 + i0.020');
    expect(csv).toContain('# acousticVelocityMps: 5970');
    expect(csv).toContain('# resolvedLayerCount: 24');
    expect(csv).toContain('# slicesPerPeriod: 8');
    expect(csv).toContain('# sliceThicknessNm:');
    expect(csv).toContain('# resolvedTotalThicknessNm:');
  });
});
