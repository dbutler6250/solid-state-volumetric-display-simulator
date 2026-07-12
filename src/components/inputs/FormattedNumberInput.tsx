import { useReducer, type InputHTMLAttributes } from 'react';
import {
  formattedNumberInputReducer,
  parseFiniteNumberDraft,
} from './formattedNumberInputState';

type FormattedNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode' | 'value' | 'onChange' | 'onFocus' | 'onBlur'
> & {
  value: number | undefined;
  onValueChange: (value: number) => void;
  formatInactive: (value: number | undefined) => string;
};

/** Displays a concise inactive value while preserving an exact local editing draft. */
export function FormattedNumberInput({
  value,
  onValueChange,
  formatInactive,
  min,
  max,
  ...inputProps
}: FormattedNumberInputProps) {
  const [state, dispatch] = useReducer(formattedNumberInputReducer, {
    isFocused: false,
    draft: '',
  });

  const commitDraft = () => {
    const parsed = parseFiniteNumberDraft(state.draft);
    if (parsed !== undefined) {
      const lowerBounded = typeof min === 'number' ? Math.max(min, parsed) : parsed;
      const bounded = typeof max === 'number' ? Math.min(max, lowerBounded) : lowerBounded;
      onValueChange(bounded);
    }
    dispatch({ type: 'blur' });
  };

  return (
    <input
      {...inputProps}
      type="text"
      inputMode="decimal"
      min={min}
      max={max}
      value={state.isFocused ? state.draft : formatInactive(value)}
      onFocus={() => dispatch({ type: 'focus', value })}
      onChange={(event) => {
        const draft = event.target.value;
        dispatch({ type: 'change', draft });
        const parsed = parseFiniteNumberDraft(draft);
        if (parsed !== undefined) {
          onValueChange(parsed);
        }
      }}
      onBlur={commitDraft}
    />
  );
}
