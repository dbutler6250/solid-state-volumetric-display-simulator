import type { ParameterSweepSettings } from '../types/simulation';

/** Canonical x-axis labels for every supported parameter sweep. */
export const PARAMETER_SWEEP_AXIS_LABELS = {
  designWavelengthNm: 'Design wavelength (nm)',
  periodCount: 'Periods',
  incidentAngleDegrees: 'Incident angle (deg)',
  acousticFrequencyHz: 'Acoustic frequency (Hz)',
  acousticPeriodCount: 'Acoustic periods',
  acousticIndexModulation: 'Peak index modulation',
} as const satisfies Record<ParameterSweepSettings['parameter'], string>;

export function getParameterSweepAxisLabel(parameter: ParameterSweepSettings['parameter']): string {
  return PARAMETER_SWEEP_AXIS_LABELS[parameter];
}
