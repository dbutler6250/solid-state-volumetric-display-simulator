/** Maximum acoustic slices allowed in automatic resolution and solving. */
export const MAX_AUTOMATIC_ACOUSTIC_LAYERS = 4096;

/** Shared default wavelength sweep sample count for validation and canonical documents. */
export const DEFAULT_WAVELENGTH_POINT_COUNT = 500;

/** Maximum supported direct optical period count before synchronous work becomes unsafe. */
export const MAX_OPTICAL_PERIODS = 1_000_000;

/** Maximum supported wavelength samples in one direct optical solve. */
export const MAX_WAVELENGTH_POINTS = 3_000;

/** Maximum number of spectra evaluated by one synchronous parameter sweep. */
export const MAX_PARAMETER_SWEEP_POINTS = 200;

/** Caps aggregate layer-by-wavelength evaluations for one parameter sweep. */
export const MAX_PARAMETER_SWEEP_WORK = 25_000_000;
