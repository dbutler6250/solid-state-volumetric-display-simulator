import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { QuarterWaveStackForm } from './inputs/QuarterWaveStackForm';
import { applyCenteredSweepRange } from './inputs/quarterWaveStackFormState';
import { FormattedNumberInput } from './inputs/FormattedNumberInput';
import {
  FIXED_INCIDENT_ANGLE_SWEEP,
  getEffectiveParameterSweep,
  getMaximumAcousticPeriodCount,
} from './parameterSweepSettings';
import { MetricsPanel } from './outputs/MetricsPanel';
import { AcousticGeneratorPanel } from './outputs/AcousticGeneratorPanel';
import { StackDefinitionPanel } from './outputs/StackDefinitionPanel';
import { ReflectanceVolumePanel } from './outputs/ReflectanceVolumePanel';
import { StlSlicerPanel } from './outputs/StlSlicerPanel';
import { ParameterSweepChart } from '../plots/ParameterSweepChart';
import { ReflectanceHeatmapChart } from '../plots/ReflectanceHeatmapChart';
import { ReflectanceChart } from '../plots/ReflectanceChart';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import {
  solveQuarterWaveStackParameterSweepAsync,
  solveSimulationDocumentReflectanceHeatmapAsync,
  solveResolvedStructureAsync,
} from '../simulation/solvers/transferMatrix';
import {
  createSimulationDocument,
  resolveSimulationDocument,
  resolveSimulationDocumentAsync,
  type ResolvedStructure,
} from '../simulation/structures/structureResolver';
import {
  createSimulationWorkspaceState,
  getActiveInputs,
  simulationWorkspaceReducer,
} from './simulationWorkspaceState';
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
  ReflectanceHeatmapResult,
  SimulationDocument,
  SimulationResult,
  SweepParameter,
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
const MAX_INCIDENT_ANGLE_DEGREES = 89.9;
const DEFAULT_PERIOD_SWEEP_HALF_RANGE = 100;
const ACOUSTIC_SOLVE_DEBOUNCE_MS = 150;
export const OUTPUT_TABS = ['spectrum', 'parameter-sweep', 'stack-definition', 'reflectance-volume', 'stl-slicer'] as const;
type OutputTab = (typeof OUTPUT_TABS)[number];

const formatParameterSweepInput = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toString() : '';

/** Coordinates inputs, solver execution, exports, imports, and chart controls. */
export function SimulationShell() {
  const [workspaceState, dispatchWorkspace] = useReducer(
    simulationWorkspaceReducer,
    DEFAULT_QUARTER_WAVE_STACK_INPUTS,
    createSimulationWorkspaceState,
  );
  const inputs = getActiveInputs(workspaceState);
  const setInputs = (nextInputs: QuarterWaveStackInputs) =>
    dispatchWorkspace({ type: 'update-active', inputs: nextInputs });
  const [showTransmission, setShowTransmission] = useState(false);
  const [activeTab, setActiveTab] = useState<OutputTab>('spectrum');
  const [xRange, setXRange] = useState<[number, number] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [parameterSweepRows, setParameterSweepRows] = useState<Partial<Record<SweepParameter, ParameterSweepSettings>>>({});
  const [parameterSweepResult, setParameterSweepResult] = useState<ParameterSweepResult | null>(
    null,
  );
  const [parameterSweepError, setParameterSweepError] = useState<string | null>(null);
  const [parameterSweepIsSolving, setParameterSweepIsSolving] = useState(false);
  const [heatmapSelection, setHeatmapSelection] = useState<{ xParameter: SweepParameter; yParameter: SweepParameter } | null>(null);
  const [heatmapResult, setHeatmapResult] = useState<ReflectanceHeatmapResult | null>(null);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [heatmapIsSolving, setHeatmapIsSolving] = useState(false);
  const [referenceRangeError, setReferenceRangeError] = useState<string | null>(null);
  const [opticalResult, setOpticalResult] = useState<SimulationResult | null>(null);
  const [opticalSolveError, setOpticalSolveError] = useState<string | null>(null);
  const [acousticSolveError, setAcousticSolveError] = useState<string | null>(null);
  const opticalRequestId = useRef(0);
  const [acousticOutput, setAcousticOutput] = useState<{
    document: SimulationDocument;
    resolved: ResolvedStructure;
    result: SimulationResult | null;
  } | null>(null);
  const acousticRequestId = useRef(0);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<Record<OutputTab, HTMLButtonElement | null>>({
    spectrum: null,
    'parameter-sweep': null,
    'stack-definition': null,
    'reflectance-volume': null,
    'stl-slicer': null,
  });
  const validationIssues = useMemo(() => validateQuarterWaveStackInputs(inputs), [inputs]);
  const simulationDocument = useMemo(
    () => validationIssues.length === 0 ? createSimulationDocument(inputs) : null,
    [inputs, validationIssues],
  );
  const opticalResolvedStructure = useMemo(
    () => simulationDocument?.structure.type === 'quarter-wave-stack'
      ? resolveSimulationDocument(simulationDocument)
      : null,
    [simulationDocument],
  );
  const resolvedStructure = simulationDocument?.structure.type === 'acousto-optic-grating'
    ? acousticOutput?.document === simulationDocument ? acousticOutput.resolved : null
    : opticalResolvedStructure;
  const referenceOutsideRange =
    resolvedStructure !== null &&
    (resolvedStructure.referenceWavelengthNm < (inputs.wavelengthStartNm ?? 0) ||
      resolvedStructure.referenceWavelengthNm > (inputs.wavelengthEndNm ?? Number.POSITIVE_INFINITY));
  const result = simulationDocument?.structure.type === 'acousto-optic-grating'
    ? acousticOutput?.document === simulationDocument ? acousticOutput.result : null
    : opticalResult;
  const supportedHeatmapParameters = useMemo(
    () => resolvedStructure?.sweepParameters ?? [],
    [resolvedStructure],
  );

  useEffect(() => {
    if (simulationDocument?.structure.type !== 'acousto-optic-grating') return;

    const requestId = ++acousticRequestId.current;
    const controller = new AbortController();
    setAcousticSolveError(null);
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const resolved = await resolveSimulationDocumentAsync(
            simulationDocument,
            controller.signal,
          );
          if (controller.signal.aborted || requestId !== acousticRequestId.current) return;
          setAcousticOutput({ document: simulationDocument, resolved, result: null });
          const nextResult = await solveResolvedStructureAsync(
            resolved,
            simulationDocument.analysis,
            { signal: controller.signal },
          );
          if (controller.signal.aborted || requestId !== acousticRequestId.current) return;
          setAcousticOutput({ document: simulationDocument, resolved, result: nextResult });
        } catch (error) {
          if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
            return;
          }
          setAcousticSolveError(
            error instanceof Error ? error.message : 'The acoustic spectrum could not be calculated.',
          );
        }
      })();
    }, ACOUSTIC_SOLVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [simulationDocument]);

  useEffect(() => {
    if (!simulationDocument || simulationDocument.structure.type === 'acousto-optic-grating' || !opticalResolvedStructure) {
      setOpticalResult(null);
      setOpticalSolveError(null);
      return;
    }

    const requestId = ++opticalRequestId.current;
    setOpticalSolveError(null);
    setOpticalResult(null);

    void (async () => {
      try {
        const nextResult = await solveResolvedStructureAsync(opticalResolvedStructure, simulationDocument.analysis);
        if (requestId !== opticalRequestId.current) return;
        setOpticalResult(nextResult);
      } catch (error) {
        if (requestId !== opticalRequestId.current) return;
        setOpticalSolveError(
          error instanceof Error ? error.message : 'The spectrum could not be calculated.',
        );
      }
    })();

    return () => {
      opticalRequestId.current += 1;
    };
  }, [opticalResolvedStructure, simulationDocument]);

  useEffect(() => {
    setParameterSweepResult(null);
    setParameterSweepError(null);
    setHeatmapResult(null);
    setHeatmapError(null);
    setHeatmapIsSolving(false);
    setReferenceRangeError(null);
  }, [inputs]);

  useEffect(() => {
    if (supportedHeatmapParameters.length === 0) {
      setParameterSweepRows({});
      setHeatmapSelection(null);
      return;
    }

    setParameterSweepRows((current) => {
      const nextRows: Partial<Record<SweepParameter, ParameterSweepSettings>> = {};

      for (const parameter of supportedHeatmapParameters) {
        const currentRow = current[parameter];
        if (currentRow && currentRow.parameter === parameter) {
          nextRows[parameter] = currentRow;
          continue;
        }

        nextRows[parameter] = getDefaultSweepSettings(inputs, parameter);
      }

      return nextRows;
    });

    setHeatmapSelection((current) => {
      if (
        current &&
        supportedHeatmapParameters.includes(current.xParameter) &&
        supportedHeatmapParameters.includes(current.yParameter) &&
        current.xParameter !== current.yParameter
      ) {
        return current;
      }

      if (supportedHeatmapParameters.length < 2) {
        return null;
      }

      const [xParameter, yParameter] = supportedHeatmapParameters;
      return {
        xParameter,
        yParameter,
      };
    });
  }, [inputs, supportedHeatmapParameters]);

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

  const updateParameterRow = (parameter: SweepParameter, nextSettings: ParameterSweepSettings) => {
    setParameterSweepRows((current) => ({
      ...current,
      [parameter]: nextSettings,
    }));
    setParameterSweepResult(null);
    setParameterSweepError(null);
    setHeatmapResult(null);
    setHeatmapError(null);
  };

  const runParameterSweep = (parameter: SweepParameter) => {
    const row = parameterSweepRows[parameter];
    if (!row) {
      setParameterSweepError('Resolve the sweep rows before running a parameter sweep.');
      return;
    }

    if (validationIssues.length > 0) {
      setParameterSweepError('Fix highlighted inputs before running a parameter sweep.');
      return;
    }

    const currentRow = getEffectiveParameterSweep(inputs, row);
    setParameterSweepIsSolving(true);
    setParameterSweepError(null);
    void (async () => {
      try {
        setParameterSweepResult(
          await solveQuarterWaveStackParameterSweepAsync(inputs, currentRow),
        );
      } catch (error) {
        setParameterSweepResult(null);
        setParameterSweepError(
          error instanceof Error ? error.message : 'The parameter sweep could not be completed.',
        );
      } finally {
        setParameterSweepIsSolving(false);
      }
    })();
  };

  const runHeatmap = () => {
    void (async () => {
    if (validationIssues.length > 0) {
      setHeatmapError('Fix highlighted inputs before running a heatmap.');
      return;
    }

    if (!simulationDocument || !heatmapSelection) {
      setHeatmapError('Resolve a valid stack before running a heatmap.');
      return;
    }

    const xAxis = parameterSweepRows[heatmapSelection.xParameter];
    const yAxis = parameterSweepRows[heatmapSelection.yParameter];
    if (!xAxis || !yAxis) {
      setHeatmapError('Resolve the selected heatmap rows before running a heatmap.');
      return;
    }

    try {
      setHeatmapIsSolving(true);
      setHeatmapResult(await solveSimulationDocumentReflectanceHeatmapAsync(simulationDocument, { xAxis, yAxis }));
      setHeatmapError(null);
    } catch (error) {
      setHeatmapResult(null);
      setHeatmapError(error instanceof Error ? error.message : 'The heatmap could not be completed.');
    } finally {
      setHeatmapIsSolving(false);
    }
    })();
  };

  const exportCsv = () => {
    if (!result) {
      return;
    }

    const csv = exportResultsCsv(inputs, result, resolvedStructure ?? undefined);
    const filename = `stack-results-${formatDateStamp(new Date())}.csv`;
    downloadTextFile(filename, csv);
  };

  const exportSweepCsv = () => {
    if (!parameterSweepResult) {
      return;
    }

    const csv = exportParameterSweepCsv(inputs, parameterSweepResult.settings, parameterSweepResult, resolvedStructure ?? undefined);
    const filename = `parameter-sweep-${formatDateStamp(new Date())}.csv`;
    downloadTextFile(filename, csv);
  };

  const exportSetup = () => {
    if (validationIssues.length > 0) {
      return;
    }

    const json = exportStackConfigJson(inputs, parameterSweepRows, heatmapSelection ?? undefined);
    const filename = `stack-setup-${formatDateStamp(new Date())}.json`;
    downloadTextFile(filename, json, 'application/json');
  };

  const recenterAnalysisRange = () => {
    if (!resolvedStructure) return;
    try {
      setInputs(
        applyCenteredSweepRange(
          inputs,
          resolvedStructure.referenceWavelengthNm,
          Math.max(10, (inputs.wavelengthEndNm ?? 900) - (inputs.wavelengthStartNm ?? 300)),
        ),
      );
      setReferenceRangeError(null);
    } catch (error) {
      setReferenceRangeError(
        error instanceof Error ? error.message : 'The reference wavelength cannot be represented safely.',
      );
    }
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

      dispatchWorkspace({ type: 'import', inputs: imported.inputs });
      setInputResetKey((current) => current + 1);
      if (imported.parameterSweeps) {
        setParameterSweepRows(imported.parameterSweeps);
      } else if (imported.parameterSweep) {
        setParameterSweepRows({ [imported.parameterSweep.parameter]: imported.parameterSweep });
      } else {
        setParameterSweepRows({});
      }
      setHeatmapSelection(imported.heatmapSelection ?? null);
      setParameterSweepResult(null);
      setParameterSweepError(null);
      setXRange(null);
      setReferenceRangeError(null);
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
            onModeChange={(mode) => dispatchWorkspace({ type: 'switch-mode', mode })}
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
                      : tab === 'stack-definition'
                        ? 'Stack Definition'
                        : tab === 'reflectance-volume'
                          ? '3D View'
                          : 'STL Slicer';
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
            {opticalSolveError ? (
              <p className="chart-toolbar-message" role="alert">{opticalSolveError}</p>
            ) : null}
            {acousticSolveError ? (
              <p className="chart-toolbar-message" role="alert">{acousticSolveError}</p>
            ) : null}
            {referenceOutsideRange && resolvedStructure ? (
              <div className="reference-range-warning" role="alert">
                <span>
                  The resolved reference wavelength ({resolvedStructure.referenceWavelengthNm.toFixed(1)} nm)
                  is outside the analysis range.
                </span>
                <button type="button" onClick={recenterAnalysisRange}>
                  Center analysis range
                </button>
              </div>
            ) : null}
            {referenceRangeError ? (
              <p className="chart-toolbar-message" role="alert">{referenceRangeError}</p>
            ) : null}
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
              {supportedHeatmapParameters.map((parameter) => (
                <ParameterSweepRowControls
                  key={parameter}
                  label={getSweepParameterLabel(parameter)}
                  inputs={inputs}
                  settings={parameterSweepRows[parameter] ?? getDefaultSweepSettings(inputs, parameter)}
                  inputKey={inputResetKey}
                  onChange={(nextSettings) => updateParameterRow(parameter, nextSettings)}
                  onRun={() => runParameterSweep(parameter)}
                  isRunning={parameterSweepIsSolving}
                />
              ))}
              {parameterSweepError ? (
                <p className="chart-toolbar-message" role="alert">
                  {parameterSweepError}
                </p>
              ) : parameterSweepResult ? (
                <p className="parameter-sweep-status" role="status">
                  Sweep complete: {parameterSweepResult.points.length} points evaluated for {getSweepParameterLabel(parameterSweepResult.settings.parameter)}.
                </p>
              ) : null}
            </section>
            <section className="heatmap-config-panel" aria-label="Heatmap controls">
              {heatmapSelection ? (
                <>
                  <div className="heatmap-axis-grid">
                    <label className="field heatmap-axis-selector">
                      <span>X Axis</span>
                      <select
                        value={heatmapSelection.xParameter}
                        onChange={(event) => {
                          const nextParameter = event.target.value as SweepParameter;
                          setHeatmapSelection((current) => {
                            if (!current) return current;
                            if (nextParameter === current.yParameter) {
                              const fallback = getDistinctHeatmapParameter(nextParameter, supportedHeatmapParameters);
                              return { xParameter: nextParameter, yParameter: fallback };
                            }
                            return { ...current, xParameter: nextParameter };
                          });
                          setHeatmapResult(null);
                          setHeatmapError(null);
                        }}
                      >
                        {supportedHeatmapParameters.map((parameter) => (
                          <option
                            key={parameter}
                            value={parameter}
                            disabled={parameter === heatmapSelection.yParameter}
                          >
                            {getSweepParameterLabel(parameter)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field heatmap-axis-selector">
                      <span>Y Axis</span>
                      <select
                        value={heatmapSelection.yParameter}
                        onChange={(event) => {
                          const nextParameter = event.target.value as SweepParameter;
                          setHeatmapSelection((current) => {
                            if (!current) return current;
                            if (nextParameter === current.xParameter) {
                              const fallback = getDistinctHeatmapParameter(nextParameter, supportedHeatmapParameters);
                              return { xParameter: fallback, yParameter: nextParameter };
                            }
                            return { ...current, yParameter: nextParameter };
                          });
                          setHeatmapResult(null);
                          setHeatmapError(null);
                        }}
                      >
                        {supportedHeatmapParameters.map((parameter) => (
                          <option
                            key={parameter}
                            value={parameter}
                            disabled={parameter === heatmapSelection.xParameter}
                          >
                            {getSweepParameterLabel(parameter)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="parameter-sweep-run heatmap-run-button"
                    onClick={runHeatmap}
                    disabled={validationIssues.length > 0 || heatmapIsSolving}
                  >
                    {heatmapIsSolving ? 'Running Heatmap...' : 'Run Heatmap'}
                  </button>
                  {heatmapIsSolving ? (
                    <p className="parameter-sweep-status" role="status">
                      Solving the heatmap asynchronously...
                    </p>
                  ) : null}
                  {heatmapError ? (
                    <p className="chart-toolbar-message" role="alert">
                      {heatmapError}
                    </p>
                  ) : heatmapResult ? (
                    <p className="parameter-sweep-status" role="status">
                      Heatmap complete: {heatmapResult.xAxis.values.length * heatmapResult.yAxis.values.length} points evaluated.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="chart-placeholder chart-placeholder-compact" role="status">
                  Resolve a valid stack first, then choose heatmap axes.
                </p>
              )}
            </section>
            <ReflectanceHeatmapChart result={heatmapResult} />
          </section>

          <section className="chart-panel" id="stack-definition-panel" role="tabpanel" aria-labelledby="stack-definition-tab" hidden={activeTab !== 'stack-definition'}>
            <StackDefinitionPanel
              inputs={inputs}
              isValid={validationIssues.length === 0}
              resolvedStructure={resolvedStructure}
            />
          </section>

          <section
            className="chart-panel"
            id="reflectance-volume-panel"
            role="tabpanel"
            aria-labelledby="reflectance-volume-tab"
            hidden={activeTab !== 'reflectance-volume'}
          >
            {simulationDocument && resolvedStructure && result ? (
              <ReflectanceVolumePanel
                document={simulationDocument}
                resolvedStructure={resolvedStructure}
                result={result}
              />
            ) : (
              <div className="chart-placeholder">
                <div>
                  <strong>3D view unavailable</strong>
                  <p>Resolve a valid stack first, then open the 3D View tab.</p>
                </div>
              </div>
            )}
          </section>

          <section
            className="chart-panel"
            id="stl-slicer-panel"
            role="tabpanel"
            aria-labelledby="stl-slicer-tab"
            hidden={activeTab !== 'stl-slicer'}
          >
            <StlSlicerPanel />
          </section>
        </section>
      </section>

      <section className="how-to-use-panel panel" aria-label="How To Use">
        <h2>How To Use</h2>
        <div className="how-to-use-panel-body">
          Choose Optical, Manual, or Acoustic input mode; configure the structure; then inspect the
          spectrum, heatmap, and Stack Definition. Parameter Sweep only lists fields that change the active
          physical structure. Import and export preserve the active structure and shared analysis range.
        </div>
      </section>
    </main>
  );
}

/*
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
*/

/** Chooses useful initial bounds for a supported structure-specific sweep. */
function getDefaultSweepSettings(
  inputs: QuarterWaveStackInputs,
  parameter: ParameterSweepSettings['parameter'],
): ParameterSweepSettings {
  if (parameter === 'incidentAngleDegrees') return FIXED_INCIDENT_ANGLE_SWEEP;
  if (parameter === 'periodCount') {
    return { parameter, ...getDefaultPeriodSweepBounds(inputs.periodCount), pointCount: 30 };
  }
  if (parameter === 'acousticPeriodCount') {
    const periods = inputs.acousticDesign?.acousticPeriodCount ?? 10;
    return {
      parameter,
      ...getDefaultPeriodSweepBounds(periods, getMaximumAcousticPeriodCount(inputs)),
      pointCount: 30,
    };
  }
  if (parameter === 'acousticFrequencyHz') {
    const frequency = inputs.acousticDesign?.acousticFrequencyHz ?? 1e9;
    return { parameter, start: frequency * 0.5, end: frequency * 1.5, pointCount: 30 };
  }
  if (parameter === 'acousticIndexModulation') {
    const modulation = inputs.acousticDesign?.acousticIndexModulation ?? 0.002;
    return { parameter, start: 0, end: Math.max(0.001, modulation * 2), pointCount: 30 };
  }
  return {
    parameter,
    start: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
    end: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
    pointCount: DEFAULT_PARAMETER_SWEEP.pointCount,
  };
}

function getSweepParameterLabel(parameter: ParameterSweepSettings['parameter']): string {
  const labels: Record<ParameterSweepSettings['parameter'], string> = {
    designWavelengthNm: 'Design wavelength',
    incidentAngleDegrees: 'Incident angle',
    periodCount: 'Periods',
    acousticFrequencyHz: 'Acoustic frequency',
    acousticPeriodCount: 'Acoustic periods',
    acousticIndexModulation: 'Peak index modulation',
  };
  return labels[parameter];
}

function getDistinctHeatmapParameter(
  parameter: ParameterSweepSettings['parameter'],
  supportedParameters: readonly ParameterSweepSettings['parameter'][],
): ParameterSweepSettings['parameter'] {
  return supportedParameters.find((candidate) => candidate !== parameter) ?? parameter;
}

type ParameterSweepRowControlsProps = {
  label: string;
  inputs: QuarterWaveStackInputs;
  settings: ParameterSweepSettings;
  inputKey: number;
  onChange: (settings: ParameterSweepSettings) => void;
  onRun: () => void;
  isRunning: boolean;
};

/** Renders one reusable sweep row for both parameter sweeps and heatmap inputs. */
function ParameterSweepRowControls({
  label,
  inputs,
  settings,
  inputKey,
  onChange,
  onRun,
  isRunning,
}: ParameterSweepRowControlsProps) {
  const isInteger = settings.parameter === 'periodCount' || settings.parameter === 'acousticPeriodCount';
  const isFixedAngle = settings.parameter === 'incidentAngleDegrees';
  const isLocked = isFixedAngle;
  const minimum = settings.parameter === 'incidentAngleDegrees' || settings.parameter === 'acousticIndexModulation'
    ? 0
    : 1;
  const maximum =
    settings.parameter === 'incidentAngleDegrees'
      ? MAX_INCIDENT_ANGLE_DEGREES
      : settings.parameter === 'acousticPeriodCount'
        ? getMaximumAcousticPeriodCount(inputs)
        : undefined;
  const boundsLabelSuffix = isFixedAngle ? ' (fixed)' : '';
  const pointsLocked = isInteger || isFixedAngle;
  return (
    <div className="parameter-sweep-row">
      <div className="parameter-sweep-row-heading">
        <h3>{label}</h3>
        <p>{isFixedAngle ? 'Fixed angle sweep' : isInteger ? 'Discrete parameter sweep' : 'Continuous parameter sweep'}</p>
      </div>
      <div className="parameter-sweep-grid">
        <label className="field">
          <span>{`Start${boundsLabelSuffix}`}</span>
          <FormattedNumberInput
            min={minimum}
            max={maximum}
            step="1"
            parseMode={isInteger ? 'integer' : 'decimal'}
            normalizeOnBlur={isInteger ? Math.round : undefined}
            value={settings.start}
            disabled={isLocked}
            formatInactive={formatParameterSweepInput}
            onValueChange={(start) => onChange({ ...settings, start })}
            resetKey={`${inputKey}:${settings.parameter}:start`}
            showStepper={!isLocked}
            stepperLabel={`${label.toLowerCase()} start`}
          />
        </label>
        <label className="field">
          <span>{`End${boundsLabelSuffix}`}</span>
          <FormattedNumberInput
            min={minimum}
            max={maximum}
            step="1"
            parseMode={isInteger ? 'integer' : 'decimal'}
            normalizeOnBlur={isInteger ? Math.round : undefined}
            value={settings.end}
            disabled={isLocked}
            formatInactive={formatParameterSweepInput}
            onValueChange={(end) => onChange({ ...settings, end })}
            resetKey={`${inputKey}:${settings.parameter}:end`}
            showStepper={!isLocked}
            stepperLabel={`${label.toLowerCase()} end`}
          />
        </label>
        <label className="field">
          <span>{pointsLocked ? 'Points (derived)' : 'Points'}</span>
          <FormattedNumberInput
            min={2}
            step="1"
            parseMode="integer"
            normalizeOnBlur={Math.round}
            value={settings.pointCount}
            disabled={pointsLocked}
            formatInactive={formatParameterSweepInput}
            onValueChange={(pointCount) => onChange({ ...settings, pointCount })}
            resetKey={`${inputKey}:${settings.parameter}:points`}
            showStepper={!pointsLocked}
            stepperLabel={`${label.toLowerCase()} points`}
          />
        </label>
      </div>
      <button type="button" className="parameter-sweep-run" onClick={onRun} disabled={isRunning}>
        {isRunning ? 'Running Sweep...' : 'Run Sweep'}
      </button>
      {isFixedAngle ? (
        <p className="parameter-sweep-warning" role="status">
          Caution: Center wavelength may fall outside of wavelength sweep, resulting in poor data.
        </p>
      ) : null}
    </div>
  );
}

/** Centers period-count sweep bounds around the current optical stack period count. */
function getDefaultPeriodSweepBounds(periodCount: number, maximum?: number) {
  const currentPeriodCount =
    Number.isFinite(periodCount) && periodCount > 0 ? Math.round(periodCount) : 1;

  return {
    start: Math.max(1, currentPeriodCount - DEFAULT_PERIOD_SWEEP_HALF_RANGE),
    end: Math.min(
      maximum ?? Number.POSITIVE_INFINITY,
      Math.max(2, currentPeriodCount + DEFAULT_PERIOD_SWEEP_HALF_RANGE),
    ),
  };
}

/** Formats a date stamp for exported filenames. */
function formatDateStamp(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
