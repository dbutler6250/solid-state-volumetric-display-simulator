import { describe, expect, it } from 'vitest';
import { exportBraggConfigJson } from './exportBraggConfigJson';
import { importBraggConfigJson } from './importBraggConfigJson';
import type { Material } from '../simulation/materials/material';
import type { BraggReflectorInputs } from '../types/simulation';

const makeMaterial = (id: string, name: string, refractiveIndex: number): Material => ({
  id,
  name,
  refractiveIndex,
});

const inputs: BraggReflectorInputs = {
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

describe('importBraggConfigJson', () => {
  it('round-trips a valid exported JSON setup', () => {
    const json = exportBraggConfigJson(inputs);
    const imported = importBraggConfigJson(json);

    expect(imported).toEqual({
      ok: true,
      inputs,
    });
  });

  it('returns an error for invalid JSON', () => {
    expect(importBraggConfigJson('{')).toEqual({
      ok: false,
      message: 'The selected file is not valid JSON.',
    });
  });

  it('returns an error for an unsupported schema', () => {
    const payload = {
      schema: 'other-schema',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs,
    };

    expect(importBraggConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'This setup file uses an unsupported schema.',
    });
  });

  it('returns an error when inputs are missing', () => {
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
    };

    expect(importBraggConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'The setup file is missing its inputs payload.',
    });
  });

  it('returns an error for invalid polarization', () => {
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs: {
        ...inputs,
        polarization: 'XYZ',
      },
    };

    expect(importBraggConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Polarization must be TE or TM.',
    });
  });

  it('returns an error for an invalid material refractive index', () => {
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs: {
        ...inputs,
        highIndexMaterial: {
          ...inputs.highIndexMaterial,
          refractiveIndex: 0,
        },
      },
    };

    expect(importBraggConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'The high-index material refractive index must be a finite number greater than 0.',
    });
  });

  it('returns an error for an invalid sweep range', () => {
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs: {
        ...inputs,
        wavelengthEndNm: inputs.wavelengthStartNm,
      },
    };

    expect(importBraggConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Sweep end must be greater than sweep start.',
    });
  });

  it('returns an error for an invalid point count', () => {
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs: {
        ...inputs,
        wavelengthPointCount: 1,
      },
    };

    expect(importBraggConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Sweep points must be a whole number of at least 2.',
    });
  });
});
