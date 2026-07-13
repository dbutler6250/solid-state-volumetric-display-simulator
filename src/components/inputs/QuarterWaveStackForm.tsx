import { useState, type ChangeEvent } from 'react';
import { MATERIAL_CATALOG } from '../../simulation/materials/catalog';
import { formatRefractiveIndex, getRefractiveIndexImag, getRefractiveIndexReal } from '../../simulation/materials/material';
import type { ValidationIssue } from '../../simulation/validation/quarterWaveStackValidation';
import type { Polarization, QuarterWaveStackInputs, ThicknessMode } from '../../types/simulation';
import { FormattedNumberInput } from './FormattedNumberInput';
import {
  applyCenteredSweepRange,
  applyCustomMaterialComponent,
  applyDesignWavelength,
  applySweepRange,
} from './quarterWaveStackFormState';
import { getResolvedStackInputs } from '../../simulation/structures/quarterWaveStack';

type QuarterWaveStackFormProps = {
  inputs: QuarterWaveStackInputs;
  validationIssues: ValidationIssue[];
  onChange: (inputs: QuarterWaveStackInputs) => void;
  onModeChange?: (mode: ThicknessMode) => void;
  section?: 'global' | 'sweep';
  externalResetKey?: number;
};

const toNumber = (value: string): number => Number(value);
const CUSTOM_MATERIAL_ID = 'custom';
const CUSTOM_MATERIAL_NAME = 'Custom';
const SWEEP_RANGE_PRESETS_NM = [10, 50, 100, 200, 300, 600];
const SWEEP_RANGE_MIN_NM = 10;
const SWEEP_RANGE_MAX_NM = 1200;
const SWEEP_RANGE_STEP_NM = 1;
const SWEEP_ENDPOINT_MIN_NM = 1;
const SWEEP_ENDPOINT_MAX_NM = 2000;
const SWEEP_ENDPOINT_STEP_NM = 1;
const REFRACTIVE_INDEX_STEP = 0.001;

const getIssueForField = (
  issues: ValidationIssue[],
  field: keyof QuarterWaveStackInputs,
): string | undefined => issues.find((issue) => issue.field === field)?.message;

const formatMaterialNumber = (value: number | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return Number(value.toString()).toString();
};

const formatNumericInput = (value: number | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return Number(value.toString()).toString();
};

/** Keeps numeric edits within the supported input range. */
const clampNumber = (value: number, min: number, max?: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max ?? value, Math.max(min, value));
};

const isCustomMaterial = (materialId: string): boolean => materialId === CUSTOM_MATERIAL_ID;
const getSweepRange = (inputs: QuarterWaveStackInputs): number =>
  Math.max(0, (inputs.wavelengthEndNm ?? 0) - (inputs.wavelengthStartNm ?? 0));

const normalizeSweepRange = (rangeNm: number): number =>
  Math.round(clampNumber(rangeNm, SWEEP_RANGE_MIN_NM, SWEEP_RANGE_MAX_NM));

const formatWavelengthInput = (value: number | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return Number(value.toString()).toString();
};

const formatSweepRangeInput = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toString()).toString() : '';

const formatThicknessDisplay = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '';

export function QuarterWaveStackForm({
  inputs,
  validationIssues,
  onChange,
  onModeChange,
  section = 'global',
  externalResetKey = 0,
}: QuarterWaveStackFormProps) {
  const [sweepResetKeys, setSweepResetKeys] = useState({ start: 0, end: 0, range: 0 });
  const resetSweepDrafts = (...fields: Array<keyof typeof sweepResetKeys>) => {
    setSweepResetKeys((current) => {
      const next = { ...current };
      fields.forEach((field) => { next[field] += 1; });
      return next;
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

  const updateSweepRange = (rangeNm: number) => {
    onChange(applySweepRange(inputs, normalizeSweepRange(rangeNm)));
  };
  const centerSweepOnDesignLambda = () => {
    if (!Number.isFinite(inputs.designWavelengthNm)) {
      return;
    }

    onChange(applyCenteredSweepRange(inputs, inputs.designWavelengthNm, getSweepRange(inputs)));
    resetSweepDrafts('start', 'end', 'range');
  };
  const updateThicknessMode = (event: ChangeEvent<HTMLSelectElement>) => {
    const mode = event.target.value as ThicknessMode;
    if (onModeChange) onModeChange(mode);
    else onChange({ ...inputs, thicknessMode: mode });
  };
  const isInvalid = (field: keyof QuarterWaveStackInputs): boolean =>
    getIssueForField(validationIssues, field) !== undefined;
  const thicknessMode = inputs.thicknessMode ?? 'derived';
  const resolvedStackInputs = getResolvedStackInputs(inputs);
  const visibleThicknessHighNm =
    thicknessMode === 'manual'
      ? inputs.highIndexThicknessNm
      : resolvedStackInputs.highIndexThicknessNm;
  const visibleThicknessLowNm =
    thicknessMode === 'manual'
      ? inputs.lowIndexThicknessNm
      : resolvedStackInputs.lowIndexThicknessNm;
  const canEditModeInputs = thicknessMode !== 'acoustic';
  const visiblePeriodCount = thicknessMode === 'acoustic' ? resolvedStackInputs.periodCount : inputs.periodCount;
  const visibleDesignWavelengthNm =
    thicknessMode === 'acoustic' ? resolvedStackInputs.designWavelengthNm : inputs.designWavelengthNm;

  const renderMaterialField = (field: 'highIndexMaterial' | 'lowIndexMaterial', label: string) => {
    const material = inputs[field];
    const isCustom = isCustomMaterial(material.id);
    const realIndex = getRefractiveIndexReal(material.refractiveIndex);
    const imagIndex = getRefractiveIndexImag(material.refractiveIndex);
    const updateComponent = (component: 'real' | 'imag', value: number) =>
      onChange(applyCustomMaterialComponent(inputs, field, component, value));

    return (
      <div className="field">
        <span>{label}</span>
        <select
          value={isCustom ? CUSTOM_MATERIAL_ID : material.id}
          onChange={updateMaterial(field)}
        >
          {MATERIAL_CATALOG.map((catalogMaterial) => (
            <option key={catalogMaterial.id} value={catalogMaterial.id}>
              {catalogMaterial.name} ({formatRefractiveIndex(catalogMaterial.refractiveIndex)})
            </option>
          ))}
          <option value={CUSTOM_MATERIAL_ID}>Custom refractive index</option>
        </select>
        {isCustom ? (
          <div className="custom-material-fields">
            <label className="field">
              <span>{label} n</span>
              <FormattedNumberInput
                step={REFRACTIVE_INDEX_STEP}
                min={0}
                value={realIndex}
                formatInactive={formatMaterialNumber}
                onValueChange={(value) => updateComponent('real', value)}
                resetKey={externalResetKey}
                showStepper
                stepperLabel={`${label} real refractive index`}
                aria-label={`${label} real refractive index`}
              />
            </label>
            <label className="field">
              <span>{label} k</span>
              <FormattedNumberInput
                step={REFRACTIVE_INDEX_STEP}
                min={0}
                value={imagIndex}
                formatInactive={formatMaterialNumber}
                onValueChange={(value) => updateComponent('imag', value)}
                resetKey={externalResetKey}
                showStepper
                stepperLabel={`${label} extinction coefficient`}
                aria-label={`${label} extinction coefficient`}
              />
            </label>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <form className={`form-grid form-grid-${section}`}>
      {section === 'global' ? (
        <>
      {renderMaterialField('highIndexMaterial', 'High-index material')}
      {renderMaterialField('lowIndexMaterial', 'Low-index material')}

      <div className="field thickness-mode-group">
        <label className="field">
          <span>Input mode</span>
          <select value={thicknessMode} onChange={updateThicknessMode}>
            <option value="derived">Optical</option>
            <option value="manual">Manual</option>
            <option value="acoustic">Acoustic</option>
          </select>
          <FieldError message={getIssueForField(validationIssues, 'thicknessMode')} />
        </label>
      </div>

      {thicknessMode === 'manual' ? (
        <>
          <label className="field">
            <span>High-index thickness (nm)</span>
            <FormattedNumberInput
              min={0}
              step="any"
              value={inputs.highIndexThicknessNm}
              formatInactive={formatThicknessDisplay}
              readOnly={thicknessMode !== 'manual'}
              disabled={thicknessMode !== 'manual'}
              onValueChange={(highIndexThicknessNm) => onChange({
                ...inputs,
                thicknessMode: 'manual',
                highIndexThicknessNm,
              })}
              resetKey={externalResetKey}
              showStepper
              stepperLabel="high-index thickness"
              stepperStep={0.1}
              aria-invalid={isInvalid('highIndexThicknessNm')}
            />
            <FieldError message={getIssueForField(validationIssues, 'highIndexThicknessNm')} />
          </label>

          <label className="field">
            <span>Low-index thickness (nm)</span>
            <FormattedNumberInput
              min={0}
              step="any"
              value={inputs.lowIndexThicknessNm}
              formatInactive={formatThicknessDisplay}
              readOnly={thicknessMode !== 'manual'}
              disabled={thicknessMode !== 'manual'}
              onValueChange={(lowIndexThicknessNm) => onChange({
                ...inputs,
                thicknessMode: 'manual',
                lowIndexThicknessNm,
              })}
              resetKey={externalResetKey}
              showStepper
              stepperLabel="low-index thickness"
              stepperStep={0.1}
              aria-invalid={isInvalid('lowIndexThicknessNm')}
            />
            <FieldError message={getIssueForField(validationIssues, 'lowIndexThicknessNm')} />
          </label>
        </>
      ) : (
        <>
          <div className="field thickness-readout">
            <span>High-index thickness</span>
            <strong>{formatThicknessDisplay(visibleThicknessHighNm)} nm</strong>
          </div>

          <div className="field thickness-readout">
            <span>Low-index thickness</span>
            <strong>{formatThicknessDisplay(visibleThicknessLowNm)} nm</strong>
          </div>
        </>
      )}

      {thicknessMode === 'acoustic' ? (
        <div className="acoustic-resolved-readout" aria-label="Resolved acoustic stack values">
          <div className="thickness-readout">
            <span>Resolved periods</span>
            <strong>{formatNumericInput(visiblePeriodCount)}</strong>
          </div>
          <div className="thickness-readout">
            <span>Resolved design wavelength</span>
            <strong>{formatNumericInput(visibleDesignWavelengthNm)} nm</strong>
          </div>
        </div>
      ) : (
        <>
          <label className="field">
            <span>Periods</span>
            <FormattedNumberInput
              min={1}
              step="1"
              parseMode="integer"
              normalizeOnBlur={Math.round}
              value={visiblePeriodCount}
              formatInactive={formatNumericInput}
              readOnly={!canEditModeInputs}
              disabled={!canEditModeInputs}
              onValueChange={(periodCount) => onChange({ ...inputs, periodCount })}
              resetKey={externalResetKey}
              showStepper
              stepperLabel="periods"
              aria-invalid={isInvalid('periodCount')}
            />
            <FieldError message={getIssueForField(validationIssues, 'periodCount')} />
          </label>

          <label className="field">
            <span>Design wavelength (nm)</span>
            <FormattedNumberInput
              min={1}
              value={visibleDesignWavelengthNm}
              formatInactive={formatNumericInput}
              readOnly={!canEditModeInputs}
              disabled={!canEditModeInputs}
              onValueChange={(value) => onChange(applyDesignWavelength(inputs, value))}
              resetKey={externalResetKey}
              showStepper
              stepperLabel="design wavelength"
              stepperStep={1}
              aria-invalid={isInvalid('designWavelengthNm')}
            />
            <FieldError message={getIssueForField(validationIssues, 'designWavelengthNm')} />
          </label>
        </>
      )}

      <label className="field">
        <span>Incident angle (degrees)</span>
        <FormattedNumberInput
          min={0}
          max={89.9}
          value={inputs.incidentAngleDegrees}
          formatInactive={formatNumericInput}
          onValueChange={(incidentAngleDegrees) => onChange({ ...inputs, incidentAngleDegrees })}
          resetKey={externalResetKey}
          showStepper
          stepperLabel="incident angle"
          stepperStep={1}
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
        </>
      ) : (
        <>
      <div className="sweep-section-title">
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

      <label className="field sweep-start-field">
        <span>Start wavelength (nm)</span>
        <FormattedNumberInput
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          parseMode="integer"
          normalizeOnBlur={Math.round}
          value={inputs.wavelengthStartNm}
          formatInactive={formatWavelengthInput}
          onValueChange={(wavelengthStartNm) => onChange({ ...inputs, wavelengthStartNm })}
          resetKey={`${externalResetKey}:${sweepResetKeys.start}`}
          showStepper
          stepperLabel="start wavelength"
          aria-invalid={isInvalid('wavelengthStartNm')}
        />
        <input
          className="sweep-range-slider"
          type="range"
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          value={inputs.wavelengthStartNm}
          onChange={(event) => {
            onChange({ ...inputs, wavelengthStartNm: toNumber(event.target.value) });
            resetSweepDrafts('start', 'range');
          }}
          aria-label="Start wavelength slider"
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthStartNm')} />
      </label>

      <label className="field sweep-end-field">
        <span>End wavelength (nm)</span>
        <FormattedNumberInput
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          parseMode="integer"
          normalizeOnBlur={Math.round}
          value={inputs.wavelengthEndNm}
          formatInactive={formatWavelengthInput}
          onValueChange={(wavelengthEndNm) => onChange({ ...inputs, wavelengthEndNm })}
          resetKey={`${externalResetKey}:${sweepResetKeys.end}`}
          showStepper
          stepperLabel="end wavelength"
          aria-invalid={isInvalid('wavelengthEndNm')}
        />
        <input
          className="sweep-range-slider"
          type="range"
          min={SWEEP_ENDPOINT_MIN_NM}
          max={SWEEP_ENDPOINT_MAX_NM}
          step={SWEEP_ENDPOINT_STEP_NM}
          value={inputs.wavelengthEndNm}
          onChange={(event) => {
            onChange({ ...inputs, wavelengthEndNm: toNumber(event.target.value) });
            resetSweepDrafts('end', 'range');
          }}
          aria-label="End wavelength slider"
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthEndNm')} />
      </label>

      <label className="field sweep-points-field">
        <span>Sweep points</span>
        <FormattedNumberInput
          min={2}
          max={2001}
          step="1"
          parseMode="integer"
          normalizeOnBlur={Math.round}
          value={inputs.wavelengthPointCount}
          formatInactive={formatNumericInput}
          onValueChange={(wavelengthPointCount) => onChange({ ...inputs, wavelengthPointCount })}
          resetKey={externalResetKey}
          showStepper
          stepperLabel="sweep points"
          aria-invalid={isInvalid('wavelengthPointCount')}
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthPointCount')} />
      </label>

      <div className="field sweep-range-field">
        <span>Sweep range</span>
        <div className="sweep-range-summary">
          <FormattedNumberInput
            min={SWEEP_RANGE_MIN_NM}
            max={SWEEP_RANGE_MAX_NM}
            step={SWEEP_RANGE_STEP_NM}
            parseMode="integer"
            normalizeOnBlur={normalizeSweepRange}
            value={normalizeSweepRange(getSweepRange(inputs))}
            formatInactive={formatSweepRangeInput}
            onValueChange={updateSweepRange}
            resetKey={`${externalResetKey}:${sweepResetKeys.range}`}
            showStepper
            stepperLabel="sweep range"
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
          onChange={(event) => {
            updateSweepRange(toNumber(event.target.value));
            resetSweepDrafts('start', 'end', 'range');
          }}
          aria-label="Sweep range"
        />
        <div className="sweep-range-presets" role="group" aria-label="Sweep range presets">
          {SWEEP_RANGE_PRESETS_NM.map((presetNm) => (
            <button
              key={presetNm}
              type="button"
              className="sweep-range-preset"
              onClick={() => {
                updateSweepRange(presetNm);
                resetSweepDrafts('start', 'end', 'range');
              }}
              aria-pressed={Math.round(getSweepRange(inputs)) === presetNm}
            >
              {presetNm} nm
            </button>
          ))}
        </div>
      </div>

        </>
      )}
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <small className="field-error">{message}</small>;
}
