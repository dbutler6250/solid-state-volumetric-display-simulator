import { describe, expect, it } from 'vitest';
import { createShearLagCounterStrainField, createSmoothTroughField } from './actuatorStrainTransfer';

describe('actuator strain transfer fields', () => {
  it('creates a smooth target trough that converges to background away from the center', () => {
    const field = createSmoothTroughField({
      lengthM: 0.01,
      centerM: 0.005,
      widthM: 0.0008,
      transitionWidthM: 0.00025,
      backgroundStrain: 0.0015,
      troughStrain: 0,
    });
    expect(field.sampleStrain(0.005)).toBeCloseTo(0);
    expect(field.sampleStrain(0.001)).toBeCloseTo(0.0015);
  });

  it('produces a smooth shear-lag transition toward host strain', () => {
    const field = createShearLagCounterStrainField({
      lengthM: 0.01,
      centerM: 0.005,
      widthM: 0.0008,
      transitionWidthM: 0.00025,
      backgroundStrain: 0.0015,
      troughStrain: 0,
      actuatorFreeStrain: -0.0015,
      transferLengthM: 0.0001,
    });
    expect(field.sampleStrain(0.005)).toBeLessThan(field.sampleStrain(0.0056));
    expect(field.sampleStrain(0.0056)).toBeLessThan(field.sampleStrain(0.0062));
  });
});
