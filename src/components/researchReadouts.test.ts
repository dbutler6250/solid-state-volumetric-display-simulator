import { describe, expect, it } from 'vitest';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../simulation/structures/hybridBraggGrating';
import {
  formatMicrostrain,
  formatNm,
  formatSignedNm,
  getFixedGratingReadouts,
  getOperatingPointInterpretation,
} from './researchReadouts';

describe('fixed grating research readouts', () => {
  it('derives detuning, local Bragg values, strain relief, and microstrain formatting', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      fixedLaserWavelengthNm: 600.11,
      strainBias: 0.0015,
      peakStrain: -0.0015,
    };

    const readouts = getFixedGratingReadouts(design);

    expect(formatNm(readouts.staticBraggWavelengthNm)).toBe('600.010');
    expect(formatSignedNm(readouts.laserDetuningNm)).toBe('+0.100');
    expect(readouts.troughStrain).toBeCloseTo(0);
    expect(readouts.strainRelief).toBeCloseTo(0.0015);
    expect(formatMicrostrain(design.strainBias)).toBe('1,500 microstrain');
  });

  it('generates a concise operating-point interpretation', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      fixedLaserWavelengthNm: 600.11,
      strainBias: 0.0015,
      peakStrain: -0.0015,
      strainCenterMm: 5,
    };

    expect(getOperatingPointInterpretation(design)).toContain('strain trough shifts the local Bragg condition');
  });
});
