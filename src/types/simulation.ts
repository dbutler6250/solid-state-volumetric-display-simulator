import type { Material } from '../simulation/materials/material';
import type { SpectrumPoint } from '../simulation/results/spectrum';

/** Supported incident polarizations for the current transfer-matrix model. */
export type Polarization = 'TE' | 'TM';

/** Input bundle shared by the form, importer, solver, and exports. */
export type QuarterWaveStackInputs = {
  highIndexMaterial: Material;
  lowIndexMaterial: Material;
  periodCount: number;
  designWavelengthNm: number;
  incidentAngleDegrees: number;
  polarization: Polarization;
  wavelengthStartNm?: number;
  wavelengthEndNm?: number;
  wavelengthPointCount?: number;
};

/** Summary result returned by the spectrum solver. */
export type SimulationResult = {
  spectrum: SpectrumPoint[];
  peakReflectance: number;
  centerWavelengthNm: number;
  bandwidthNm: number;
  maxEnergyConservationError: number;
};
