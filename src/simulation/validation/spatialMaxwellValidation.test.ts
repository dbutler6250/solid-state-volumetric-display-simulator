import { describe, expect, it } from 'vitest';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../structures/hybridBraggGrating';
import {
  createSpatialMaxwellValidationIdentity,
  validateSpatialAddressingWithMaxwell,
} from './spatialMaxwellValidation';

describe('spatial Maxwell validation', () => {
  it('changes identity when spatial solver inputs change', () => {
    const baseline = createSpatialMaxwellValidationIdentity(DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS);
    const shifted = createSpatialMaxwellValidationIdentity({
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      strainCenterMm: DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.strainCenterMm + 0.1,
    });

    expect(shifted).not.toBe(baseline);
  });

  it('returns finite Maxwell validation fields for the current spatial state', () => {
    const validation = validateSpatialAddressingWithMaxwell({
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      fixedLaserWavelengthNm: 600.11,
      strainBias: 0.0015,
      peakStrain: -0.0015,
      strainShape: 'piezo-trough',
      strainWidthMm: 0.8,
      segmentCount: 80,
    }, 0.5);

    expect(validation.identity).toBeTypeOf('string');
    expect(validation.result.samples.length).toBeGreaterThan(0);
    expect(Number.isFinite(validation.result.reflectance)).toBe(true);
    expect(validation.result.samples.every((sample) => Number.isFinite(sample.normalizedBackwardIntensity))).toBe(true);
  });
});
