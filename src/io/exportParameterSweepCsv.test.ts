import { describe, expect, it } from 'vitest';
import type {
  ParameterSweepResult,
  ParameterSweepSettings,
  QuarterWaveStackInputs,
} from '../types/simulation';
import type { Material } from '../simulation/materials/material';
import { exportParameterSweepCsv } from './exportParameterSweepCsv';

const makeMaterial = (id: string, name: string, refractiveIndex: number): Material => ({
  id,
  name,
  refractiveIndex,
});

const inputs: QuarterWaveStackInputs = {
  highIndexMaterial: makeMaterial('hi', 'High Index', 2.45),
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

const settings: ParameterSweepSettings = {
  parameter: 'incidentAngleDegrees',
  start: 0,
  end: 89.9,
  pointCount: 2,
};

const result: ParameterSweepResult = {
  settings,
  points: [
    {
      parameterValue: 0,
      peakReflectance: 0.8,
      centerWavelengthNm: 510,
      bandwidthNm: 25,
    },
    {
      parameterValue: 89.9,
      peakReflectance: null,
      centerWavelengthNm: null,
      bandwidthNm: null,
    },
  ],
};

// Keeps parameter sweep export metadata and nullable metric rows stable.
describe('exportParameterSweepCsv', () => {
  it('exports sweep settings, fixed inputs, and metric rows', () => {
    const csv = exportParameterSweepCsv(inputs, settings, result);
    const lines = csv.trimEnd().split('\n');

    expect(lines).toContain('# schema: ssvds-parameter-sweep-csv-v1');
    expect(lines).toContain('# sweep.parameter: incidentAngleDegrees');
    expect(lines).toContain('# sweep.pointCount: 2');
    expect(lines).toContain('parameter_value,peak_reflectance,center_wavelength_nm,bandwidth_nm');
    expect(lines[lines.length - 2]).toBe('0,0.8,510,25');
    expect(lines[lines.length - 1]).toBe('89.9,,,');
  });
});
