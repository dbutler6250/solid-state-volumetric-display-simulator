/** Stores the spectral response at one wavelength sample. */
export type SpectrumPoint = {
  wavelengthNm: number;
  reflectance: number;
  transmission: number;
};
