import { describe, expect, it } from 'vitest';
import { exportResultsCsv } from './exportResultsCsv';
import type { BraggReflectorInputs, SimulationResult } from '../types/simulation';
import type { Material } from '../simulation/materials/material';

const makeMaterial = (id: string, name: string, refractiveIndex: number): Material => ({
  id,
  name,
  refractiveIndex,
});

const inputs: BraggReflectorInputs = {
  highIndexMaterial: makeMaterial('hi, "quoted"', 'High\nIndex', 2.45),
  lowIndexMaterial: makeMaterial('lo', 'Low Index', 1.52),
  periodCount: 8,
  designWavelengthNm: 620,
  incidentAngleDegrees: 15,
  polarization: 'TE',
  wavelengthStartNm: 500,
  wavelengthEndNm: 700,
  wavelengthPointCount: 3,
};

const result: SimulationResult = {
  peakReflectance: 0.9876,
  centerWavelengthNm: 623.4,
  bandwidthNm: 41.2,
  maxEnergyConservationError: 1.23e-12,
  spectrum: [
    { wavelengthNm: 500, reflectance: 0.1, transmission: 0.9 },
    { wavelengthNm: 600.5, reflectance: 0.2, transmission: 0.8 },
    { wavelengthNm: 700, reflectance: 0.3, transmission: 0.7 },
  ],
};

describe('exportResultsCsv', () => {
  it('exports metadata comments and spectrum rows', () => {
    const csv = exportResultsCsv(inputs, result);
    const lines = csv.trimEnd().split('\n');

    expect(lines[0]).toBe('# Solid State Volumetric Display Simulator');
    expect(lines[1]).toBe('# Bragg reflector spectrum export');
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
});
