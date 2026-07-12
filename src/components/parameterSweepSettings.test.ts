import { describe, expect, it } from 'vitest';
import { getInclusivePeriodPointCount } from './parameterSweepSettings';

describe('parameter sweep settings', () => {
  it('derives one point for every inclusive period', () => {
    expect(getInclusivePeriodPointCount(1, 20)).toBe(20);
    expect(getInclusivePeriodPointCount(5, 10)).toBe(6);
  });

  it('matches the solver normalization for non-integer or reversed bounds', () => {
    expect(getInclusivePeriodPointCount(1.4, 20.4)).toBe(20);
    expect(getInclusivePeriodPointCount(10, 5)).toBe(2);
  });
});
