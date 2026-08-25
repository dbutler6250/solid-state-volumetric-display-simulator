import { describe, expect, it } from 'vitest';
import { solveUniformAxialStrain, strainFromForceAndStiffness, strainFromPrescribedDisplacement, superposeEigenstrain } from './axialElasticity';

describe('axial elasticity helpers', () => {
  it('computes epsilon = F / EA for a constant-force bar', () => {
    expect(strainFromForceAndStiffness(300, 2e9, 1e-4)).toBeCloseTo(0.0015);
  });

  it('converts prescribed displacement to uniform strain', () => {
    expect(strainFromPrescribedDisplacement(15e-6, 0.01)).toBeCloseTo(0.0015);
  });

  it('reports stress, force, displacement, and energy for uniform preload', () => {
    const state = solveUniformAxialStrain(0.01, 0.0015, { youngsModulusPa: 2e9, crossSectionAreaM2: 1e-6 });
    expect(state.stressPa).toBeCloseTo(3e6);
    expect(state.forceN).toBeCloseTo(3);
    expect(state.displacementM).toBeCloseTo(15e-6);
    expect(state.elasticEnergyJ).toBeGreaterThan(0);
  });

  it('superposes constrained eigenstrain with the correct sign', () => {
    expect(superposeEigenstrain(0.0015, -0.0015)).toBeCloseTo(0);
    expect(superposeEigenstrain(0.0015, -0.0015, 0.5)).toBeCloseTo(0.00075);
  });
});
