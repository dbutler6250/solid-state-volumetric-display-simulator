import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { QuarterWaveStackForm } from './inputs/QuarterWaveStackForm';
import { MetricsPanel } from './outputs/MetricsPanel';
import { StackDefinitionPanel } from './outputs/StackDefinitionPanel';
import { ParameterSweepChart } from '../plots/ParameterSweepChart';
import { ReflectanceChart } from '../plots/ReflectanceChart';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
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
  pointCount: 9,
};
const DEFAULT_PARAMETER_SWEEP_WARNING =
  'Caution: Center wavelength may fall outside of wavelength sweep, resulting in poor data.';
const DEFAULT_INCIDENT_ANGLE_SWEEP = {
  start: 0,
  end: 89,
  pointCount: 89,
} as const;
const MAX_INCIDENT_ANGLE_DEGREES = 89.9;
const DEFAULT_PERIOD_SWEEP_HALF_RANGE = 100;

/** Coordinates inputs, solver execution, exports, imports, and chart controls. */
export function SimulationShell() {
  const [inputs, setInputs] = useState(DEFAULT_QUARTER_WAVE_STACK_INPUTS);
  const [showTransmission, setShowTransmission] = useState(false);
  const [xRange, setXRange] = useState<[number, number] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [parameterSweep, setParameterSweep] =
    useState<ParameterSweepSettings>(DEFAULT_PARAMETER_SWEEP);
  const [parameterSweepResult, setParameterSweepResult] = useState<ParameterSweepResult | null>(
    null,
  );
  const [parameterSweepError, setParameterSweepError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
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
      updateParameterSweep({
        parameter,
        ...DEFAULT_INCIDENT_ANGLE_SWEEP,
      });
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
            pointCount: parameterSweep.pointCount,
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
          />
          <section className="parameter-sweep-panel" aria-label="Parameter sweep controls">
            <h2>Parameter Sweep</h2>
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
                <span>Start</span>
                <input
                  type="number"
                  min={parameterSweep.parameter === 'incidentAngleDegrees' ? 0 : 1}
                  max={parameterSweep.parameter === 'incidentAngleDegrees' ? MAX_INCIDENT_ANGLE_DEGREES : undefined}
                  step={parameterSweep.parameter === 'incidentAngleDegrees' ? 1 : 1}
                  value={effectiveParameterSweep.start}
                  readOnly={parameterSweep.parameter === 'designWavelengthNm'}
                  onChange={(event) =>
                    updateParameterSweep({
                      ...parameterSweep,
                      start: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>End</span>
                <input
                  type="number"
                  min={parameterSweep.parameter === 'incidentAngleDegrees' ? 0 : 1}
                  max={parameterSweep.parameter === 'incidentAngleDegrees' ? MAX_INCIDENT_ANGLE_DEGREES : undefined}
                  step={parameterSweep.parameter === 'incidentAngleDegrees' ? 1 : 1}
                  value={effectiveParameterSweep.end}
                  readOnly={parameterSweep.parameter === 'designWavelengthNm'}
                  onChange={(event) =>
                    updateParameterSweep({
                      ...parameterSweep,
                      end: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Points</span>
                <input
                  type="number"
                  min="2"
                  step="1"
                  value={effectiveParameterSweep.pointCount}
                  onChange={(event) =>
                    updateParameterSweep({
                      ...parameterSweep,
                      pointCount: Number(event.target.value),
                    })
                  }
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
        </aside>

        <section className="chart-panel" aria-label="Simulation outputs">
          <div className="chart-heading">
            <h2>Spectrum</h2>
            <div className="chart-toolbar">
              <div className="chart-button-group" role="group" aria-label="Chart Controls">
                {/*
                <button
                  type="button"
                  onClick={centerOnBandwidth}
                  disabled={!result || result.bandwidthNm <= 0}
                >
                  Center on Bandwidth
                </button>
                <button type="button" onClick={resetView} disabled={!xRange}>
                  Reset View
                </button>
                */}
                <button type="button" onClick={exportCsv} disabled={!result}>
                  Export Spectrum CSV
                </button>
                <button type="button" onClick={openImportPicker}>
                  Import Setup
                </button>
                <button
                  type="button"
                  onClick={exportSetup}
                  disabled={validationIssues.length > 0}
                >
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
              <label className="toggle-control">
                <input
                  type="checkbox"
                  checked={showTransmission}
                  onChange={(event) => setShowTransmission(event.target.checked)}
                />
                <span>Transmission</span>
              </label>
            </div>
          </div>
          {importError ? (
            <p className="chart-toolbar-message" role="alert">
              {importError}
            </p>
          ) : validationIssues.length > 0 ? (
            <p className="chart-toolbar-message">Fix highlighted inputs before exporting setup.</p>
          ) : null}
          <ReflectanceChart result={result} showTransmission={showTransmission} xRange={xRange} />
          <section className="sweep-chart-section" aria-label="Parameter sweep results">
            <div className="sweep-chart-heading">
              <h2>Parameter Sweep Results</h2>
              <button type="button" onClick={exportSweepCsv} disabled={!parameterSweepResult}>
                Export Sweep CSV
              </button>
            </div>
            <ParameterSweepChart result={parameterSweepResult} />
          </section>
          <MetricsPanel result={result} />
          <StackDefinitionPanel inputs={inputs} isValid={validationIssues.length === 0} />
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
  if (settings.parameter === 'periodCount') {
    return settings;
  }

  if (settings.parameter === 'incidentAngleDegrees') {
    return {
      ...settings,
      start: Math.max(0, settings.start),
      end: Math.min(MAX_INCIDENT_ANGLE_DEGREES, settings.end),
    };
  }

  return {
    ...settings,
    start: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
    end: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
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
