export const MOVING_RESPONSE_CLASSIFICATION_LABELS = [
  'no-enhancement',
  'weak',
  'broad',
  'multi-peak',
  'single-dominant',
  'periodic-multi-plane',
  'stationary-plane-array',
  'moving-envelope',
];

export const MOVING_RESPONSE_CLASSIFICATION_TICK_VALUES = MOVING_RESPONSE_CLASSIFICATION_LABELS.map((_, index) => index);
export const MOVING_RESPONSE_CLASSIFICATION_MAX_VALUE = MOVING_RESPONSE_CLASSIFICATION_LABELS.length - 1;
