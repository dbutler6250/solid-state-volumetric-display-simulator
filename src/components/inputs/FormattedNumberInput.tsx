import { useEffect, useReducer, useRef, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import {
  formattedNumberInputReducer,
  normalizeCommittedNumber,
  parseFiniteIntegerDraft,
  parseFiniteNumberDraft,
  stepCommittedNumber,
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
  showStepper?: boolean;
  stepperLabel?: string;
  stepperStep?: number;
};

/** Displays a concise inactive value while preserving an exact local editing draft. */
export function FormattedNumberInput({
  value,
  onValueChange,
  formatInactive,
  parseMode = 'decimal',
  normalizeOnBlur,
  resetKey,
  showStepper = false,
  stepperLabel = 'value',
  stepperStep,
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
  const numericMin = typeof min === 'number' ? min : undefined;
  const numericMax = typeof max === 'number' ? max : undefined;
  const resolvedStep = stepperStep ?? (typeof inputProps.step === 'number' ? inputProps.step : Number(inputProps.step));
  const canStep = showStepper && typeof value === 'number' && Number.isFinite(value) && typeof resolvedStep === 'number' && Number.isFinite(resolvedStep) && resolvedStep > 0;

  const commitDraft = () => {
    const parsed = parseFiniteNumberDraft(state.draft);
    if (parsed !== undefined) {
      const bounded = normalizeCommittedNumber(
        parsed,
        numericMin,
        numericMax,
        normalizeOnBlur,
      );
      onValueChange(bounded);
    }
    dispatch({ type: 'blur' });
  };

  const applyStep = (direction: -1 | 1) => {
    if (!canStep || typeof value !== 'number' || typeof resolvedStep !== 'number') return;
    const nextValue = stepCommittedNumber(value, direction, resolvedStep, numericMin, numericMax);
    onValueChange(nextValue);
    dispatch({ type: 'reset', value: nextValue });
  };

  const input = (
    <input
      {...inputProps}
      type="text"
      inputMode={parseMode === 'integer' ? 'numeric' : 'decimal'}
      aria-label={inputProps['aria-label'] ?? (showStepper ? stepperLabel : undefined)}
      min={min}
      max={max}
      value={state.isFocused ? state.draft : formatInactive(value)}
      onFocus={() => dispatch({ type: 'focus', value })}
      onChange={(event) => {
        const draft = event.target.value;
        dispatch({ type: 'change', draft });
        const parsed = parseDraft(draft);
        if (parsed !== undefined) onValueChange(parsed);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (!canStep || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
        event.preventDefault();
        applyStep(event.key === 'ArrowUp' ? 1 : -1);
      }}
      onBlur={commitDraft}
    />
  );

  if (!showStepper) return input;

  return (
    <div className="formatted-number-input">
      {input}
      <button type="button" className="number-stepper" aria-label={`Decrease ${stepperLabel}`} disabled={!canStep || (numericMin !== undefined && value !== undefined && value <= numericMin)} onClick={() => applyStep(-1)}>−</button>
      <button type="button" className="number-stepper" aria-label={`Increase ${stepperLabel}`} disabled={!canStep || (numericMax !== undefined && value !== undefined && value >= numericMax)} onClick={() => applyStep(1)}>+</button>
    </div>
  );
}
