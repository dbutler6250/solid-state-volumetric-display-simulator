import { describe, expect, it } from 'vitest';
import { HEATMAP_AXIS_LABELS } from './heatmapAxisLabels';

describe('heatmap axis labels', () => {
  it('maps every supported sweep parameter to a clear axis label', () => {
    expect(HEATMAP_AXIS_LABELS).toEqual({
      designWavelengthNm: 'Design wavelength (nm)',
      periodCount: 'Periods',
      incidentAngleDegrees: 'Incident angle (deg)',
      acousticFrequencyHz: 'Acoustic frequency (Hz)',
      acousticPeriodCount: 'Acoustic periods',
      acousticIndexModulation: 'Peak index modulation',
      hybridPeakStrain: 'Hybrid peak strain',
      hybridStrainCenterMm: 'Hybrid strain center (mm)',
      hybridStrainWidthMm: 'Hybrid strain width (mm)',
      hybridIndexModulation: 'Hybrid index modulation',
    });
  });
});
