export type FormattedNumberInputState = {
  isFocused: boolean;
  draft: string;
};

export type FormattedNumberInputAction =
  | { type: 'focus'; value: number | undefined }
  | { type: 'change'; draft: string }
  | { type: 'reset'; value: number | undefined }
  | { type: 'blur' };

/** Returns the exact JavaScript numeric representation used when editing begins. */
export const formatEditableNumber = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toString() : '';

/** Parses complete finite drafts while leaving incomplete editing states untouched. */
export const parseFiniteNumberDraft = (draft: string): number | undefined => {
  if (
    draft === '' ||
    draft === '-' ||
    draft === '.' ||
    draft === '-.' ||
    draft.endsWith('.') ||
    /[eE][+-]?$/.test(draft)
  ) {
    return undefined;
  }

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(draft)) {
    return undefined;
  }

  const parsed = Number(draft);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Parses a complete finite integer without rounding a temporary fractional draft. */
export const parseFiniteIntegerDraft = (draft: string): number | undefined => {
  const parsed = parseFiniteNumberDraft(draft);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
};

/** Applies optional blur normalization and native-style numeric bounds to a committed value. */
export const normalizeCommittedNumber = (
  value: number,
  min?: number,
  max?: number,
  normalize?: (value: number) => number,
): number => {
  const normalized = normalize ? normalize(value) : value;
  const lowerBounded = typeof min === 'number' ? Math.max(min, normalized) : normalized;
  return typeof max === 'number' ? Math.min(max, lowerBounded) : lowerBounded;
};

/** Tracks focus explicitly so external prop updates cannot replace an active draft. */
export function formattedNumberInputReducer(
  state: FormattedNumberInputState,
  action: FormattedNumberInputAction,
): FormattedNumberInputState {
  switch (action.type) {
    case 'focus':
      return { isFocused: true, draft: formatEditableNumber(action.value) };
    case 'change':
      return { ...state, draft: action.draft };
    case 'reset':
      return { ...state, draft: formatEditableNumber(action.value) };
    case 'blur':
      return { ...state, isFocused: false };
  }
}
