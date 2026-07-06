import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { BraggReflectorForm } from './inputs/BraggReflectorForm';
import { AssumptionsPanel } from './outputs/AssumptionsPanel';
import { MetricsPanel } from './outputs/MetricsPanel';
import { StackDefinitionPanel } from './outputs/StackDefinitionPanel';
import { ReflectanceChart } from '../plots/ReflectanceChart';
import { DEFAULT_BRAGG_REFLECTOR_INPUTS } from '../simulation/structures/braggReflector';
import { solveBraggReflector } from '../simulation/solvers/transferMatrix';
import { validateBraggReflectorInputs } from '../simulation/validation/braggReflectorValidation';
import { exportBraggConfigJson } from '../io/exportBraggConfigJson';
import { exportResultsCsv } from '../io/exportResultsCsv';
import { downloadTextFile } from '../io/download';
import { importBraggConfigJson } from '../io/importBraggConfigJson';

const MIN_WAVELENGTH_NM = 1;
const MIN_VIEW_MULTIPLIER = 0.5;
const MAX_VIEW_MULTIPLIER = 5;

export function SimulationShell() {
  const [inputs, setInputs] = useState(DEFAULT_BRAGG_REFLECTOR_INPUTS);
  const [showTransmission, setShowTransmission] = useState(false);
  const [xRange, setXRange] = useState<[number, number] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const validationIssues = useMemo(() => validateBraggReflectorInputs(inputs), [inputs]);
  const result = useMemo(() => {
    if (validationIssues.length > 0) {
      return null;
    }

    return solveBraggReflector(inputs);
  }, [inputs, validationIssues]);

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

  const exportCsv = () => {
    if (!result) {
      return;
    }

    const csv = exportResultsCsv(inputs, result);
    const filename = `bragg-results-${formatDateStamp(new Date())}.csv`;
    downloadTextFile(filename, csv);
  };

  const exportSetup = () => {
    if (validationIssues.length > 0) {
      return;
    }

    const json = exportBraggConfigJson(inputs);
    const filename = `bragg-setup-${formatDateStamp(new Date())}.json`;
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
      const imported = importBraggConfigJson(await file.text());

      if (!imported.ok) {
        setImportError(imported.message);
        return;
      }

      setInputs(imported.inputs);
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

      <section className="workspace" aria-label="Bragg reflector simulator">
        <aside className="panel" aria-label="Simulation inputs">
          <h2>Optical Stack Inputs</h2>
          <BraggReflectorForm
            inputs={inputs}
            validationIssues={validationIssues}
            centerWavelengthNm={result?.centerWavelengthNm}
            onChange={setInputs}
          />
          <AssumptionsPanel />
        </aside>

        <section className="chart-panel" aria-label="Simulation outputs">
          <div className="chart-heading">
            <h2>Spectrum</h2>
            <div className="chart-toolbar">
              <div className="chart-button-group" role="group" aria-label="Chart Controls">
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
                <button type="button" onClick={exportCsv} disabled={!result}>
                  Export CSV
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatDateStamp(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}
