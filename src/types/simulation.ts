import type { Material } from '../simulation/materials/material';
import type { SpectrumPoint } from '../simulation/results/spectrum';

export type Polarization = 'TE' | 'TM';

export type BraggReflectorInputs = {
  highIndexMaterial: Material;
  lowIndexMaterial: Material;
  highIndexThicknessNm: number;
  lowIndexThicknessNm: number;
  periodCount: number;
  designWavelengthNm: number;
  incidentAngleDegrees: number;
  polarization: Polarization;
};

export type SimulationResult = {
  spectrum: SpectrumPoint[];
  peakReflectance: number;
  centerWavelengthNm: number;
  bandwidthNm: number;
};
