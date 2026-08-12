import { describe, expect, it } from 'vitest';
import {
  MOVING_RESPONSE_CLASSIFICATION_LABELS,
  MOVING_RESPONSE_CLASSIFICATION_MAX_VALUE,
  MOVING_RESPONSE_CLASSIFICATION_TICK_VALUES,
} from './movingResponseClassificationScale';

describe('MovingResponseRegimeMapChart classification scale', () => {
  it('covers every moving-response classification label', () => {
    expect(MOVING_RESPONSE_CLASSIFICATION_LABELS).toEqual([
      'no-enhancement',
      'weak',
      'broad',
      'multi-peak',
      'single-dominant',
      'periodic-multi-plane',
      'stationary-plane-array',
      'moving-envelope',
    ]);
    expect(MOVING_RESPONSE_CLASSIFICATION_TICK_VALUES).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(MOVING_RESPONSE_CLASSIFICATION_MAX_VALUE).toBe(7);
  });
});
