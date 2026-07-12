export type FormattedNumberInputState = {
  isFocused: boolean;
  draft: string;
};

export type FormattedNumberInputAction =
  | { type: 'focus'; value: number | undefined }
  | { type: 'change'; draft: string }
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

  const parsed = Number(draft);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    case 'blur':
      return { ...state, isFocused: false };
  }
}
