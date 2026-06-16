import type { BraggReflectorInputs } from '../../types/simulation';

type BraggReflectorFormProps = {
  inputs: BraggReflectorInputs;
};

export function BraggReflectorForm({ inputs }: BraggReflectorFormProps) {
  return (
    <form className="form-grid">
      <label className="field">
        <span>High-index material</span>
        <input defaultValue={inputs.highIndexMaterial.name} />
      </label>

      <label className="field">
        <span>Low-index material</span>
        <input defaultValue={inputs.lowIndexMaterial.name} />
      </label>

      <label className="field">
        <span>High-index thickness (nm)</span>
        <input type="number" min="0" defaultValue={inputs.highIndexThicknessNm} />
      </label>

      <label className="field">
        <span>Low-index thickness (nm)</span>
        <input type="number" min="0" defaultValue={inputs.lowIndexThicknessNm} />
      </label>

      <label className="field">
        <span>Periods</span>
        <input type="number" min="1" step="1" defaultValue={inputs.periodCount} />
      </label>

      <label className="field">
        <span>Design wavelength (nm)</span>
        <input type="number" min="1" defaultValue={inputs.designWavelengthNm} />
      </label>

      <label className="field">
        <span>Incident angle (degrees)</span>
        <input type="number" min="0" max="89" defaultValue={inputs.incidentAngleDegrees} />
      </label>

      <label className="field">
        <span>Polarization</span>
        <select defaultValue={inputs.polarization}>
          <option value="TE">TE</option>
          <option value="TM">TM</option>
        </select>
      </label>
    </form>
  );
}
