import { useEffect, useReducer, useRef, type InputHTMLAttributes } from 'react';
import {
  formattedNumberInputReducer,
  normalizeCommittedNumber,
  parseFiniteIntegerDraft,
  parseFiniteNumberDraft,
} from './formattedNumberInputState';

type FormattedNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'value' | 'onChange' | 'onFocus' | 'onBlur'
> & {
  value: number | undefined;
  onValueChange: (value: number) => void;
  formatInactive: (value: number | undefined) => string;
  parseMode?: 'decimal' | 'integer';
  normalizeOnBlur?: (value: number) => number;
  resetKey?: string | number;
};

/** Displays a concise inactive value while preserving an exact local editing draft. */
export function FormattedNumberInput({
  value,
  onValueChange,
  formatInactive,
  parseMode = 'decimal',
  normalizeOnBlur,
  resetKey,
  min,
  max,
  ...inputProps
}: FormattedNumberInputProps) {
  const [state, dispatch] = useReducer(formattedNumberInputReducer, {
    isFocused: false,
    draft: '',
  });
  const previousResetKey = useRef(resetKey);

  useEffect(() => {
    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey;
      dispatch({ type: 'reset', value });
    }
  }, [resetKey, value]);

  const parseDraft = parseMode === 'integer' ? parseFiniteIntegerDraft : parseFiniteNumberDraft;

  const commitDraft = () => {
    const parsed = parseFiniteNumberDraft(state.draft);
    if (parsed !== undefined) {
      const bounded = normalizeCommittedNumber(
        parsed,
        typeof min === 'number' ? min : undefined,
        typeof max === 'number' ? max : undefined,
        normalizeOnBlur,
      );
      onValueChange(bounded);
    }
    dispatch({ type: 'blur' });
  };

  return (
    <input
      {...inputProps}
      type="text"
      inputMode={parseMode === 'integer' ? 'numeric' : 'decimal'}
      min={min}
      max={max}
      value={state.isFocused ? state.draft : formatInactive(value)}
      onFocus={() => dispatch({ type: 'focus', value })}
      onChange={(event) => {
        const draft = event.target.value;
        dispatch({ type: 'change', draft });
        const parsed = parseDraft(draft);
        if (parsed !== undefined) {
          onValueChange(parsed);
        }
      }}
      onBlur={commitDraft}
    />
  );
}
