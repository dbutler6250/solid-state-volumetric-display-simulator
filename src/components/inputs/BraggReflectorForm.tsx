import type { ChangeEvent } from 'react';
import { MATERIAL_CATALOG } from '../../simulation/materials/catalog';
import type { ValidationIssue } from '../../simulation/validation/braggReflectorValidation';
import type { BraggReflectorInputs, Polarization } from '../../types/simulation';

type BraggReflectorFormProps = {
  inputs: BraggReflectorInputs;
  validationIssues: ValidationIssue[];
  onChange: (inputs: BraggReflectorInputs) => void;
};

const toNumber = (value: string): number => Number(value);
const CUSTOM_MATERIAL_ID = 'custom';
const CUSTOM_MATERIAL_NAME = 'Custom';

type NumericField = keyof Pick<
  BraggReflectorInputs,
  | 'periodCount'
  | 'designWavelengthNm'
  | 'incidentAngleDegrees'
  | 'wavelengthStartNm'
  | 'wavelengthEndNm'
  | 'wavelengthPointCount'
>;

const getIssueForField = (
  issues: ValidationIssue[],
  field: keyof BraggReflectorInputs,
): string | undefined => issues.find((issue) => issue.field === field)?.message;

const clampNumber = (value: number, min: number, max?: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max ?? value, Math.max(min, value));
};

const isCustomMaterial = (materialId: string): boolean => materialId === CUSTOM_MATERIAL_ID;

export function BraggReflectorForm({
  inputs,
  validationIssues,
  onChange,
}: BraggReflectorFormProps) {
  const updateNumberField =
    (field: NumericField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...inputs,
        [field]: toNumber(event.target.value),
      });
    };

  const normalizeNumberField =
    (field: NumericField, min: number, max?: number, integer = false) =>
    () => {
      const value = inputs[field] ?? min;
      const clampedValue = clampNumber(value, min, max);

      onChange({
        ...inputs,
        [field]: integer ? Math.round(clampedValue) : clampedValue,
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
          } as BraggReflectorInputs[typeof field]),
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
  const isInvalid = (field: keyof BraggReflectorInputs): boolean =>
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

      <div className="form-section-title">Wavelength Sweep</div>

      <label className="field">
        <span>Start wavelength (nm)</span>
        <input
          type="number"
          min="1"
          value={inputs.wavelengthStartNm}
          onChange={updateNumberField('wavelengthStartNm')}
          onBlur={normalizeNumberField('wavelengthStartNm', 1)}
          aria-invalid={isInvalid('wavelengthStartNm')}
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthStartNm')} />
      </label>

      <label className="field">
        <span>End wavelength (nm)</span>
        <input
          type="number"
          min="1"
          value={inputs.wavelengthEndNm}
          onChange={updateNumberField('wavelengthEndNm')}
          onBlur={normalizeNumberField('wavelengthEndNm', 1)}
          aria-invalid={isInvalid('wavelengthEndNm')}
        />
        <FieldError message={getIssueForField(validationIssues, 'wavelengthEndNm')} />
      </label>

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
