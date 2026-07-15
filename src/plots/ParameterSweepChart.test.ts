import { describe, expect, it } from 'vitest';
import { PARAMETER_SWEEP_AXIS_LABELS } from './parameterSweepAxisLabels';

describe('parameter sweep axis labels', () => {
  it('maps every supported sweep parameter to the correct x-axis label', () => {
    expect(PARAMETER_SWEEP_AXIS_LABELS).toEqual({
      designWavelengthNm: 'Design wavelength (nm)',
      periodCount: 'Periods',
      incidentAngleDegrees: 'Incident angle (deg)',
      acousticFrequencyHz: 'Acoustic frequency (Hz)',
      acousticPeriodCount: 'Acoustic periods',
      acousticIndexModulation: 'Peak index modulation',
    });
  });
});
