import { describe, expect, it } from 'vitest';
import type { Material } from '../simulation/materials/material';
import type { QuarterWaveStackInputs } from '../types/simulation';
import { exportStackConfigJson } from './exportStackConfigJson';

const makeMaterial = (id: string, name: string, refractiveIndex: number): Material => ({
  id,
  name,
  refractiveIndex,
});

const inputs: QuarterWaveStackInputs = {
  highIndexMaterial: makeMaterial('tio2', 'Titanium Dioxide', 2.45),
  lowIndexMaterial: makeMaterial('sio2', 'Silicon Dioxide', 1.46),
  periodCount: 12,
  designWavelengthNm: 532,
  incidentAngleDegrees: 17.5,
  polarization: 'TM',
  wavelengthStartNm: 450,
  wavelengthEndNm: 650,
  wavelengthPointCount: 401,
};

describe('exportStackConfigJson', () => {
  it('exports the expected setup shape and metadata', () => {
    const json = exportStackConfigJson(inputs);
    const exported = JSON.parse(json) as Record<string, unknown>;

    expect(exported.schema).toBe('ssvds-stack-config-v1');
    expect(exported.app).toBe('solid-state-volumetric-display-simulator');
    expect(exported.structureType).toBe('quarter-wave-stack');
    expect(exported.exportedAt).toEqual(expect.any(String));
    expect(Date.parse(String(exported.exportedAt))).not.toBeNaN();
    expect(exported.units).toEqual({
      wavelength: 'nm',
      angle: 'deg',
    });
  });

  it('exports material and sweep inputs', () => {
    const json = exportStackConfigJson(inputs);
    const exported = JSON.parse(json) as {
      inputs: QuarterWaveStackInputs;
    };

    expect(exported.inputs.highIndexMaterial).toEqual(inputs.highIndexMaterial);
    expect(exported.inputs.lowIndexMaterial).toEqual(inputs.lowIndexMaterial);
    expect(exported.inputs.periodCount).toBe(12);
    expect(exported.inputs.designWavelengthNm).toBe(532);
    expect(exported.inputs.incidentAngleDegrees).toBe(17.5);
    expect(exported.inputs.polarization).toBe('TM');
    expect(exported.inputs.wavelengthStartNm).toBe(450);
    expect(exported.inputs.wavelengthEndNm).toBe(650);
    expect(exported.inputs.wavelengthPointCount).toBe(401);
  });
});
