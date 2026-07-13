import { MATERIAL_CATALOG } from '../../simulation/materials/catalog';
import { formatRefractiveIndex } from '../../simulation/materials/material';
import {
  getAcousticEstimatedLayerCount,
  DEFAULT_ACOUSTIC_DESIGN_INPUTS,
} from '../../simulation/structures/acoustoOpticGrating';
import type { AcousticDesignInputs, QuarterWaveStackInputs } from '../../types/simulation';
import { FormattedNumberInput } from '../inputs/FormattedNumberInput';
import { useMemo } from 'react';

type AcousticGeneratorPanelProps = {
  inputs: QuarterWaveStackInputs;
  onChange: (inputs: QuarterWaveStackInputs) => void;
};

const REPRESENTATION_OPTIONS: Array<{ value: AcousticDesignInputs['acousticRepresentationMode']; label: string; detail: string }> = [
  { value: 'binary', label: 'Binary', detail: '2 slices per period' },
  { value: 'fast', label: 'Fast', detail: '8 slices per period' },
  { value: 'accurate', label: 'Accurate', detail: '16 slices per period' },
  { value: 'reference', label: 'Reference', detail: '32 slices per period' },
];

const getAcousticMaterialOptions = (
  acousticMaterial: AcousticDesignInputs['acousticMaterial'],
) => {
  const options = [DEFAULT_ACOUSTIC_DESIGN_INPUTS.acousticMaterial, ...MATERIAL_CATALOG];

  if (!options.some((material) => material.id === acousticMaterial.id)) {
    options.unshift(acousticMaterial);
  }

  return options;
};

/** Shows the acoustic generator inputs and the generated equivalent optical stack. */
export function AcousticGeneratorPanel({ inputs, onChange }: AcousticGeneratorPanelProps) {
  const acousticDesign = inputs.acousticDesign ?? DEFAULT_ACOUSTIC_DESIGN_INPUTS;
  const acousticMaterialOptions = getAcousticMaterialOptions(acousticDesign.acousticMaterial);
  const stackInput = useMemo(() => ({ ...inputs, acousticDesign }), [inputs, acousticDesign]);
  const estimatedLayerCount = getAcousticEstimatedLayerCount(stackInput);
  const isActiveMode = inputs.thicknessMode === 'acoustic';

  const updateDesign = (patch: Partial<AcousticDesignInputs>) =>
    {
      const nextDesign = { ...acousticDesign, ...patch };
      const nextInputs = {
        ...inputs,
        thicknessMode: 'acoustic' as const,
        acousticDesign: nextDesign,
      };
      onChange(nextInputs);
    };

  return (
    <section className="acoustic-panel" aria-label="Acousto-optic grating generator">
      <div className="stack-panel-heading">
        <h2>Acoustic Generator</h2>
        <span>Primary acoustic setup for the resolved optical stack.</span>
      </div>
      <div className="stack-panel-subtitle">
        <span className="mode-pill mode-pill-acoustic">Acoustic</span>
        <span>Configure the acoustic source; derived outputs are shown on Stack Definition.</span>
      </div>

      <div className="form-grid form-grid-global acoustic-form">
        <label className="field">
          <span>Acoustic medium</span>
          <select
            value={acousticDesign.acousticMaterial.id}
            disabled={!isActiveMode}
            onChange={(event) => {
              const material =
                acousticMaterialOptions.find((item) => item.id === event.target.value) ??
                acousticDesign.acousticMaterial;
              updateDesign({ acousticMaterial: material });
            }}
          >
            {acousticMaterialOptions.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} ({formatRefractiveIndex(material.refractiveIndex)})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Velocity (m/s)</span>
          <FormattedNumberInput
            min={1}
            step="1"
            parseMode="integer"
            normalizeOnBlur={Math.round}
            value={acousticDesign.acousticVelocityMps}
            readOnly={!isActiveMode}
            disabled={!isActiveMode}
            formatInactive={(value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '')}
            onValueChange={(acousticVelocityMps) => updateDesign({ acousticVelocityMps })}
            showStepper
            stepperLabel="acoustic velocity"
          />
        </label>
        <label className="field">
          <span>Frequency (Hz)</span>
          <FormattedNumberInput
            min={1}
            step="1"
            parseMode="integer"
            normalizeOnBlur={Math.round}
            value={acousticDesign.acousticFrequencyHz}
            readOnly={!isActiveMode}
            disabled={!isActiveMode}
            formatInactive={(value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '')}
            onValueChange={(acousticFrequencyHz) => updateDesign({ acousticFrequencyHz })}
            showStepper
            stepperLabel="acoustic frequency"
          />
        </label>
        <label className="field">
          <span>Periods</span>
          <FormattedNumberInput
            min={1}
            step="1"
            parseMode="integer"
            normalizeOnBlur={Math.round}
            value={acousticDesign.acousticPeriodCount}
            readOnly={!isActiveMode}
            disabled={!isActiveMode}
            formatInactive={(value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '')}
            onValueChange={(acousticPeriodCount) => updateDesign({ acousticPeriodCount })}
            showStepper
            stepperLabel="acoustic periods"
          />
        </label>
        <label className="field">
          <span>Bragg order</span>
          <FormattedNumberInput
            min={1}
            step="1"
            parseMode="integer"
            normalizeOnBlur={Math.round}
            value={acousticDesign.braggOrder}
            readOnly={!isActiveMode}
            disabled={!isActiveMode}
            formatInactive={(value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '')}
            onValueChange={(braggOrder) => updateDesign({ braggOrder })}
            showStepper
            stepperLabel="Bragg order"
          />
        </label>
        <label className="field">
          <span>Peak index modulation</span>
          <FormattedNumberInput
            min={0}
            step="0.001"
            value={acousticDesign.acousticIndexModulation}
            readOnly={!isActiveMode}
            disabled={!isActiveMode}
            formatInactive={(value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '')}
            onValueChange={(acousticIndexModulation) => updateDesign({ acousticIndexModulation })}
            showStepper
            stepperLabel="acoustic index modulation"
            stepperStep={0.001}
          />
        </label>
        <label className="field">
          <span>Representation</span>
          <select
            value={acousticDesign.acousticRepresentationMode}
            disabled={!isActiveMode}
            onChange={(event) =>
              updateDesign({ acousticRepresentationMode: event.target.value as AcousticDesignInputs['acousticRepresentationMode'] })
            }
          >
            {REPRESENTATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.detail}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="acoustic-actions">
        <p className="acoustic-helper">
          {isActiveMode
            ? `The active solver stack updates automatically (${estimatedLayerCount.toLocaleString()} slices).`
            : 'Switch Input mode to Acoustic to resolve this grating.'}
        </p>
      </div>
    </section>
  );
}
