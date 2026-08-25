import { describe, expect, it } from 'vitest';
import { createLocalizedEigenstrainField, createSmoothTroughField } from './actuatorStrainTransfer';
import { calculateMechanicalTargetMetrics, type MechanicalStrainTarget } from './mechanicalTargetMetrics';

const target: MechanicalStrainTarget = {
  lengthM: 0.01,
  centerM: 0.005,
  widthM: 0.0008,
  transitionWidthM: 0.00025,
  backgroundStrain: 0.0015,
  troughStrain: 0,
};

describe('mechanical target metrics', () => {
  it('reports small errors for a matching localized eigenstrain field', () => {
    const targetField = createSmoothTroughField(target);
    const predicted = createLocalizedEigenstrainField({ ...target, eigenstrain: -0.0015 });
    const metrics = calculateMechanicalTargetMetrics(target, targetField, predicted);
    expect(Math.abs(metrics.troughMinimumError)).toBeLessThan(1e-8);
    expect(metrics.rmsStrainError).toBeLessThan(1e-8);
  });

  it('keeps center, amplitude, width, and off-target errors visible', () => {
    const targetField = createSmoothTroughField(target);
    const predicted = createLocalizedEigenstrainField({ ...target, centerM: 0.0051, eigenstrain: -0.001 });
    const metrics = calculateMechanicalTargetMetrics(target, targetField, predicted);
    expect(Math.abs(metrics.centerErrorM)).toBeGreaterThan(0);
    expect(metrics.troughMinimumError).toBeGreaterThan(0);
    expect(Number.isFinite(metrics.widthErrorM)).toBe(true);
    expect(metrics.offTargetStrainDisturbance).toBeGreaterThanOrEqual(0);
  });
});
