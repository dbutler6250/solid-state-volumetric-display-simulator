import type { QuarterWaveStackInputs } from '../../types/simulation';

const CUSTOM_MATERIAL_ID = 'custom';
const CUSTOM_MATERIAL_NAME = 'Custom';
const SWEEP_RANGE_MIN_NM = 10;
const SWEEP_RANGE_MAX_NM = 1200;
const SWEEP_ENDPOINT_MIN_NM = 1;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
const normalizeSweepRange = (rangeNm: number): number =>
  Math.round(clampNumber(rangeNm, SWEEP_RANGE_MIN_NM, SWEEP_RANGE_MAX_NM));
const getSweepRange = (inputs: QuarterWaveStackInputs): number =>
  Math.max(0, (inputs.wavelengthEndNm ?? 0) - (inputs.wavelengthStartNm ?? 0));

/** Re-centers the sweep range while preserving the current midpoint. */
export const applySweepRange = (
  inputs: QuarterWaveStackInputs,
  rangeNm: number,
): QuarterWaveStackInputs => {
  const centerNm = ((inputs.wavelengthStartNm ?? 0) + (inputs.wavelengthEndNm ?? 0)) / 2;
  return applyCenteredSweepRange(inputs, centerNm, rangeNm);
};

/** Re-centers the sweep range around a chosen wavelength. */
export const applyCenteredSweepRange = (
  inputs: QuarterWaveStackInputs,
  centerNm: number,
  rangeNm: number,
): QuarterWaveStackInputs => {
  if (!Number.isFinite(centerNm) || centerNm <= 0 || !Number.isFinite(rangeNm)) {
    throw new Error('The reference wavelength and analysis range must be finite positive values.');
  }
  const halfRangeNm = normalizeSweepRange(rangeNm) / 2;
  const nextStartNm = Math.max(SWEEP_ENDPOINT_MIN_NM, Math.round(centerNm - halfRangeNm));
  const nextEndNm = Math.round(centerNm + halfRangeNm);
  if (!Number.isFinite(nextStartNm) || !Number.isFinite(nextEndNm) || nextEndNm <= nextStartNm) {
    throw new Error(
      'The reference wavelength is too large to represent a safe 10–1,200 nm analysis interval.',
    );
  }
  return { ...inputs, wavelengthStartNm: nextStartNm, wavelengthEndNm: nextEndNm };
};

/** Updates the design wavelength and keeps the analysis sweep centered on it. */
export const applyDesignWavelength = (
  inputs: QuarterWaveStackInputs,
  designWavelengthNm: number,
): QuarterWaveStackInputs =>
  applyCenteredSweepRange(
    { ...inputs, designWavelengthNm },
    designWavelengthNm,
    getSweepRange(inputs),
  );

/** Updates one non-negative complex-index component without changing custom material identity. */
export function applyCustomMaterialComponent(
  inputs: QuarterWaveStackInputs,
  field: 'highIndexMaterial' | 'lowIndexMaterial',
  component: 'real' | 'imag',
  value: number,
): QuarterWaveStackInputs {
  const material = inputs[field];
  const refractiveIndex = typeof material.refractiveIndex === 'number'
    ? { real: material.refractiveIndex, imag: 0 }
    : material.refractiveIndex;
  return {
    ...inputs,
    [field]: {
      ...material,
      id: CUSTOM_MATERIAL_ID,
      name: CUSTOM_MATERIAL_NAME,
      refractiveIndex: { ...refractiveIndex, [component]: Math.max(0, value) },
    },
  };
}
