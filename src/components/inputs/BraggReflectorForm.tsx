import type { ChangeEvent } from 'react';
import { MATERIAL_CATALOG } from '../../simulation/materials/catalog';
import type { BraggReflectorInputs, Polarization } from '../../types/simulation';

type BraggReflectorFormProps = {
  inputs: BraggReflectorInputs;
  onChange: (inputs: BraggReflectorInputs) => void;
};

const toNumber = (value: string): number => Number(value);

export function BraggReflectorForm({ inputs, onChange }: BraggReflectorFormProps) {
  const updateNumberField =
    (field: keyof Pick<
      BraggReflectorInputs,
      | 'highIndexThicknessNm'
      | 'lowIndexThicknessNm'
      | 'periodCount'
      | 'designWavelengthNm'
      | 'incidentAngleDegrees'
    >) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...inputs,
        [field]: toNumber(event.target.value),
      });
    };

  const updateMaterial =
    (field: 'highIndexMaterial' | 'lowIndexMaterial') =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      const material = MATERIAL_CATALOG.find((item) => item.id === event.target.value);

      if (!material) {
        return;
      }

      onChange({
        ...inputs,
        [field]: material,
      });
    };

  return (
    <form className="form-grid">
      <label className="field">
        <span>High-index material</span>
        <select value={inputs.highIndexMaterial.id} onChange={updateMaterial('highIndexMaterial')}>
          {MATERIAL_CATALOG.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name} (n={material.refractiveIndex})
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Low-index material</span>
        <select value={inputs.lowIndexMaterial.id} onChange={updateMaterial('lowIndexMaterial')}>
          {MATERIAL_CATALOG.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name} (n={material.refractiveIndex})
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>High-index thickness (nm)</span>
        <input
          type="number"
          min="0"
          value={inputs.highIndexThicknessNm}
          onChange={updateNumberField('highIndexThicknessNm')}
        />
      </label>

      <label className="field">
        <span>Low-index thickness (nm)</span>
        <input
          type="number"
          min="0"
          value={inputs.lowIndexThicknessNm}
          onChange={updateNumberField('lowIndexThicknessNm')}
        />
      </label>

      <label className="field">
        <span>Periods</span>
        <input
          type="number"
          min="1"
          step="1"
          value={inputs.periodCount}
          onChange={updateNumberField('periodCount')}
        />
      </label>

      <label className="field">
        <span>Design wavelength (nm)</span>
        <input
          type="number"
          min="1"
          value={inputs.designWavelengthNm}
          onChange={updateNumberField('designWavelengthNm')}
        />
      </label>

      <label className="field">
        <span>Incident angle (degrees)</span>
        <input
          type="number"
          min="0"
          max="89"
          value={inputs.incidentAngleDegrees}
          onChange={updateNumberField('incidentAngleDegrees')}
        />
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
    </form>
  );
}
