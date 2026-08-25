import { describe, expect, it } from 'vitest';
import { reconstructHybridBraggMaxwellFieldsFromStrain } from '../solvers/maxwell/longGratingScatteringSolver';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../structures/hybridBraggGrating';
import { createSmoothTroughField } from './actuatorStrainTransfer';
import { evaluateMechanicalArchitectures } from './mechanicalArchitectures';
import type { MechanicalStrainTarget } from './mechanicalTargetMetrics';

const target: MechanicalStrainTarget = {
  lengthM: 0.01,
  centerM: 0.005,
  widthM: 0.0008,
  transitionWidthM: 0.00025,
  backgroundStrain: 0.0015,
  troughStrain: 0,
};

describe('mechanical architecture evaluation', () => {
  it('is deterministic and includes all required baseline architectures', () => {
    const targetField = createSmoothTroughField(target);
    const first = evaluateMechanicalArchitectures({
      target,
      targetField,
      host: { youngsModulusPa: 2e9, crossSectionAreaM2: 1e-6 },
    });
    const second = evaluateMechanicalArchitectures({
      target,
      targetField,
      host: { youngsModulusPa: 2e9, crossSectionAreaM2: 1e-6 },
    });
    expect(first.architectures.map((item) => item.architecture)).toEqual(second.architectures.map((item) => item.architecture));
    expect(first.architectures).toHaveLength(7);
  });

  it('hands an actual mechanical strain sampler to the Maxwell path without parameter refitting', () => {
    const targetField = createSmoothTroughField(target,);
    const result = reconstructHybridBraggMaxwellFieldsFromStrain({
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 0.02,
      segmentCount: 8,
      fixedLaserWavelengthNm: 600.11,
    }, 600.11, { samplesPerPeriod: 1, envelopeBlocks: 1 }, targetField);
    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.energyError).toBeLessThan(1e-6);
  });
});
