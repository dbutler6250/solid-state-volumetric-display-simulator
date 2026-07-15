import { describe, expect, it } from 'vitest';
import { exportStackConfigJson } from './exportStackConfigJson';
import { importStackConfigJson } from './importStackConfigJson';
import type { Material } from '../simulation/materials/material';
import type { ParameterSweepSettings, QuarterWaveStackInputs } from '../types/simulation';

const makeMaterial = (id: string, name: string, refractiveIndex: Material['refractiveIndex']): Material => ({
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
  thicknessMode: 'derived',
  acousticDesign: {
    acousticMaterial: makeMaterial('fused-silica', 'Fused silica', 1.45),
    acousticVelocityMps: 5970,
    acousticFrequencyHz: 1e9,
    acousticPeriodCount: 10,
    braggOrder: 1,
    acousticIndexModulation: 0.002,
    acousticRepresentationMode: 'accurate',
  },
  wavelengthStartNm: 450,
  wavelengthEndNm: 650,
  wavelengthPointCount: 401,
};

const parameterSweep: ParameterSweepSettings = {
  parameter: 'incidentAngleDegrees',
  start: 0,
  end: 89.9,
  pointCount: 10,
};

const modernUnits = {
  wavelength: 'nm',
  angle: 'deg',
};

const makeModernPayload = (
  overrides: Partial<{
    structureType: string;
    units: unknown;
    inputs: unknown;
    parameterSweep: unknown;
  }> = {},
) => ({
  schema: 'ssvds-stack-config-v1',
  app: 'solid-state-volumetric-display-simulator',
  structureType: 'quarter-wave-stack',
  units: modernUnits,
  inputs,
  ...overrides,
});

// Covers the preferred schema and the retained legacy Bragg aliases.
describe('importStackConfigJson', () => {
  it('round-trips a valid exported JSON setup', () => {
    const json = exportStackConfigJson(inputs, parameterSweep);
    const imported = importStackConfigJson(json);

    expect(imported).toEqual({
      ok: true,
      inputs,
      parameterSweep,
    });
  });

  it('returns an error for invalid JSON', () => {
    expect(importStackConfigJson('{')).toEqual({
      ok: false,
      message: 'The selected file is not valid JSON.',
    });
  });

  it('returns an error for an unsupported schema', () => {
    const payload = {
      schema: 'other-schema',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-stack',
      inputs,
    };

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'This setup file uses an unsupported schema.',
    });
  });

  it('returns an error when inputs are missing', () => {
    const payload = makeModernPayload({ inputs: undefined });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'The setup file is missing its inputs payload.',
    });
  });

  it('returns an error for invalid polarization', () => {
    const payload = makeModernPayload({
      inputs: {
        ...inputs,
        polarization: 'XYZ',
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Polarization must be TE or TM.',
    });
  });

  it('returns an error for an invalid material refractive index', () => {
    const payload = makeModernPayload({
      inputs: {
        ...inputs,
        highIndexMaterial: {
          ...inputs.highIndexMaterial,
          refractiveIndex: 0,
        },
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'The material refractive index must be a finite number greater than 0.',
    });
  });

  it('imports complex refractive-index objects', () => {
    const payload = makeModernPayload({
      inputs: {
        ...inputs,
        highIndexMaterial: {
          ...inputs.highIndexMaterial,
          refractiveIndex: {
            real: 2.3,
            imag: 0.15,
          },
        },
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: true,
      inputs: {
        ...inputs,
        highIndexMaterial: {
          ...inputs.highIndexMaterial,
          refractiveIndex: {
            real: 2.3,
            imag: 0.15,
          },
        },
      },
    });
  });

  it('preserves precise imported manual thickness values', () => {
    const manualInputs = {
      ...inputs,
      thicknessMode: 'manual' as const,
      highIndexThicknessNm: 103.25,
      lowIndexThicknessNm: 105.625,
    };
    const payload = makeModernPayload({ inputs: manualInputs });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: true,
      inputs: manualInputs,
    });
  });

  it('returns an error for an invalid sweep range', () => {
    const payload = makeModernPayload({
      inputs: {
        ...inputs,
        wavelengthEndNm: inputs.wavelengthStartNm,
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Sweep end must be greater than sweep start.',
    });
  });

  it('returns an error for an invalid point count', () => {
    const payload = makeModernPayload({
      inputs: {
        ...inputs,
        wavelengthPointCount: 1,
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Sweep points must be a whole number of at least 2.',
    });
  });

  it('imports legacy Bragg setup JSON', () => {
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs,
    };

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: true,
      inputs,
    });
  });

  it('defaults omitted legacy Bragg thickness mode to derived', () => {
    const legacyInputs = {
      ...inputs,
      thicknessMode: undefined,
    };
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs: legacyInputs,
    };

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: true,
      inputs: {
        ...legacyInputs,
        thicknessMode: 'derived',
      },
    });
  });

  it('returns an error when a legacy Bragg setup uses acoustic input mode', () => {
    const payload = {
      schema: 'ssvds-bragg-config-v1',
      app: 'solid-state-volumetric-display-simulator',
      structureType: 'quarter-wave-bragg-reflector',
      inputs: {
        ...inputs,
        thicknessMode: 'acoustic',
      },
    };

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Legacy Bragg setup files cannot use acoustic input mode.',
    });
  });

  it('rejects invalid parameter sweep setup', () => {
    const payload = makeModernPayload({
      parameterSweep: {
        parameter: 'incidentAngleDegrees',
        start: 10,
        end: 10,
        pointCount: 5,
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Parameter sweep end must be greater than start.',
    });
  });

  it('imports an acoustic structure with a complex material index', () => {
    const acousticInputs = {
      ...inputs,
      thicknessMode: 'acoustic' as const,
      acousticDesign: {
        acousticMaterial: {
          id: 'lossy-medium',
          name: 'Lossy medium',
          refractiveIndex: { real: 1.52, imag: 0.015 },
        },
        acousticVelocityMps: 5970,
        acousticFrequencyHz: 1e9,
        acousticPeriodCount: 10,
        braggOrder: 1,
        acousticIndexModulation: 0.002,
        acousticRepresentationMode: 'accurate' as const,
      },
    };
    const payload = makeModernPayload({
      structureType: 'acousto-optic-grating',
      inputs: acousticInputs,
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: true,
      inputs: acousticInputs,
    });
  });

  it('round-trips a valid exported acoustic JSON setup', () => {
    const acousticInputs = {
      ...inputs,
      thicknessMode: 'acoustic' as const,
    };
    const imported = importStackConfigJson(exportStackConfigJson(acousticInputs));

    expect(imported).toEqual({
      ok: true,
      inputs: acousticInputs,
    });
  });

  it('returns an error when modern units are missing', () => {
    const payload = makeModernPayload({ units: undefined });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Modern setup files must include units metadata.',
    });
  });

  it('returns an error for unsupported modern wavelength units', () => {
    const payload = makeModernPayload({
      units: {
        wavelength: 'um',
        angle: 'deg',
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Modern setup wavelength units must be nm.',
    });
  });

  it('returns an error for unsupported modern angle units', () => {
    const payload = makeModernPayload({
      units: {
        wavelength: 'nm',
        angle: 'rad',
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Modern setup angle units must be deg.',
    });
  });

  it('returns an error for an unknown thickness mode', () => {
    const payload = makeModernPayload({
      inputs: {
        ...inputs,
        thicknessMode: 'manual-v2',
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Input mode must be derived, manual, or acoustic.',
    });
  });

  it('returns an error for an unknown acoustic representation mode', () => {
    const payload = makeModernPayload({
      structureType: 'acousto-optic-grating',
      inputs: {
        ...inputs,
        thicknessMode: 'acoustic',
        acousticDesign: {
          ...inputs.acousticDesign!,
          acousticRepresentationMode: 'future-mode',
        },
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Acoustic representation mode must be binary, fast, accurate, or reference.',
    });
  });

  it('returns an error when an acoustic structure uses optical input mode', () => {
    const payload = makeModernPayload({
      structureType: 'acousto-optic-grating',
      inputs: {
        ...inputs,
        thicknessMode: 'derived',
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Acousto-optic grating setup files must use acoustic input mode.',
    });
  });

  it('returns an error when a quarter-wave stack uses acoustic input mode', () => {
    const payload = makeModernPayload({
      structureType: 'quarter-wave-stack',
      inputs: {
        ...inputs,
        thicknessMode: 'acoustic',
      },
    });

    expect(importStackConfigJson(JSON.stringify(payload))).toEqual({
      ok: false,
      message: 'Quarter-wave stack setup files cannot use acoustic input mode.',
    });
  });
});
