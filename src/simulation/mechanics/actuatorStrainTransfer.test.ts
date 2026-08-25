import { describe, expect, it } from 'vitest';
import {
  createCoupledDifferentialArrayField,
  createMechanicallyIsolatedField,
  createShearLagCounterStrainField,
  createSmoothTroughField,
  createStiffnessEngineeredField,
} from './actuatorStrainTransfer';

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

  it('uses stiffness ratio to reduce strain under constant force', () => {
    const lowRatio = createStiffnessEngineeredField({
      lengthM: 0.01,
      centerM: 0.005,
      widthM: 0.0008,
      transitionWidthM: 0.00025,
      backgroundStrain: 0.0015,
      troughStrain: 0,
      stiffnessRatio: 2,
    });
    const highRatio = createStiffnessEngineeredField({
      lengthM: 0.01,
      centerM: 0.005,
      widthM: 0.0008,
      transitionWidthM: 0.00025,
      backgroundStrain: 0.0015,
      troughStrain: 0,
      stiffnessRatio: 10,
    });
    expect(highRatio.sampleStrain(0.005)).toBeLessThan(lowRatio.sampleStrain(0.005));
  });

  it('models isolated-zone leakage and coupled-array neighbor strain', () => {
    const isolated = createMechanicallyIsolatedField({
      lengthM: 0.01,
      centerM: 0.005,
      widthM: 0.0008,
      transitionWidthM: 0.00025,
      backgroundStrain: 0.0015,
      troughStrain: 0,
      interfaceCoupling: 0.2,
      edgeLeakageWidthM: 0.00025,
    });
    const array = createCoupledDifferentialArrayField({
      lengthM: 0.01,
      centerM: 0.005,
      widthM: 0.0008,
      transitionWidthM: 0.00025,
      backgroundStrain: 0.0015,
      troughStrain: 0,
      zoneCount: 4,
      pitchM: 0.0008,
      neighborCoupling: 0.2,
      activeZoneIndex: 1,
      actuatorFreeStrain: -0.0015,
    });
    expect(isolated.sampleStrain(0.005)).toBeCloseTo(0);
    expect(array.sampleStrain(0.0046)).toBeLessThan(array.sampleStrain(0.0058));
  });
});
