import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../../simulation/structures/quarterWaveStack';
import {
  applyCenteredSweepRange,
  applyCustomMaterialComponent,
  applyDesignWavelength,
  applySweepRange,
} from './quarterWaveStackFormState';

describe('QuarterWaveStackForm numeric updates', () => {
  it('keeps sweep presets centered and normalized', () => {
    const inputs = { ...DEFAULT_QUARTER_WAVE_STACK_INPUTS, wavelengthStartNm: 400, wavelengthEndNm: 800 };
    const updated = applySweepRange(inputs, 101.4);

    expect(updated.wavelengthStartNm).toBe(550);
    expect(updated.wavelengthEndNm).toBe(651);
  });

  it('centers the wavelength sweep without changing its normalized range', () => {
    const inputs = { ...DEFAULT_QUARTER_WAVE_STACK_INPUTS, wavelengthStartNm: 450, wavelengthEndNm: 750 };

    expect(applyCenteredSweepRange(inputs, 700, 300)).toMatchObject({
      wavelengthStartNm: 550,
      wavelengthEndNm: 850,
    });
    expect(applyDesignWavelength(inputs, 700)).toMatchObject({
      designWavelengthNm: 700,
      wavelengthStartNm: 550,
      wavelengthEndNm: 850,
    });
  });

  it('preserves custom material identity and the untouched complex-index component', () => {
    const inputs = {
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      highIndexMaterial: {
        id: 'custom',
        name: 'Custom',
        refractiveIndex: { real: 2.125, imag: 0.015 },
      },
    };

    expect(applyCustomMaterialComponent(inputs, 'highIndexMaterial', 'real', 2.375))
      .toMatchObject({
        highIndexMaterial: {
          id: 'custom',
          name: 'Custom',
          refractiveIndex: { real: 2.375, imag: 0.015 },
        },
      });
  });
});
