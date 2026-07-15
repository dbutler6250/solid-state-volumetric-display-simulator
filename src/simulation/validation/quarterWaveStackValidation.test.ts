import { describe, expect, it } from 'vitest';
import type { Material } from '../materials/material';
import type { AcousticRepresentationMode, QuarterWaveStackInputs } from '../../types/simulation';
import {
  DEFAULT_WAVELENGTH_POINT_COUNT,
  MAX_OPTICAL_PERIODS,
  MAX_WAVELENGTH_POINTS,
} from '../simulationLimits';
import { validateQuarterWaveStackInputs } from './quarterWaveStackValidation';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../structures/quarterWaveStack';
import { createSimulationDocument } from '../structures/structureResolver';

const makeMaterial = (id: string, name: string, refractiveIndex: Material['refractiveIndex']): Material => ({
  id,
  name,
  refractiveIndex,
});

const acousticInputs: QuarterWaveStackInputs = {
  highIndexMaterial: makeMaterial('tio2', 'Titanium Dioxide', 2.45),
  lowIndexMaterial: makeMaterial('sio2', 'Silicon Dioxide', 1.46),
  periodCount: 12,
  designWavelengthNm: 532,
  incidentAngleDegrees: 0,
  polarization: 'TE',
  thicknessMode: 'acoustic',
  acousticDesign: {
    acousticMaterial: makeMaterial('fused-silica', 'Fused silica', 1.45),
    acousticVelocityMps: 5970,
    acousticFrequencyHz: 1e9,
    acousticPeriodCount: 4,
    braggOrder: 1,
    acousticIndexModulation: 0.002,
    acousticRepresentationMode: 'accurate',
  },
};

describe('validateQuarterWaveStackInputs', () => {
  it('uses the shared 500-point default when wavelengthPointCount is omitted', () => {
    const issues = validateQuarterWaveStackInputs({
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      wavelengthPointCount: undefined,
    });

    expect(issues).toEqual([]);
    expect(DEFAULT_WAVELENGTH_POINT_COUNT).toBe(500);
  });

  it('rejects wavelengthPointCount above the shared maximum', () => {
    expect(
      validateQuarterWaveStackInputs({
        ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
        wavelengthPointCount: MAX_WAVELENGTH_POINTS + 1,
      }),
    ).toContainEqual({
      field: 'wavelengthPointCount',
      message: `Sweep points must not exceed ${MAX_WAVELENGTH_POINTS.toLocaleString()}.`,
    });
  });

  it('rejects optical periodCount above the shared maximum', () => {
    expect(
      validateQuarterWaveStackInputs({
        ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
        periodCount: MAX_OPTICAL_PERIODS + 1,
      }),
    ).toContainEqual({
      field: 'periodCount',
      message: `Period count must not exceed ${MAX_OPTICAL_PERIODS.toLocaleString()} for direct optical or manual solving.`,
    });
  });

  it('allows a 500-layer optical stack when the inputs are otherwise valid', () => {
    const issues = validateQuarterWaveStackInputs({
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      periodCount: 500,
      wavelengthPointCount: 500,
    });

    expect(issues).toEqual([]);
  });

  it('keeps acoustic slice validation intact', () => {
    const issues = validateQuarterWaveStackInputs({
      ...acousticInputs,
      acousticDesign: {
        ...acousticInputs.acousticDesign!,
        acousticPeriodCount: 4097,
      },
    });

    expect(issues).toContainEqual({
      field: 'thicknessMode',
      message: 'Automatic acoustic solving is limited to 4,096 slices. Reduce periods or representation detail.',
    });
  });

  it('rejects an invalid runtime acoustic representation mode', () => {
    const issues = validateQuarterWaveStackInputs({
      ...acousticInputs,
      acousticDesign: {
        ...acousticInputs.acousticDesign!,
        acousticRepresentationMode: 'future-mode' as AcousticRepresentationMode,
      },
    });

    expect(issues).toContainEqual({
      field: 'thicknessMode',
      message: 'Acoustic representation mode must be binary, fast, accurate, or reference.',
    });
  });

  it('accepts every supported acoustic representation mode', () => {
    const modes: AcousticRepresentationMode[] = ['binary', 'fast', 'accurate', 'reference'];

    for (const mode of modes) {
      const issues = validateQuarterWaveStackInputs({
        ...acousticInputs,
        acousticDesign: {
          ...acousticInputs.acousticDesign!,
          acousticRepresentationMode: mode,
        },
      });

      expect(issues).toEqual([]);
    }
  });

  it('treats the canonical document default wavelength count as 500', () => {
    const document = createSimulationDocument(DEFAULT_QUARTER_WAVE_STACK_INPUTS);

    expect(document.analysis.wavelengthPointCount).toBe(500);
  });
});
