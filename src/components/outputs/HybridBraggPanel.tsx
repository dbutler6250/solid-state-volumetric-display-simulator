import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../../simulation/structures/hybridBraggGrating';
import { MAX_HYBRID_BRAGG_SECTIONS } from '../../simulation/simulationLimits';
import type { HybridBraggDesignInputs, QuarterWaveStackInputs } from '../../types/simulation';
import {
  formatMicrostrain,
  formatNm,
  formatSignedNm,
  formatStrain,
  getFixedGratingReadouts,
  getOperatingPointInterpretation,
} from '../researchReadouts';
import { FormattedNumberInput } from '../inputs/FormattedNumberInput';

type HybridBraggPanelProps = {
  inputs: QuarterWaveStackInputs;
  onChange: (inputs: QuarterWaveStackInputs) => void;
};

const formatNumber = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toString()).toString() : '';

/** Controls for the permanent grating plus prescribed perturbation-field model. */
export function HybridBraggPanel({ inputs, onChange }: HybridBraggPanelProps) {
  const design = inputs.hybridBraggDesign ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS;
  const isActiveMode = inputs.thicknessMode === 'hybrid';
  const usesWidth = ['rectangular', 'gaussian', 'smooth-top-hat', 'triangular', 'carrier-envelope'].includes(design.strainShape);
  const usesCenter = ['rectangular', 'gaussian', 'smooth-top-hat', 'triangular', 'carrier-envelope'].includes(design.strainShape);
  const usesPiezo = ['piezo-window', 'piezo-trough', 'piezo-array'].includes(design.strainShape);
  const usesEdge = design.strainShape === 'smooth-top-hat' || usesPiezo;
  const usesWave = ['traveling-sinusoid', 'standing-wave', 'carrier-envelope', 'multi-tone'].includes(design.strainShape);
  const usesSecondaryWave = design.strainShape === 'multi-tone';
  const readouts = getFixedGratingReadouts(design);
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
  const updateLaserDetuning = (laserDetuningNm: number) => {
    updateDesign({ fixedLaserWavelengthNm: readouts.staticBraggWavelengthNm + laserDetuningNm });
  };

  return (
    <section className="acoustic-panel" aria-label="Fixed grating display inputs">
      <div className="stack-panel-heading">
        <h2>Fixed-Grating Display</h2>
        <span>Preset: Current Research Baseline</span>
      </div>
      <div className="stack-panel-subtitle">
        <span className="mode-pill mode-pill-hybrid">Fixed Grating</span>
        <span>{getOperatingPointInterpretation(design)}</span>
      </div>
      <dl className="architecture-status-grid operating-point-grid" aria-label="Operating point summary">
        <div>
          <dt>Static Bragg</dt>
          <dd>{formatNm(readouts.staticBraggWavelengthNm)} nm</dd>
        </div>
        <div>
          <dt>Laser</dt>
          <dd>{formatNm(design.fixedLaserWavelengthNm)} nm</dd>
        </div>
        <div>
          <dt>Detuning</dt>
          <dd>{formatSignedNm(readouts.laserDetuningNm)} nm</dd>
        </div>
        <div>
          <dt>Background strain</dt>
          <dd>{formatMicrostrain(design.strainBias)}</dd>
        </div>
        <div>
          <dt>Trough center</dt>
          <dd>{design.strainCenterMm.toFixed(3)} mm</dd>
        </div>
        <div>
          <dt>Solver</dt>
          <dd>Interactive CMT; Maxwell validation stale after edits</dd>
        </div>
      </dl>
      <dl className="derived-readout-grid" aria-label="Derived fixed grating values">
        <div>
          <dt>Background Bragg</dt>
          <dd>{formatNm(readouts.backgroundBraggWavelengthNm)} nm</dd>
        </div>
        <div>
          <dt>Local trough Bragg</dt>
          <dd>{formatNm(readouts.troughBraggWavelengthNm)} nm</dd>
        </div>
        <div>
          <dt>Strain relief</dt>
          <dd>{formatStrain(readouts.strainRelief)} ({formatMicrostrain(readouts.strainRelief)})</dd>
        </div>
      </dl>
      <div className="hybrid-control-groups" aria-label="Fixed grating display input groups">
        <section className="control-group control-group-core" aria-label="Core experiment controls">
          <h3>Core Experiment</h3>
          <div className="form-grid form-grid-global acoustic-form">
            <HybridNumber label="Laser detuning (nm)" value={readouts.laserDetuningNm} step={0.001} disabled={!isActiveMode} onChange={updateLaserDetuning} />
            <HybridNumber label="Background strain" value={design.strainBias} step={0.00001} disabled={!isActiveMode} onChange={(strainBias) => updateDesign({ strainBias })} />
            <HybridNumber label="Trough strain" value={readouts.troughStrain} step={0.00001} disabled={!isActiveMode} onChange={(troughStrain) => updateDesign({ peakStrain: troughStrain - design.strainBias })} />
            {(usesCenter || usesPiezo) ? <HybridNumber label="Trough center (mm)" value={design.strainCenterMm} min={0} step={0.1} disabled={!isActiveMode} onChange={(strainCenterMm) => updateDesign({ strainCenterMm })} /> : null}
            {(usesWidth || usesPiezo) ? <HybridNumber label="Trough width (mm)" value={design.strainWidthMm} min={0.001} step={0.1} disabled={!isActiveMode} onChange={(strainWidthMm) => updateDesign({ strainWidthMm })} /> : null}
            {usesEdge ? <HybridNumber label="Edge transition (mm)" value={design.perturbationEdgeWidthMm} min={0} step={0.05} disabled={!isActiveMode} onChange={(perturbationEdgeWidthMm) => updateDesign({ perturbationEdgeWidthMm })} /> : null}
          </div>
        </section>
        <details className="control-group" open>
          <summary>Permanent Grating</summary>
          <div className="form-grid form-grid-global acoustic-form">
        <HybridNumber label="Length (mm)" value={design.lengthMm} min={0.001} disabled={!isActiveMode} onChange={(lengthMm) => updateDesign({ lengthMm })} />
        <HybridNumber label="Average index" value={design.averageIndex} min={0.1} step={0.001} disabled={!isActiveMode} onChange={(averageIndex) => updateDesign({ averageIndex })} />
        <HybridNumber label="Delta n" value={design.indexModulation} min={0} step={0.00001} disabled={!isActiveMode} onChange={(indexModulation) => updateDesign({ indexModulation })} />
        <HybridNumber label="Grating period (nm)" value={design.gratingPeriodNm} min={0.001} step={0.1} disabled={!isActiveMode} onChange={(gratingPeriodNm) => updateDesign({ gratingPeriodNm })} />
          </div>
        </details>
        <details className="control-group">
          <summary>Advanced Solver / Strain Model</summary>
          <div className="form-grid form-grid-global acoustic-form">
        <label className="field">
          <span>Grating mode</span>
          <select
            value={design.permanentGratingMode}
            disabled={!isActiveMode}
            onChange={(event) => updateDesign({ permanentGratingMode: event.target.value as HybridBraggDesignInputs['permanentGratingMode'] })}
          >
            <option value="global">Global coherent</option>
            <option value="segmented">Segmented local sections</option>
          </select>
        </label>
        {design.permanentGratingMode === 'segmented' ? (
          <>
            <HybridNumber label="Bragg sections" value={design.braggSectionCount} min={1} max={MAX_HYBRID_BRAGG_SECTIONS} step={1} integer disabled={!isActiveMode} onChange={(braggSectionCount) => updateDesign({ braggSectionCount })} />
            <HybridNumber label="Section gap (mm)" value={design.braggSectionGapMm} min={0} step={0.01} disabled={!isActiveMode} onChange={(braggSectionGapMm) => updateDesign({ braggSectionGapMm })} />
            <label className="field">
              <span>Section phase</span>
              <select
                value={design.braggSectionPhaseMode}
                disabled={!isActiveMode}
                onChange={(event) => updateDesign({ braggSectionPhaseMode: event.target.value as HybridBraggDesignInputs['braggSectionPhaseMode'] })}
              >
                <option value="continuous">Continuous phase</option>
                <option value="fixed-reset">Fixed phase reset</option>
                <option value="alternating">Alternating phase</option>
                <option value="seeded-random">Seeded pseudo-random</option>
              </select>
            </label>
            {design.braggSectionPhaseMode === 'seeded-random' ? (
              <HybridNumber label="Phase seed" value={design.braggSectionRandomSeed} min={0} step={1} integer disabled={!isActiveMode} onChange={(braggSectionRandomSeed) => updateDesign({ braggSectionRandomSeed })} />
            ) : null}
          </>
        ) : null}
        <label className="field">
          <span>Strain profile</span>
          <select
            value={design.strainShape}
            disabled={!isActiveMode}
            onChange={(event) => updateDesign({ strainShape: event.target.value as HybridBraggDesignInputs['strainShape'] })}
          >
            <option value="rectangular">Rectangular</option>
            <option value="gaussian">Gaussian</option>
            <option value="smooth-top-hat">Smooth top-hat</option>
            <option value="triangular">Triangular ramp</option>
            <option value="traveling-sinusoid">Traveling sinusoid</option>
            <option value="standing-wave">Standing wave</option>
            <option value="carrier-envelope">Carrier-envelope packet</option>
            <option value="multi-tone">Two-tone superposition</option>
            <option value="piezo-window">Prescribed piezo-like strain window</option>
            <option value="piezo-trough">Prescribed piezo-like strain trough</option>
            <option value="piezo-array">Prescribed piezo array</option>
          </select>
        </label>
        {design.strainShape === 'piezo-array' ? (
          <>
            <HybridNumber label="Actuator count" value={design.actuatorCount} min={1} step={1} integer disabled={!isActiveMode} onChange={(actuatorCount) => updateDesign({ actuatorCount })} />
            <HybridNumber label="Actuator pitch (mm)" value={design.actuatorPitchMm} min={0.001} step={0.1} disabled={!isActiveMode} onChange={(actuatorPitchMm) => updateDesign({ actuatorPitchMm })} />
            <HybridNumber label="Active actuator" value={design.activeActuatorIndex} min={0} max={Math.max(0, design.actuatorCount - 1)} step={1} integer disabled={!isActiveMode} onChange={(activeActuatorIndex) => updateDesign({ activeActuatorIndex })} />
            <HybridNumber label="Command amplitude" value={design.actuatorCommandAmplitude} step={0.1} disabled={!isActiveMode} onChange={(actuatorCommandAmplitude) => updateDesign({ actuatorCommandAmplitude })} />
            <HybridNumber label="Adjacent command" value={design.actuatorAdjacentCommandAmplitude} step={0.1} disabled={!isActiveMode} onChange={(actuatorAdjacentCommandAmplitude) => updateDesign({ actuatorAdjacentCommandAmplitude })} />
            <label className="field">
              <span>Array polarity</span>
              <select
                value={design.actuatorPolarity}
                disabled={!isActiveMode}
                onChange={(event) => updateDesign({ actuatorPolarity: event.target.value as HybridBraggDesignInputs['actuatorPolarity'] })}
              >
                <option value="window">Positive window</option>
                <option value="trough">Biased trough</option>
              </select>
            </label>
          </>
        ) : null}
        {usesWave ? <HybridNumber label="Wave period (mm)" value={design.perturbationPeriodMm} min={0.001} step={0.1} disabled={!isActiveMode} onChange={(perturbationPeriodMm) => updateDesign({ perturbationPeriodMm })} /> : null}
        {usesWave ? <HybridNumber label="Spatial phase (rad)" value={design.perturbationPhaseRadians} step={0.1} disabled={!isActiveMode} onChange={(perturbationPhaseRadians) => updateDesign({ perturbationPhaseRadians })} /> : null}
        {usesWave ? <HybridNumber label="Time phase (rad)" value={design.perturbationTemporalPhaseRadians} step={0.1} disabled={!isActiveMode} onChange={(perturbationTemporalPhaseRadians) => updateDesign({ perturbationTemporalPhaseRadians })} /> : null}
        {usesWave ? <HybridNumber label="Velocity (m/s)" value={design.perturbationVelocityMps} min={0} step={100} disabled={!isActiveMode} onChange={(perturbationVelocityMps) => updateDesign({ perturbationVelocityMps })} /> : null}
        {usesSecondaryWave ? <HybridNumber label="Second period (mm)" value={design.perturbationSecondaryPeriodMm} min={0.001} step={0.1} disabled={!isActiveMode} onChange={(perturbationSecondaryPeriodMm) => updateDesign({ perturbationSecondaryPeriodMm })} /> : null}
        {usesSecondaryWave ? <HybridNumber label="Second amplitude" value={design.perturbationSecondaryAmplitudeRatio} min={0} step={0.1} disabled={!isActiveMode} onChange={(perturbationSecondaryAmplitudeRatio) => updateDesign({ perturbationSecondaryAmplitudeRatio })} /> : null}
        {usesSecondaryWave ? <HybridNumber label="Second phase (rad)" value={design.perturbationSecondaryPhaseRadians} step={0.1} disabled={!isActiveMode} onChange={(perturbationSecondaryPhaseRadians) => updateDesign({ perturbationSecondaryPhaseRadians })} /> : null}
        <HybridNumber label="Photoelastic pe" value={design.effectivePhotoelasticCoefficient} step={0.01} disabled={!isActiveMode} onChange={(effectivePhotoelasticCoefficient) => updateDesign({ effectivePhotoelasticCoefficient })} />
        <HybridNumber label="Segments" value={design.segmentCount} min={1} step={1} integer disabled={!isActiveMode} onChange={(segmentCount) => updateDesign({ segmentCount })} />
        <HybridNumber label="Laser wavelength (nm)" value={design.fixedLaserWavelengthNm} min={1} step={0.001} disabled={!isActiveMode} onChange={(fixedLaserWavelengthNm) => updateDesign({ fixedLaserWavelengthNm })} />
          </div>
        </details>
        <details className="control-group">
          <summary>Spatial Addressing Playback</summary>
          <div className="form-grid form-grid-global acoustic-form">
        <HybridNumber label="Pulse sweep start (mm)" value={design.pulseSweepStartMm} min={0} step={0.1} disabled={!isActiveMode} onChange={(pulseSweepStartMm) => updateDesign({ pulseSweepStartMm })} />
        <HybridNumber label="Pulse sweep end (mm)" value={design.pulseSweepEndMm} min={0} step={0.1} disabled={!isActiveMode} onChange={(pulseSweepEndMm) => updateDesign({ pulseSweepEndMm })} />
        <HybridNumber label="Pulse positions" value={design.pulseSweepPointCount} min={2} step={1} integer disabled={!isActiveMode} onChange={(pulseSweepPointCount) => updateDesign({ pulseSweepPointCount })} />
          </div>
        </details>
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
  max,
  step = 0.001,
  integer = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <FormattedNumberInput
        min={min}
        max={max}
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
