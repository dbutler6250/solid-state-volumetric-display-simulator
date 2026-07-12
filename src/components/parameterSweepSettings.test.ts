import { describe, expect, it } from 'vitest';
import {
  FIXED_INCIDENT_ANGLE_SWEEP,
  getInclusivePeriodPointCount,
} from './parameterSweepSettings';

describe('parameter sweep settings', () => {
  it('keeps the user-facing incident-angle sweep fixed', () => {
    expect(FIXED_INCIDENT_ANGLE_SWEEP).toEqual({
      parameter: 'incidentAngleDegrees',
      start: 0,
      end: 89,
      pointCount: 89,
    });
  });

  it('derives one point for every inclusive period', () => {
    expect(getInclusivePeriodPointCount(1, 20)).toBe(20);
    expect(getInclusivePeriodPointCount(5, 10)).toBe(6);
  });

  it('matches the solver normalization for non-integer or reversed bounds', () => {
    expect(getInclusivePeriodPointCount(1.4, 20.4)).toBe(20);
    expect(getInclusivePeriodPointCount(10, 5)).toBe(2);
  });
});
