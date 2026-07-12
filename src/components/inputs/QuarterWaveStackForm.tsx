import type { ChangeEvent } from 'react';
import { MATERIAL_CATALOG } from '../../simulation/materials/catalog';
import type { ValidationIssue } from '../../simulation/validation/quarterWaveStackValidation';
import type { Polarization, QuarterWaveStackInputs } from '../../types/simulation';

type QuarterWaveStackFormProps = {
  inputs: QuarterWaveStackInputs;
  validationIssues: ValidationIssue[];
  onChange: (inputs: QuarterWaveStackInputs) => void;
};

const toNumber = (value: string): number => Number(value);
const CUSTOM_MATERIAL_ID = 'custom';
const CUSTOM_MATERIAL_NAME = 'Custom';
const SWEEP_RANGE_PRESETS_NM = [10, 50, 100, 200, 300, 600];
const SWEEP_RANGE_MIN_NM = 10;
const SWEEP_RANGE_MAX_NM = 1200;
const SWEEP_RANGE_STEP_NM = 10;
const SWEEP_ENDPOINT_MIN_NM = 1;
const SWEEP_ENDPOINT_MAX_NM = 2000;
const SWEEP_ENDPOINT_STEP_NM = 0.1;

type NumericField = keyof Pick<
  QuarterWaveStackInputs,
  | 'periodCount'
  | 'designWavelengthNm'
  | 'incidentAngleDegrees'
  | 'wavelengthStartNm'
  | 'wavelengthEndNm'
  | 'wavelengthPointCount'
>;

const getIssueForField = (
  issues: ValidationIssue[],
  field: keyof QuarterWaveStackInputs,
): string | undefined => issues.find((issue) => issue.field === field)?.message;

/** Keeps numeric edits within the supported input range. */
const clampNumber = (value: number, min: number, max?: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max ?? value, Math.max(min, value));
};

const isCustomMaterial = (materialId: string): boolean => materialId === CUSTOM_MATERIAL_ID;
const getSweepCenter = (inputs: QuarterWaveStackInputs): number =>
  ((inputs.wavelengthStartNm ?? 0) + (inputs.wavelengthEndNm ?? 0)) / 2;

const getSweepRange = (inputs: QuarterWaveStackInputs): number =>
  Math.max(0, (inputs.wavelengthEndNm ?? 0) - (inputs.wavelengthStartNm ?? 0));

const normalizeSweepRange = (rangeNm: number): number =>
  clampNumber(rangeNm, SWEEP_RANGE_MIN_NM, SWEEP_RANGE_MAX_NM);

const formatWavelengthInput = (value: number | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(4);
};

const formatSweepRangeInput = (value: number): string => value.toFixed(4);

/** Re-centers the sweep range while preserving the current midpoint. */
const applySweepRange = (inputs: QuarterWaveStackInputs, rangeNm: number): QuarterWaveStackInputs => {
  const centerNm = getSweepCenter(inputs);
  const halfRangeNm = Math.max(0, rangeNm) / 2;
  const nextStartNm = Math.max(1, centerNm - halfRangeNm);
  const nextEndNm = Math.max(nextStartNm + 1, centerNm + halfRangeNm);

  return {
    ...inputs,
    wavelengthStartNm: nextStartNm,
    wavelengthEndNm: nextEndNm,
  };
};

/** Re-centers the sweep range around a chosen wavelength. */
const applyCenteredSweepRange = (
  inputs: QuarterWaveStackInputs,
  centerNm: number,
  rangeNm: number,
): QuarterWaveStackInputs => {
  const halfRangeNm = Math.max(0, rangeNm) / 2;
  const nextStartNm = Math.max(1, centerNm - halfRangeNm);
  const nextEndNm = Math.max(nextStartNm + 1, centerNm + halfRangeNm);

  return {
    ...inputs,
    wavelengthStartNm: nextStartNm,
    wavelengthEndNm: nextEndNm,
  };
};

/** Updates the design wavelength and keeps the analysis sweep centered on it. */
const applyDesignWavelength = (
  inputs: QuarterWaveStackInputs,
  designWavelengthNm: number,
): QuarterWaveStackInputs =>
  applyCenteredSweepRange(
    {
      ...inputs,
      designWavelengthNm,
    },
    designWavelengthNm,
    getSweepRange(inputs),
  );

export function QuarterWaveStackForm({
  inputs,
  validationIssues,
  onChange,
}: QuarterWaveStackFormProps) {
  const updateNumberField =
    (field: NumericField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = toNumber(event.target.value);

      if (field === 'designWavelengthNm') {
        onChange(applyDesignWavelength(inputs, value));
        return;
      }

      onChange({
        ...inputs,
        [field]: value,
      });
    };

  const normalizeNumberField =
    (field: NumericField, min: number, max?: number, integer = false) =>
    () => {
      const value = inputs[field] ?? min;
      const clampedValue = clampNumber(value, min, max);
      const nextValue = integer ? Math.round(clampedValue) : clampedValue;

      if (field === 'designWavelengthNm') {
        onChange(applyDesignWavelength(inputs, nextValue));
        return;
      }

      onChange({
        ...inputs,
        [field]: nextValue,
      });
    };

  const updateMaterial =
    (field: 'highIndexMaterial' | 'lowIndexMaterial') =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      const selectedMaterialId = event.target.value;
      const material = MATERIAL_CATALOG.find((item) => item.id === selectedMaterialId);

      if (!material && !isCustomMaterial(selectedMaterialId)) {
        return;
      }

      onChange({
        ...inputs,
        [field]:
          material ??
          ({
            id: CUSTOM_MATERIAL_ID,
            name: CUSTOM_MATERIAL_NAME,
            refractiveIndex: inputs[field].refractiveIndex,
          } as QuarterWaveStackInputs[typeof field]),
      });
    };

  const updateCustomRefractiveIndex =
    (field: 'highIndexMaterial' | 'lowIndexMaterial') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...inputs,
        [field]: {
          ...inputs[field],
          id: CUSTOM_MATERIAL_ID,
          name: CUSTOM_MATERIAL_NAME,
          refractiveIndex: toNumber(event.target.value),
        },
      });
    };
  const updateSweepRange = (rangeNm: number) => {
    onChange(applySweepRange(inputs, normalizeSweepRange(rangeNm)));
  };
  const centerSweepOnDesignLambda = () => {
    if (!Number.isFinite(inputs.designWavelengthNm)) {
      return;
    }

    onChange(applyCenteredSweepRange(inputs, inputs.designWavelengthNm, getSweepRange(inputs)));
  };
  const isInvalid = (field: keyof QuarterWaveStackInputs): boolean =>
    getIssueForField(validationIssues, field) !== undefined;

  const renderMaterialField = (field: 'highIndexMaterial' | 'lowIndexMaterial', label: string) => {
    const material = inputs[field];
    const isCustom = isCustomMaterial(material.id);

    return (
      <div className="field">
        <span>{label}</span>
        <select
          value={isCustom ? CUSTOM_MATERIAL_ID : material.id}
          onChange={updateMaterial(field)}
        >
          {MATERIAL_CATALOG.map((catalogMaterial) => (
            <option key={catalogMaterial.id} value={catalogMaterial.id}>
              {catalogMaterial.name} (n={catalogMaterial.refractiveIndex})
            </option>
          ))}
          <option value={CUSTOM_MATERIAL_ID}>Custom refractive index</option>
        </select>
        {isCustom ? (
          <div className="field">
            <span>{label} n</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={material.refractiveIndex}
              onChange={updateCustomRefractiveIndex(field)}
              aria-label={`${label} refractive index`}
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <form className="form-grid">
      {renderMaterialField('highIndexMaterial', 'High-index material')}
      {renderMaterialField('lowIndexMaterial', 'Low-index material')}

      <div className="field">
        <span>Layer thicknesses</span>
        <small>
          Quarter-wave stack values are derived automatically from the design wavelength and each
          layer&apos;s refractive index.
        </small>
      </div>

      <label className="field">
        <span>Periods</span>
        <input
          type="number"
          min="1"
          step="1"
          value={inputs.periodCount}
          onChange={updateNumberField('periodCount')}
          onBlur={normalizeNumberField('periodCount', 1, undefined, true)}
          aria-invalid={isInvalid('periodCount')}
        />
        <FieldError message={getIssueForField(validationIssues, 'periodCount')} />
      </label>

      <label className="field">
        <span>Design wavelength (nm)</span>
        <input
          type="number"
          min="1"
          value={inputs.designWavelengthNm}
          onChange={updateNumberField('designWavelengthNm')}
          onBlur={normalizeNumberField('designWavelengthNm', 1)}
          aria-invalid={isInvalid('designWavelengthNm')}
        />
        <FieldError message={getIssueForField(validationIssues, 'designWavelengthNm')} />
      </label>

      <label className="field">
        <span>Incident angle (degrees)</span>
        <input
          type="number"
          min="0"
          max="89"
          value={inputs.incidentAngleDegrees}
          onChange={updateNumberField('incidentAngleDegrees')}
          onBlur={normalizeNumberField('incidentAngleDegrees', 0, 89.9)}
          aria-invalid={isInvalid('incidentAngleDegrees')}
        />
        <FieldError message={getIssueForField(validationIssues, 'incidentAngleDegrees')} />
      </label>

      <label className="field">
        <span>Polarization</span>
        <select
          value={inputs.polarization}
          onChange={(event) =>
            onChange({ ...inputs, polarization: event.target.value as Polarization })
          }
        >
          <option value="TE">TE</option>
          <option value="TM">TM</option>
        </select>
      </label>

      <div className="form-section-title sweep-section-title">
        <span>Wavelength Sweep</span>
        <button
          type="button"
          className="sweep-center-button"
          onClick={centerSweepOnDesignLambda}
          disabled={!Number.isFinite(inputs.designWavelengthNm)}
        >
          Center on Design λ
        </button>
      </div>

      <label className="field">
        <span>Start wavelength (nm)</span>
        <input
          type="number"
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          value={formatWavelengthInput(inputs.wavelengthStartNm)}
          onChange={updateNumberField('wavelengthStartNm')}
          onBlur={normalizeNumberField(
            'wavelengthStartNm',
            SWEEP_ENDPOINT_MIN_NM,
            SWEEP_ENDPOINT_MAX_NM,
          )}
          aria-invalid={isInvalid('wavelengthStartNm')}
        />
        <input
          className="sweep-range-slider"
          type="range"
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          value={inputs.wavelengthStartNm}
          onChange={updateNumberField('wavelengthStartNm')}
          aria-label="Start wavelength slider"
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthStartNm')} />
      </label>

      <label className="field">
        <span>End wavelength (nm)</span>
        <input
          type="number"
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          value={formatWavelengthInput(inputs.wavelengthEndNm)}
          onChange={updateNumberField('wavelengthEndNm')}
          onBlur={normalizeNumberField('wavelengthEndNm', SWEEP_ENDPOINT_MIN_NM, SWEEP_ENDPOINT_MAX_NM)}
          aria-invalid={isInvalid('wavelengthEndNm')}
        />
        <input
          className="sweep-range-slider"
          type="range"
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          value={inputs.wavelengthEndNm}
          onChange={updateNumberField('wavelengthEndNm')}
          aria-label="End wavelength slider"
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthEndNm')} />
      </label>

      <div className="field">
        <span>Sweep range</span>
        <div className="sweep-range-summary">
          <input
            type="number"
            min={SWEEP_RANGE_MIN_NM}
            max={SWEEP_RANGE_MAX_NM}
            step={SWEEP_RANGE_STEP_NM}
            value={formatSweepRangeInput(normalizeSweepRange(getSweepRange(inputs)))}
            onChange={(event) => updateSweepRange(toNumber(event.target.value))}
            onBlur={() => updateSweepRange(getSweepRange(inputs))}
            aria-label="Sweep range in nanometers"
          />
          <span>Centered on the current start/end midpoint</span>
        </div>
        <input
          className="sweep-range-slider"
          type="range"
          min={SWEEP_RANGE_MIN_NM}
          max={SWEEP_RANGE_MAX_NM}
          step={SWEEP_RANGE_STEP_NM}
          value={clampNumber(getSweepRange(inputs), SWEEP_RANGE_MIN_NM, SWEEP_RANGE_MAX_NM)}
          onChange={(event) => updateSweepRange(toNumber(event.target.value))}
          aria-label="Sweep range"
        />
        <div className="sweep-range-presets" role="group" aria-label="Sweep range presets">
          {SWEEP_RANGE_PRESETS_NM.map((presetNm) => (
            <button
              key={presetNm}
              type="button"
              className="sweep-range-preset"
              onClick={() => updateSweepRange(presetNm)}
              aria-pressed={Math.round(getSweepRange(inputs)) === presetNm}
            >
              {presetNm} nm
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Sweep points</span>
        <input
          type="number"
          min="2"
          step="1"
          value={inputs.wavelengthPointCount}
          onChange={updateNumberField('wavelengthPointCount')}
          onBlur={normalizeNumberField('wavelengthPointCount', 2, 2001, true)}
          aria-invalid={isInvalid('wavelengthPointCount')}
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthPointCount')} />
      </label>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <small className="field-error">{message}</small>;
}
