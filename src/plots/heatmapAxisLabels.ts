import type { SweepParameter } from '../types/simulation';

/** Canonical axis labels for the general reflectance heatmap. */
export const HEATMAP_AXIS_LABELS = {
  designWavelengthNm: 'Design wavelength (nm)',
  periodCount: 'Periods',
  incidentAngleDegrees: 'Incident angle (deg)',
  acousticFrequencyHz: 'Acoustic frequency (Hz)',
  acousticPeriodCount: 'Acoustic periods',
  acousticIndexModulation: 'Peak index modulation',
} as const satisfies Record<SweepParameter, string>;

export function getHeatmapAxisLabel(parameter: SweepParameter): string {
  return HEATMAP_AXIS_LABELS[parameter];
}
