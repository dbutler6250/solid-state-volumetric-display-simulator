import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormattedNumberInput } from './FormattedNumberInput';
import {
  formatEditableNumber,
  formattedNumberInputReducer,
  normalizeCommittedNumber,
  parseFiniteNumberDraft,
  parseFiniteIntegerDraft,
  type FormattedNumberInputState,
} from './formattedNumberInputState';

const inactiveFormat = (value: number | undefined): string =>
  typeof value === 'number' ? value.toFixed(1) : '';

describe('FormattedNumberInput state', () => {
  it('separates concise inactive formatting from exact focused formatting', () => {
    expect(inactiveFormat(105.625)).toBe('105.6');
    expect(formatEditableNumber(105.625)).toBe('105.625');
  });

  it.each(['', '-', '.', '-.', '103.', '1e', '1e-', '1E+'])(
    'does not parse the incomplete draft %j',
    (draft) => {
      expect(parseFiniteNumberDraft(draft)).toBeUndefined();
    },
  );

  it('uses a text control so the browser does not sanitize incomplete drafts', () => {
    const markup = renderToStaticMarkup(createElement(FormattedNumberInput, {
      value: 105.625,
      onValueChange: () => undefined,
      formatInactive: inactiveFormat,
      min: 0,
      step: 'any',
    }));

    expect(markup).toContain('type="text"');
    expect(markup).toContain('inputMode="decimal"');
    expect(markup).toContain('step="any"');
  });

  it('parses precise finite values without rounding and rejects invalid values', () => {
    expect(parseFiniteNumberDraft('103.25')).toBe(103.25);
    expect(parseFiniteNumberDraft('105.625')).toBe(105.625);
    expect(parseFiniteNumberDraft('not-a-number')).toBeUndefined();
  });

  it('commits only complete integers and preserves existing blur rounding and bounds', () => {
    expect(parseFiniteIntegerDraft('12')).toBe(12);
    expect(parseFiniteIntegerDraft('12.5')).toBeUndefined();
    expect(parseFiniteIntegerDraft('1e')).toBeUndefined();
    expect(normalizeCommittedNumber(1.4, 2, 2001, Math.round)).toBe(2);
    expect(normalizeCommittedNumber(2001.6, 2, 2001, Math.round)).toBe(2001);
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

  it('replaces an active draft only for an intentional reset', () => {
    const editing: FormattedNumberInputState = { isFocused: true, draft: '105.6250' };

    expect(formattedNumberInputReducer(editing, { type: 'change', draft: '105.6250' }))
      .toEqual(editing);
    expect(formattedNumberInputReducer(editing, { type: 'reset', value: 120.125 }))
      .toEqual({ isFocused: true, draft: '120.125' });
  });

  it('uses the integer keyboard hint when requested', () => {
    const markup = renderToStaticMarkup(createElement(FormattedNumberInput, {
      value: 12,
      onValueChange: () => undefined,
      formatInactive: inactiveFormat,
      parseMode: 'integer',
    }));

    expect(markup).toContain('inputMode="numeric"');
  });
});
