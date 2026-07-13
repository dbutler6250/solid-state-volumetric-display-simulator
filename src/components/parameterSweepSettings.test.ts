import { describe, expect, it } from 'vitest';
import {
  FIXED_INCIDENT_ANGLE_SWEEP,
  getEffectiveParameterSweep,
  getInclusivePeriodPointCount,
} from './parameterSweepSettings';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import { DEFAULT_ACOUSTIC_DESIGN_INPUTS } from '../simulation/structures/acoustoOpticGrating';

describe('parameter sweep settings', () => {
  it('keeps the user-facing incident-angle sweep fixed', () => {
    expect(FIXED_INCIDENT_ANGLE_SWEEP).toEqual({
      parameter: 'incidentAngleDegrees',
      start: 0,
      end: 89,
      pointCount: 89,
    });
  });

  it('derives one point for every inclusive period', () => {
    expect(getInclusivePeriodPointCount(1, 20)).toBe(20);
    expect(getInclusivePeriodPointCount(5, 10)).toBe(6);
  });

  it('matches the solver normalization for non-integer or reversed bounds', () => {
    expect(getInclusivePeriodPointCount(1.4, 20.4)).toBe(20);
    expect(getInclusivePeriodPointCount(10, 5)).toBe(2);
  });

  it('preserves configured acoustic frequency and modulation bounds', () => {
    const inputs = {
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      thicknessMode: 'acoustic' as const,
      acousticDesign: DEFAULT_ACOUSTIC_DESIGN_INPUTS,
      wavelengthStartNm: 300,
      wavelengthEndNm: 900,
    };
    const frequency = getEffectiveParameterSweep(inputs, {
      parameter: 'acousticFrequencyHz',
      start: 5e8,
      end: 1.5e9,
      pointCount: 5,
    });
    const modulation = getEffectiveParameterSweep(inputs, {
      parameter: 'acousticIndexModulation',
      start: 0.0005,
      end: 0.004,
      pointCount: 7,
    });

    expect(frequency).toMatchObject({ start: 5e8, end: 1.5e9, pointCount: 5 });
    expect(modulation).toMatchObject({ start: 0.0005, end: 0.004, pointCount: 7 });
  });

  it('derives only design-wavelength bounds from the analysis range', () => {
    expect(getEffectiveParameterSweep(DEFAULT_QUARTER_WAVE_STACK_INPUTS, {
      parameter: 'designWavelengthNm',
      start: 1,
      end: 2,
      pointCount: 3,
    })).toMatchObject({ start: 300, end: 900, pointCount: 3 });
  });
});
