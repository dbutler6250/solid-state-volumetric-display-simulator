import { describe, expect, it } from 'vitest';
import type { Material } from '../materials/material';
import type { AcousticRepresentationMode, QuarterWaveStackInputs } from '../../types/simulation';
import { validateQuarterWaveStackInputs } from './quarterWaveStackValidation';

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
});
