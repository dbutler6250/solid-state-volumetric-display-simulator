import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { QuarterWaveStackForm } from './inputs/QuarterWaveStackForm';
import { FormattedNumberInput } from './inputs/FormattedNumberInput';
import {
  FIXED_INCIDENT_ANGLE_SWEEP,
  getInclusivePeriodPointCount,
} from './parameterSweepSettings';
import { MetricsPanel } from './outputs/MetricsPanel';
import { AcousticGeneratorPanel } from './outputs/AcousticGeneratorPanel';
import { StackDefinitionPanel } from './outputs/StackDefinitionPanel';
import { ParameterSweepChart } from '../plots/ParameterSweepChart';
import { ReflectanceChart } from '../plots/ReflectanceChart';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import { getResolvedStackInputs } from '../simulation/structures/quarterWaveStack';
import {
  solveQuarterWaveStack,
  solveQuarterWaveStackParameterSweep,
} from '../simulation/solvers/transferMatrix';
import { validateQuarterWaveStackInputs } from '../simulation/validation/quarterWaveStackValidation';
import { exportStackConfigJson } from '../io/exportStackConfigJson';
import { exportResultsCsv } from '../io/exportResultsCsv';
import { exportParameterSweepCsv } from '../io/exportParameterSweepCsv';
import { downloadTextFile } from '../io/download';
import { importStackConfigJson } from '../io/importStackConfigJson';
import type {
  ParameterSweepResult,
  ParameterSweepSettings,
  QuarterWaveStackInputs,
} from '../types/simulation';

/*
const MIN_WAVELENGTH_NM = 1;
const MIN_VIEW_MULTIPLIER = 0.5;
const MAX_VIEW_MULTIPLIER = 5;
*/
const DEFAULT_PARAMETER_SWEEP: ParameterSweepSettings = {
  parameter: 'designWavelengthNm',
  start: 450,
  end: 750,
  pointCount: 30,
};
const DEFAULT_PARAMETER_SWEEP_WARNING =
  'Caution: Center wavelength may fall outside of wavelength sweep, resulting in poor data.';
const MAX_INCIDENT_ANGLE_DEGREES = 89.9;
const DEFAULT_PERIOD_SWEEP_HALF_RANGE = 100;
const OUTPUT_TABS = ['spectrum', 'parameter-sweep', 'stack-definition'] as const;
type OutputTab = (typeof OUTPUT_TABS)[number];

const formatParameterSweepInput = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toString() : '';

/** Coordinates inputs, solver execution, exports, imports, and chart controls. */
export function SimulationShell() {
  const [inputs, setInputs] = useState(DEFAULT_QUARTER_WAVE_STACK_INPUTS);
  const [showTransmission, setShowTransmission] = useState(false);
  const [activeTab, setActiveTab] = useState<OutputTab>('spectrum');
  const [xRange, setXRange] = useState<[number, number] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [parameterSweep, setParameterSweep] =
    useState<ParameterSweepSettings>(DEFAULT_PARAMETER_SWEEP);
  const [parameterSweepResult, setParameterSweepResult] = useState<ParameterSweepResult | null>(
    null,
  );
  const [parameterSweepError, setParameterSweepError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<Record<OutputTab, HTMLButtonElement | null>>({
    spectrum: null,
    'parameter-sweep': null,
    'stack-definition': null,
  });
  const validationIssues = useMemo(() => validateQuarterWaveStackInputs(inputs), [inputs]);
  const parameterSweepWarning =
    parameterSweep.parameter === 'incidentAngleDegrees'
      ? DEFAULT_PARAMETER_SWEEP_WARNING
      : null;
  const result = useMemo(() => {
    if (validationIssues.length > 0) {
      return null;
    }

    return solveQuarterWaveStack(inputs);
  }, [inputs, validationIssues]);
  const effectiveParameterSweep = getEffectiveParameterSweep(inputs, parameterSweep);
  const parameterSweepIsReadOnly = parameterSweep.parameter === 'designWavelengthNm';
  const parameterSweepIsFixedAngle = parameterSweep.parameter === 'incidentAngleDegrees';
  const parameterSweepIsInteger = parameterSweep.parameter === 'periodCount';
  const parameterSweepBoundsLabelSuffix = parameterSweepIsReadOnly
    ? ' (derived)'
    : parameterSweepIsFixedAngle
      ? ' (fixed)'
      : '';
  const parameterSweepBoundsAreLocked = parameterSweepIsReadOnly || parameterSweepIsFixedAngle;
  const parameterSweepPointsAreLocked = parameterSweepIsInteger || parameterSweepIsFixedAngle;
  const parameterSweepMinimum = parameterSweep.parameter === 'incidentAngleDegrees' ? 0 : 1;
  const parameterSweepMaximum = parameterSweep.parameter === 'incidentAngleDegrees'
    ? MAX_INCIDENT_ANGLE_DEGREES
    : undefined;
  const parameterSweepResetKey = `${inputResetKey}:${parameterSweep.parameter}:${
    parameterSweepIsInteger ? inputs.periodCount : ''
  }`;

  useEffect(() => {
    if (parameterSweep.parameter !== 'periodCount') {
      return;
    }

    setParameterSweep((currentSettings) => ({
      ...currentSettings,
      ...getDefaultPeriodSweepBounds(inputs.periodCount),
    }));
  }, [inputs.periodCount, parameterSweep.parameter]);

  useEffect(() => {
    setParameterSweepResult(null);
    setParameterSweepError(null);
  }, [inputs]);

  /*
  const centerOnBandwidth = () => {
    if (!result || result.bandwidthNm <= 0) {
      return;
    }

    const normalizedBandwidth = result.bandwidthNm / inputs.designWavelengthNm;
    const sweepMultiplier = clamp(
      MAX_VIEW_MULTIPLIER - normalizedBandwidth * (MAX_VIEW_MULTIPLIER - MIN_VIEW_MULTIPLIER),
      MIN_VIEW_MULTIPLIER,
      MAX_VIEW_MULTIPLIER,
    );
    const halfWindow = (result.bandwidthNm * sweepMultiplier) / 2;
    const startNm = Math.max(MIN_WAVELENGTH_NM, result.centerWavelengthNm - halfWindow);
    const endNm = result.centerWavelengthNm + halfWindow;

    setXRange([startNm, Math.max(startNm + 1, endNm)]);
  };

  const resetView = () => {
    setXRange(null);
  };
  */

  const updateParameterSweep = (nextSettings: ParameterSweepSettings) => {
    setParameterSweep(nextSettings);
    setParameterSweepResult(null);
    setParameterSweepError(null);
  };

  const updateParameterSweepParameter = (parameter: ParameterSweepSettings['parameter']) => {
    if (parameter === 'incidentAngleDegrees') {
      updateParameterSweep(FIXED_INCIDENT_ANGLE_SWEEP);
      return;
    }

    updateParameterSweep(
      parameter === 'periodCount'
        ? {
            parameter,
            ...getDefaultPeriodSweepBounds(inputs.periodCount),
            pointCount: parameterSweep.pointCount,
          }
        : {
            parameter,
            start: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
            end: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
            pointCount: DEFAULT_PARAMETER_SWEEP.pointCount,
          },
    );
  };

  const runParameterSweep = () => {
    if (validationIssues.length > 0) {
      setParameterSweepError('Fix highlighted inputs before running a parameter sweep.');
      return;
    }

    try {
      setParameterSweepResult(
        solveQuarterWaveStackParameterSweep(inputs, effectiveParameterSweep),
      );
      setParameterSweepError(null);
    } catch (error) {
      setParameterSweepResult(null);
      setParameterSweepError(
        error instanceof Error ? error.message : 'The parameter sweep could not be completed.',
      );
    }
  };

  const exportCsv = () => {
    if (!result) {
      return;
    }

    const csv = exportResultsCsv(inputs, result);
    const filename = `stack-results-${formatDateStamp(new Date())}.csv`;
    downloadTextFile(filename, csv);
  };

  const exportSweepCsv = () => {
    if (!parameterSweepResult) {
      return;
    }

    const csv = exportParameterSweepCsv(inputs, effectiveParameterSweep, parameterSweepResult);
    const filename = `parameter-sweep-${formatDateStamp(new Date())}.csv`;
    downloadTextFile(filename, csv);
  };

  const exportSetup = () => {
    if (validationIssues.length > 0) {
      return;
    }

    const json = exportStackConfigJson(inputs, effectiveParameterSweep);
    const filename = `stack-setup-${formatDateStamp(new Date())}.json`;
    downloadTextFile(filename, json, 'application/json');
  };

  const openImportPicker = () => {
    importInputRef.current?.click();
  };

  const importSetup = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);

    if (!file) {
      event.target.value = '';
      return;
    }

    try {
      const imported = importStackConfigJson(await file.text());

      if (!imported.ok) {
        setImportError(imported.message);
        return;
      }

      setInputs(imported.inputs);
      setInputResetKey((current) => current + 1);
      if (imported.parameterSweep) {
        setParameterSweep(imported.parameterSweep);
      }
      setXRange(null);
      setImportError(null);
    } catch {
      setImportError('The selected file could not be read.');
    } finally {
      event.target.value = '';
    }
  };

  /** Selects and focuses tabs using the standard ARIA keyboard pattern. */
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: OutputTab) => {
    const currentIndex = OUTPUT_TABS.indexOf(tab);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % OUTPUT_TABS.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + OUTPUT_TABS.length) % OUTPUT_TABS.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = OUTPUT_TABS.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = OUTPUT_TABS[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Solid State Volumetric Display Simulator</h1>
        <p>
          Browser-based optics simulation platform for solid-state volumetric display design
        </p>
      </header>

      <section className="workspace" aria-label="Quarter-wave stack simulator">
        <aside className="panel" aria-label="Simulation inputs">
          <h2>Optical Stack Inputs</h2>
          <QuarterWaveStackForm
            inputs={inputs}
            validationIssues={validationIssues}
            onChange={setInputs}
            externalResetKey={inputResetKey}
          />
          {inputs.thicknessMode === 'acoustic' ? (
            <AcousticGeneratorPanel inputs={inputs} onChange={setInputs} />
          ) : null}
        </aside>

        <section className="output-area" aria-label="Simulation outputs">
          <div className="output-navigation">
            <div className="output-tabs" role="tablist" aria-label="Simulation output views">
              {OUTPUT_TABS.map((tab) => {
                const label =
                  tab === 'spectrum'
                    ? 'Spectrum'
                    : tab === 'parameter-sweep'
                      ? 'Parameter Sweep'
                      : 'Stack Definition';
                return (
                  <button
                    key={tab}
                    ref={(node) => {
                      tabRefs.current[tab] = node;
                    }}
                    id={`${tab}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`${tab}-panel`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    onClick={() => setActiveTab(tab)}
                    onKeyDown={(event) => handleTabKeyDown(event, tab)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="global-toolbar" role="group" aria-label="Setup actions">
              <button type="button" onClick={openImportPicker}>
                Import Setup
              </button>
              <button type="button" onClick={exportSetup} disabled={validationIssues.length > 0}>
                Export Setup
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={importSetup}
                hidden
              />
            </div>
          </div>
          {importError ? <p className="chart-toolbar-message" role="alert">{importError}</p> : null}

          <section
            className="chart-panel"
            id="spectrum-panel"
            role="tabpanel"
            aria-labelledby="spectrum-tab"
            hidden={activeTab !== 'spectrum'}
          >
            <div className="chart-heading">
              <h2>Spectrum</h2>
              <div className="chart-toolbar">
                <button type="button" className="action-button" onClick={exportCsv} disabled={!result}>
                  Export Spectrum CSV
                </button>
                <label className="toggle-control">
                  <input type="checkbox" checked={showTransmission} onChange={(event) => setShowTransmission(event.target.checked)} />
                  <span>Transmission</span>
                </label>
              </div>
            </div>
            <ReflectanceChart result={result} showTransmission={showTransmission} xRange={xRange} />
            <MetricsPanel result={result} />
            <section className="tab-controls" aria-label="Wavelength sweep controls">
              <QuarterWaveStackForm
                inputs={inputs}
                validationIssues={validationIssues}
                onChange={setInputs}
                section="sweep"
                externalResetKey={inputResetKey}
              />
            </section>
          </section>

          <section className="chart-panel" id="parameter-sweep-panel" role="tabpanel" aria-labelledby="parameter-sweep-tab" hidden={activeTab !== 'parameter-sweep'}>
            <div className="chart-heading">
              <h2>Parameter Sweep</h2>
              <button type="button" className="action-button" onClick={exportSweepCsv} disabled={!parameterSweepResult}>Export Sweep CSV</button>
            </div>
            <ParameterSweepChart result={parameterSweepResult} />
            <section className="parameter-sweep-panel tab-controls" aria-label="Parameter sweep controls">
            <label className="field">
              <span>Parameter</span>
              <select
                value={parameterSweep.parameter}
                onChange={(event) =>
                  updateParameterSweepParameter(
                    event.target.value as ParameterSweepSettings['parameter'],
                  )
                }
              >
                <option value="designWavelengthNm">Design wavelength</option>
                <option value="incidentAngleDegrees">Incident angle</option>
                <option value="periodCount">Periods</option>
              </select>
            </label>
            <div className="parameter-sweep-grid">
              <label className="field">
                <span>{`Start${parameterSweepBoundsLabelSuffix}`}</span>
                <FormattedNumberInput
                  min={parameterSweepMinimum}
                  max={parameterSweepMaximum}
                  step="1"
                  parseMode={parameterSweepIsInteger ? 'integer' : 'decimal'}
                  normalizeOnBlur={parameterSweepIsInteger ? Math.round : undefined}
                  value={effectiveParameterSweep.start}
                  readOnly={parameterSweepIsReadOnly}
                  disabled={parameterSweepIsFixedAngle}
                  formatInactive={formatParameterSweepInput}
                  onValueChange={(start) =>
                    updateParameterSweep({
                      ...parameterSweep,
                      start,
                    })
                  }
                  resetKey={parameterSweepResetKey}
                  showStepper={!parameterSweepBoundsAreLocked}
                  stepperLabel="parameter sweep start"
                />
              </label>
              <label className="field">
                <span>{`End${parameterSweepBoundsLabelSuffix}`}</span>
                <FormattedNumberInput
                  min={parameterSweepMinimum}
                  max={parameterSweepMaximum}
                  step="1"
                  parseMode={parameterSweepIsInteger ? 'integer' : 'decimal'}
                  normalizeOnBlur={parameterSweepIsInteger ? Math.round : undefined}
                  value={effectiveParameterSweep.end}
                  readOnly={parameterSweepIsReadOnly}
                  disabled={parameterSweepIsFixedAngle}
                  formatInactive={formatParameterSweepInput}
                  onValueChange={(end) =>
                    updateParameterSweep({
                      ...parameterSweep,
                      end,
                    })
                  }
                  resetKey={parameterSweepResetKey}
                  showStepper={!parameterSweepBoundsAreLocked}
                  stepperLabel="parameter sweep end"
                />
              </label>
              <label className="field">
                <span>{parameterSweepIsInteger ? 'Points (derived)' : parameterSweepIsFixedAngle ? 'Points (fixed)' : 'Points'}</span>
                <FormattedNumberInput
                  min={2}
                  step="1"
                  parseMode="integer"
                  normalizeOnBlur={Math.round}
                  value={effectiveParameterSweep.pointCount}
                  disabled={parameterSweepPointsAreLocked}
                  formatInactive={formatParameterSweepInput}
                  onValueChange={(pointCount) =>
                    updateParameterSweep({
                      ...parameterSweep,
                      pointCount,
                    })
                  }
                  resetKey={inputResetKey}
                  showStepper={!parameterSweepPointsAreLocked}
                  stepperLabel="parameter sweep points"
                />
              </label>
            </div>
            <button
              type="button"
              className="parameter-sweep-run"
              onClick={runParameterSweep}
              disabled={validationIssues.length > 0}
            >
              Run Sweep
            </button>
            {parameterSweepWarning ? (
              <p className="parameter-sweep-warning" role="status">
                {parameterSweepWarning}
              </p>
            ) : null}
            {parameterSweepError ? (
              <p className="chart-toolbar-message" role="alert">
                {parameterSweepError}
              </p>
            ) : parameterSweepResult ? (
              <p className="parameter-sweep-status" role="status">
                Sweep complete: {parameterSweepResult.points.length} points evaluated.
              </p>
            ) : null}
          </section>
          </section>

          <section className="chart-panel" id="stack-definition-panel" role="tabpanel" aria-labelledby="stack-definition-tab" hidden={activeTab !== 'stack-definition'}>
            <StackDefinitionPanel inputs={inputs} isValid={validationIssues.length === 0} />
          </section>
        </section>
      </section>

      <section className="how-to-use-panel panel" aria-label="How To Use">
        <h2>How To Use</h2>
        <div className="how-to-use-panel-body" aria-hidden="true" />
      </section>
    </main>
  );
}

/*
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
*/

/** Derives non-editable design-wavelength sweep bounds from the spectrum analysis range. */
function getEffectiveParameterSweep(
  inputs: QuarterWaveStackInputs,
  settings: ParameterSweepSettings,
): ParameterSweepSettings {
  const resolvedStackInputs = getResolvedStackInputs(inputs);

  if (settings.parameter === 'periodCount') {
    return {
      ...settings,
      pointCount: getInclusivePeriodPointCount(settings.start, settings.end),
    };
  }

  if (settings.parameter === 'incidentAngleDegrees') {
    return FIXED_INCIDENT_ANGLE_SWEEP;
  }

  return {
    ...settings,
    start: inputs.wavelengthStartNm ?? resolvedStackInputs.designWavelengthNm * 0.5,
    end: inputs.wavelengthEndNm ?? resolvedStackInputs.designWavelengthNm * 1.5,
  };
}

/** Centers period-count sweep bounds around the current optical stack period count. */
function getDefaultPeriodSweepBounds(periodCount: number) {
  const currentPeriodCount =
    Number.isFinite(periodCount) && periodCount > 0 ? Math.round(periodCount) : 1;

  return {
    start: Math.max(1, currentPeriodCount - DEFAULT_PERIOD_SWEEP_HALF_RANGE),
    end: Math.max(2, currentPeriodCount + DEFAULT_PERIOD_SWEEP_HALF_RANGE),
  };
}

/** Formats a date stamp for exported filenames. */
function formatDateStamp(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
