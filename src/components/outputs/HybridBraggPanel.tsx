import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../../simulation/structures/hybridBraggGrating';
import type { HybridBraggDesignInputs, QuarterWaveStackInputs } from '../../types/simulation';
import { FormattedNumberInput } from '../inputs/FormattedNumberInput';

type HybridBraggPanelProps = {
  inputs: QuarterWaveStackInputs;
  onChange: (inputs: QuarterWaveStackInputs) => void;
};

const formatNumber = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toString()).toString() : '';

/** Minimal v2 controls for the permanent grating plus prescribed localized strain model. */
export function HybridBraggPanel({ inputs, onChange }: HybridBraggPanelProps) {
  const design = inputs.hybridBraggDesign ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS;
  const isActiveMode = inputs.thicknessMode === 'hybrid';
  const updateDesign = (patch: Partial<HybridBraggDesignInputs>) => {
    const nextLengthMm = patch.lengthMm ?? design.lengthMm;
    const nextPulseRange = getNextPulseSweepRange(design, patch, nextLengthMm);
    const nextDesign = {
      ...design,
      ...patch,
      ...nextPulseRange,
    };
    onChange({
      ...inputs,
      thicknessMode: 'hybrid',
      designWavelengthNm:
        patch.averageIndex || patch.gratingPeriodNm
          ? 2 * (patch.averageIndex ?? design.averageIndex) * (patch.gratingPeriodNm ?? design.gratingPeriodNm)
          : inputs.designWavelengthNm,
      hybridBraggDesign: nextDesign,
    });
  };

  return (
    <section className="acoustic-panel" aria-label="Hybrid Bragg grating inputs">
      <div className="stack-panel-heading">
        <h2>Hybrid Bragg Grating</h2>
        <span>Permanent grating with a prescribed localized strain region.</span>
      </div>
      <div className="stack-panel-subtitle">
        <span className="mode-pill mode-pill-hybrid">Hybrid</span>
        <span>Headless v2 coupled-mode solver; acoustic propagation is not included yet.</span>
      </div>
      <div className="form-grid form-grid-global acoustic-form">
        <HybridNumber label="Length (mm)" value={design.lengthMm} min={0.001} disabled={!isActiveMode} onChange={(lengthMm) => updateDesign({ lengthMm })} />
        <HybridNumber label="Average index" value={design.averageIndex} min={0.1} step={0.001} disabled={!isActiveMode} onChange={(averageIndex) => updateDesign({ averageIndex })} />
        <HybridNumber label="Index modulation" value={design.indexModulation} min={0} step={0.00001} disabled={!isActiveMode} onChange={(indexModulation) => updateDesign({ indexModulation })} />
        <HybridNumber label="Grating period (nm)" value={design.gratingPeriodNm} min={0.001} step={0.1} disabled={!isActiveMode} onChange={(gratingPeriodNm) => updateDesign({ gratingPeriodNm })} />
        <HybridNumber label="Peak strain" value={design.peakStrain} step={0.00001} disabled={!isActiveMode} onChange={(peakStrain) => updateDesign({ peakStrain })} />
        <HybridNumber label="Strain center (mm)" value={design.strainCenterMm} min={0} step={0.1} disabled={!isActiveMode} onChange={(strainCenterMm) => updateDesign({ strainCenterMm })} />
        <HybridNumber label="Strain width (mm)" value={design.strainWidthMm} min={0.001} step={0.1} disabled={!isActiveMode} onChange={(strainWidthMm) => updateDesign({ strainWidthMm })} />
        <label className="field">
          <span>Strain shape</span>
          <select
            value={design.strainShape}
            disabled={!isActiveMode}
            onChange={(event) => updateDesign({ strainShape: event.target.value as HybridBraggDesignInputs['strainShape'] })}
          >
            <option value="rectangular">Rectangular</option>
            <option value="gaussian">Gaussian</option>
          </select>
        </label>
        <HybridNumber label="Photoelastic pe" value={design.effectivePhotoelasticCoefficient} step={0.01} disabled={!isActiveMode} onChange={(effectivePhotoelasticCoefficient) => updateDesign({ effectivePhotoelasticCoefficient })} />
        <HybridNumber label="Segments" value={design.segmentCount} min={1} step={1} integer disabled={!isActiveMode} onChange={(segmentCount) => updateDesign({ segmentCount })} />
        <HybridNumber label="Fixed laser (nm)" value={design.fixedLaserWavelengthNm} min={1} step={1} disabled={!isActiveMode} onChange={(fixedLaserWavelengthNm) => updateDesign({ fixedLaserWavelengthNm })} />
        <HybridNumber label="Pulse sweep start (mm)" value={design.pulseSweepStartMm} min={0} step={0.1} disabled={!isActiveMode} onChange={(pulseSweepStartMm) => updateDesign({ pulseSweepStartMm })} />
        <HybridNumber label="Pulse sweep end (mm)" value={design.pulseSweepEndMm} min={0} step={0.1} disabled={!isActiveMode} onChange={(pulseSweepEndMm) => updateDesign({ pulseSweepEndMm })} />
        <HybridNumber label="Pulse positions" value={design.pulseSweepPointCount} min={2} step={1} integer disabled={!isActiveMode} onChange={(pulseSweepPointCount) => updateDesign({ pulseSweepPointCount })} />
      </div>
    </section>
  );
}

function getNextPulseSweepRange(
  design: HybridBraggDesignInputs,
  patch: Partial<HybridBraggDesignInputs>,
  nextLengthMm: number,
): Pick<HybridBraggDesignInputs, 'pulseSweepStartMm' | 'pulseSweepEndMm'> {
  const pulseSweepStartMm = Math.min(patch.pulseSweepStartMm ?? design.pulseSweepStartMm, nextLengthMm);
  const pulseSweepEndMm = Math.min(patch.pulseSweepEndMm ?? design.pulseSweepEndMm, nextLengthMm);

  if (patch.lengthMm !== undefined && pulseSweepEndMm <= pulseSweepStartMm) {
    return { pulseSweepStartMm: 0, pulseSweepEndMm: nextLengthMm };
  }

  return { pulseSweepStartMm, pulseSweepEndMm };
}

function HybridNumber({
  label,
  value,
  onChange,
  disabled,
  min,
  step = 0.001,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  min?: number;
  step?: number;
  integer?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <FormattedNumberInput
        min={min}
        step={String(step)}
        parseMode={integer ? 'integer' : 'decimal'}
        normalizeOnBlur={integer ? Math.round : undefined}
        value={value}
        readOnly={disabled}
        disabled={disabled}
        formatInactive={formatNumber}
        onValueChange={onChange}
        showStepper
        stepperLabel={label.toLowerCase()}
        stepperStep={step}
      />
    </label>
  );
}
