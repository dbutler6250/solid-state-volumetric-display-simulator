import { describe, expect, it } from 'vitest';
import {
  formatEditableNumber,
  formattedNumberInputReducer,
  parseFiniteNumberDraft,
  type FormattedNumberInputState,
} from './formattedNumberInputState';

const inactiveFormat = (value: number | undefined): string =>
  typeof value === 'number' ? value.toFixed(1) : '';

describe('FormattedNumberInput state', () => {
  it('separates concise inactive formatting from exact focused formatting', () => {
    expect(inactiveFormat(105.625)).toBe('105.6');
    expect(formatEditableNumber(105.625)).toBe('105.625');
  });

  it.each(['', '-', '.', '-.'])('does not parse the incomplete draft %j', (draft) => {
    expect(parseFiniteNumberDraft(draft)).toBeUndefined();
  });

  it('parses precise finite values without rounding and rejects invalid values', () => {
    expect(parseFiniteNumberDraft('103.25')).toBe(103.25);
    expect(parseFiniteNumberDraft('105.625')).toBe(105.625);
    expect(parseFiniteNumberDraft('not-a-number')).toBeUndefined();
  });

  it('preserves an active draft independently of external values until blur', () => {
    const initial: FormattedNumberInputState = { isFocused: false, draft: '' };
    const focused = formattedNumberInputReducer(initial, { type: 'focus', value: 103.25 });
    const editing = formattedNumberInputReducer(focused, { type: 'change', draft: '105.6250' });

    expect(editing).toEqual({ isFocused: true, draft: '105.6250' });
    expect(formattedNumberInputReducer(editing, { type: 'blur' })).toEqual({
      isFocused: false,
      draft: '105.6250',
    });
  });
});
