import { MATERIAL_CATALOG } from '../../simulation/materials/catalog';
import { formatRefractiveIndex } from '../../simulation/materials/material';
import {
  buildAcousticGratingStack,
  buildAcousticGratingStackAsync,
  getAcousticDesignSummary,
  getAcousticEstimatedLayerCount,
  DEFAULT_ACOUSTIC_DESIGN_INPUTS,
  type AcousticGenerationProgress,
} from '../../simulation/structures/acoustoOpticGrating';
import type { AcousticDesignInputs, QuarterWaveStackInputs } from '../../types/simulation';
import { FormattedNumberInput } from '../inputs/FormattedNumberInput';
import { useEffect, useMemo, useRef, useState } from 'react';

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

/** Shows the acoustic generator inputs and the generated equivalent optical stack. */
export function AcousticGeneratorPanel({ inputs, onChange }: AcousticGeneratorPanelProps) {
  const acousticDesign = inputs.acousticDesign ?? DEFAULT_ACOUSTIC_DESIGN_INPUTS;
  const acousticMaterialOptions = MATERIAL_CATALOG.some(
    (material) => material.id === acousticDesign.acousticMaterial.id,
  )
    ? MATERIAL_CATALOG
    : [acousticDesign.acousticMaterial, ...MATERIAL_CATALOG];
  const stackInput = useMemo(() => ({ ...inputs, acousticDesign }), [inputs, acousticDesign]);
  const summary = getAcousticDesignSummary(stackInput);
  const estimatedLayerCount = getAcousticEstimatedLayerCount(stackInput);
  const [generationProgress, setGenerationProgress] = useState<AcousticGenerationProgress | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
  const isActiveMode = inputs.thicknessMode === 'acoustic';

  useEffect(() => {
    generationAbortRef.current?.abort();
    setGenerationProgress(null);
    setGenerationMessage(null);
  }, [stackInput]);

  const updateDesign = (patch: Partial<AcousticDesignInputs>) =>
    {
      const nextDesign = { ...acousticDesign, ...patch };
      const nextInputs = {
        ...inputs,
        thicknessMode: 'acoustic' as const,
        acousticDesign: nextDesign,
      };
      const nextSummary = getAcousticDesignSummary(nextInputs);

      onChange({
        ...nextInputs,
        periodCount: nextDesign.acousticPeriodCount,
        designWavelengthNm: nextSummary?.braggWavelengthNm ?? inputs.designWavelengthNm,
      });
    };

  const generateStack = async () => {
    if (!isActiveMode || !summary) {
      return;
    }

    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    setGenerationMessage('Generating acoustic stack...');
    setGenerationProgress({ completedLayers: 0, totalLayers: estimatedLayerCount });
    const stack =
      estimatedLayerCount <= 2048
        ? buildAcousticGratingStack(stackInput)
        : await buildAcousticGratingStackAsync(stackInput, setGenerationProgress, controller.signal);
    if (controller.signal.aborted) {
      return;
    }
    setGenerationProgress({ completedLayers: estimatedLayerCount, totalLayers: estimatedLayerCount });
    setGenerationMessage(stack ? 'Acoustic stack generation complete.' : 'Acoustic stack generation could not be completed.');
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
        <button type="button" className="parameter-sweep-run" onClick={generateStack} disabled={!summary || !isActiveMode}>
          Generate Equivalent Stack
        </button>
        <p className="acoustic-helper">
          {isActiveMode
            ? 'Generation runs in chunks so large period counts can report progress.'
            : 'Switch Input mode to Acoustic before generating an equivalent stack.'}
        </p>
      </div>

      {generationProgress ? (
        <div className="acoustic-progress" aria-live="polite">
          <progress max={generationProgress.totalLayers} value={generationProgress.completedLayers} />
          <span>
            {generationProgress.completedLayers.toLocaleString()} / {generationProgress.totalLayers.toLocaleString()} layers
          </span>
        </div>
      ) : null}
      {generationMessage ? <p className="parameter-sweep-status">{generationMessage}</p> : null}
    </section>
  );
}
