import { describe, expect, it } from 'vitest';
import {
  createUniformDiscreteBraggPlaneStack,
  getRequiredPlaneIndexModulation,
  solveDiscreteBraggPlaneStack,
} from './discreteBraggPlaneStack';
import { getUniformOnResonanceReflectance } from '../solvers/coupledMode/spatialBraggSolver';
import { getCouplingCoefficientPerM } from './hybridBraggGrating';

const WAVELENGTH_M = 600.11e-9;
const AVERAGE_INDEX = 1.45;

describe('discrete Bragg plane stack', () => {
  it('matches the isolated on-resonance finite-plane reference', () => {
    const thicknessM = 0.5e-3;
    const deltaN = 2e-4;
    const stack = createUniformDiscreteBraggPlaneStack({
      totalLengthM: 1e-3,
      planeCount: 1,
      planeThicknessM: thicknessM,
      averageIndex: AVERAGE_INDEX,
      nativeBraggWavelengthM: WAVELENGTH_M,
      offIndexModulation: 0,
      onIndexModulation: deltaN,
      selectedPlaneIndex: 0,
      spacing: 'periodic',
    });

    const result = solveDiscreteBraggPlaneStack(stack, WAVELENGTH_M);
    const kappa = getCouplingCoefficientPerM(deltaN, WAVELENGTH_M);

    expect(result.reflectance).toBeCloseTo(getUniformOnResonanceReflectance(kappa, thicknessM), 12);
    expect(result.selectedPlaneFraction).toBeGreaterThan(0.9);
  });

  it('keeps unselected zero-coupling planes quiet in a switchable-kappa stack', () => {
    const stack = createUniformDiscreteBraggPlaneStack({
      totalLengthM: 10e-3,
      planeCount: 10,
      planeThicknessM: 0.25e-3,
      averageIndex: AVERAGE_INDEX,
      nativeBraggWavelengthM: WAVELENGTH_M,
      offIndexModulation: 0,
      onIndexModulation: 4e-4,
      selectedPlaneIndex: 4,
      spacing: 'periodic',
    });

    const result = solveDiscreteBraggPlaneStack(stack, WAVELENGTH_M);

    expect(result.selectedPlaneIndex).toBe(4);
    expect(result.reflectance).toBeGreaterThan(0.1);
    expect(result.secondaryToPrimaryRatio).toBeLessThan(0.05);
  });

  it('computes required plane modulation from the CMT tanh reference', () => {
    const required = getRequiredPlaneIndexModulation(0.25, 0.8e-3, WAVELENGTH_M);

    expect(required).toBeGreaterThan(1e-4);
    expect(required).toBeLessThan(1.5e-4);
  });
});
