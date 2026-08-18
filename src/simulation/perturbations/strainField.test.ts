import { describe, expect, it } from 'vitest';
import { sampleStrainField, type StrainField } from './strainField';

const baseField: StrainField = {
  peakStrain: 1,
  centerM: 0,
  widthM: 2,
  shape: 'rectangular',
  edgeWidthM: 0.5,
  periodM: 1,
  phaseRadians: 0,
  temporalPhaseRadians: 0,
  velocityMps: 1,
  secondaryPeriodM: 1.25,
  secondaryAmplitudeRatio: 0.5,
  secondaryPhaseRadians: 0,
};

describe('generalized strain fields', () => {
  it('preserves rectangular full-width and Gaussian FWHM conventions', () => {
    expect(sampleStrainField({ ...baseField, shape: 'rectangular' }, 0.99)).toBe(1);
    expect(sampleStrainField({ ...baseField, shape: 'rectangular' }, 1.01)).toBe(0);
    expect(sampleStrainField({ ...baseField, shape: 'gaussian' }, 1)).toBeCloseTo(0.5, 3);
  });

  it('samples smooth top-hat and triangular localized fields', () => {
    expect(sampleStrainField({ ...baseField, shape: 'smooth-top-hat' }, 0.5)).toBeCloseTo(1);
    expect(sampleStrainField({ ...baseField, shape: 'smooth-top-hat' }, 1.25)).toBeGreaterThan(0);
    expect(sampleStrainField({ ...baseField, shape: 'smooth-top-hat' }, 1.51)).toBe(0);
    expect(sampleStrainField({ ...baseField, shape: 'triangular' }, 0)).toBe(1);
    expect(sampleStrainField({ ...baseField, shape: 'triangular' }, 0.5)).toBeCloseTo(0.5);
  });

  it('samples wave, standing-wave, packet, and multi-tone fields', () => {
    expect(sampleStrainField({ ...baseField, shape: 'traveling-sinusoid' }, 0)).toBeCloseTo(1);
    expect(sampleStrainField({ ...baseField, shape: 'traveling-sinusoid' }, 0.5)).toBeCloseTo(-1);
    expect(sampleStrainField({ ...baseField, shape: 'standing-wave', temporalPhaseRadians: Math.PI / 2 }, 0)).toBeCloseTo(0);
    expect(sampleStrainField({ ...baseField, shape: 'carrier-envelope' }, 0)).toBeCloseTo(1);
    expect(Math.abs(sampleStrainField({ ...baseField, shape: 'carrier-envelope' }, 3))).toBeLessThan(0.01);
    expect(sampleStrainField({ ...baseField, shape: 'multi-tone' }, 0)).toBeCloseTo(1.5);
  });

  it('samples prescribed piezo-like windows and biased troughs', () => {
    expect(sampleStrainField({ ...baseField, shape: 'piezo-window', biasStrain: 0.2 }, 0)).toBeCloseTo(1.2);
    expect(sampleStrainField({ ...baseField, shape: 'piezo-window', peakStrain: -1, biasStrain: 0.2 }, 0)).toBeCloseTo(-0.8);
    expect(sampleStrainField({ ...baseField, shape: 'piezo-trough', peakStrain: 0.6, biasStrain: 1 }, 0)).toBeCloseTo(0.4);
    expect(sampleStrainField({ ...baseField, shape: 'piezo-trough', peakStrain: 0.6, biasStrain: 1 }, 3)).toBeCloseTo(1);
  });

  it('sums overlapping prescribed piezo array windows deterministically', () => {
    const arrayField: StrainField = {
      ...baseField,
      shape: 'piezo-array',
      centerM: 0,
      widthM: 1,
      edgeWidthM: 0.5,
      actuatorCount: 3,
      actuatorPitchM: 1,
      activeActuatorIndex: 1,
      actuatorCommandAmplitude: 1,
      actuatorAdjacentCommandAmplitude: 0.5,
    };

    expect(sampleStrainField(arrayField, 0)).toBeCloseTo(1);
    expect(sampleStrainField(arrayField, -1)).toBeCloseTo(0.5);
    expect(sampleStrainField(arrayField, 0.75)).toBeGreaterThan(0.5);
  });
});
