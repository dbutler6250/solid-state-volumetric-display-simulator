import type { Material } from '../simulation/materials/material';
import type { SpectrumPoint } from '../simulation/results/spectrum';

/** Supported incident polarizations for the current transfer-matrix model. */
export type Polarization = 'TE' | 'TM';

/** Selects how layer thicknesses are sourced for the current stack. */
export type ThicknessMode = 'derived' | 'manual' | 'acoustic';

/** Selects how the acoustic waveform is approximated when generating layers. */
export type AcousticRepresentationMode = 'binary' | 'fast' | 'accurate' | 'reference';

/** Describes the acoustic material and drive parameters used for acoustic stack generation. */
export type AcousticDesignInputs = {
  acousticMaterial: Material;
  acousticVelocityMps: number;
  acousticFrequencyHz: number;
  acousticPeriodCount: number;
  braggOrder: number;
  acousticIndexModulation: number;
  acousticRepresentationMode: AcousticRepresentationMode;
};

/** Input bundle shared by the form, importer, solver, and exports. */
export type QuarterWaveStackInputs = {
  highIndexMaterial: Material;
  lowIndexMaterial: Material;
  periodCount: number;
  designWavelengthNm: number;
  incidentAngleDegrees: number;
  polarization: Polarization;
  thicknessMode?: ThicknessMode;
  highIndexThicknessNm?: number;
  lowIndexThicknessNm?: number;
  acousticDesign?: AcousticDesignInputs;
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
  bandTouchesBoundary: boolean;
};

export type SweepParameter = 'designWavelengthNm' | 'incidentAngleDegrees' | 'periodCount';

export type ParameterSweepSettings = {
  parameter: SweepParameter;
  start: number;
  end: number;
  pointCount: number;
};

export type ParameterSweepPoint = {
  parameterValue: number;
  peakReflectance: number | null;
  centerWavelengthNm: number | null;
  bandwidthNm: number | null;
};

export type ParameterSweepResult = {
  settings: ParameterSweepSettings;
  points: ParameterSweepPoint[];
};
