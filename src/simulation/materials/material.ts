import type { Complex } from '../math/complex';

/** Complex refractive-index components stored as n + ik. */
export type ComplexRefractiveIndex = {
  real: number;
  imag: number;
};

/** Basic material model used by the optical stack solver. */
export type Material = {
  id: string;
  name: string;
  refractiveIndex: number | ComplexRefractiveIndex;
};

/** Narrows a refractive-index value to the complex form used by absorbing materials. */
export const isComplexRefractiveIndex = (value: Material['refractiveIndex']): value is ComplexRefractiveIndex =>
  typeof value === 'object' && value !== null;

/** Returns the real part of a refractive index value. */
export const getRefractiveIndexReal = (value: Material['refractiveIndex']): number =>
  isComplexRefractiveIndex(value) ? value.real : value;

/** Returns the imaginary part of a refractive index value. */
export const getRefractiveIndexImag = (value: Material['refractiveIndex']): number =>
  isComplexRefractiveIndex(value) ? value.imag : 0;

/**
 * Converts the UI/material extinction coefficient into the solver convention.
 * Positive k is entered by users as an attenuation coefficient, so the solver
 * receives it as a negative imaginary component.
 */
export const toComplexRefractiveIndex = (value: Material['refractiveIndex']): Complex => ({
  re: getRefractiveIndexReal(value),
  im: -getRefractiveIndexImag(value),
});

/** Formats a refractive index for UI labels and exports. */
export const formatRefractiveIndex = (value: Material['refractiveIndex']): string => {
  const real = getRefractiveIndexReal(value);
  const imag = getRefractiveIndexImag(value);

  if (!Number.isFinite(real) || !Number.isFinite(imag)) {
    return 'Invalid';
  }

  if (imag === 0) {
    return `n=${real.toFixed(3)}`;
  }

  const sign = imag >= 0 ? '+' : '-';
  return `n=${real.toFixed(3)} ${sign} i${Math.abs(imag).toFixed(3)}`;
};
