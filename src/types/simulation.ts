import type { Material } from '../simulation/materials/material';
import type { SpectrumPoint } from '../simulation/results/spectrum';

export type Polarization = 'TE' | 'TM';

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

export type SimulationResult = {
  spectrum: SpectrumPoint[];
  peakReflectance: number;
  centerWavelengthNm: number;
  bandwidthNm: number;
  maxEnergyConservationError: number;
};
