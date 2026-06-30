import { useMemo, useState } from 'react';
import { BraggReflectorForm } from './inputs/BraggReflectorForm';
import { AssumptionsPanel } from './outputs/AssumptionsPanel';
import { MetricsPanel } from './outputs/MetricsPanel';
import { StackDefinitionPanel } from './outputs/StackDefinitionPanel';
import { ReflectanceChart } from '../plots/ReflectanceChart';
import { DEFAULT_BRAGG_REFLECTOR_INPUTS } from '../simulation/structures/braggReflector';
import { solveBraggReflector } from '../simulation/solvers/transferMatrix';
import { validateBraggReflectorInputs } from '../simulation/validation/braggReflectorValidation';

const MIN_WAVELENGTH_NM = 1;
const MIN_SPECTRUM_SPAN_NM = 1;
const MIN_SWEEP_MULTIPLIER = 1;
const MAX_SWEEP_MULTIPLIER = 5;

export function SimulationShell() {
  const [inputs, setInputs] = useState(DEFAULT_BRAGG_REFLECTOR_INPUTS);
  const [showTransmission, setShowTransmission] = useState(false);
  const validationIssues = useMemo(() => validateBraggReflectorInputs(inputs), [inputs]);
  const result = useMemo(() => {
    if (validationIssues.length > 0) {
      return null;
    }

    return solveBraggReflector(inputs);
  }, [inputs, validationIssues]);

  const centerSweepOnBandwidth = () => {
    if (!result || result.bandwidthNm <= 0) {
      return;
    }

    const normalizedBandwidth = result.bandwidthNm / inputs.designWavelengthNm;
    const sweepMultiplier = clamp(
      MAX_SWEEP_MULTIPLIER - normalizedBandwidth * (MAX_SWEEP_MULTIPLIER - MIN_SWEEP_MULTIPLIER),
      MIN_SWEEP_MULTIPLIER,
      MAX_SWEEP_MULTIPLIER,
    );
    const halfWindow = (result.bandwidthNm * sweepMultiplier) / 2;
    const startNm = Math.max(MIN_WAVELENGTH_NM, result.centerWavelengthNm - halfWindow);
    const endNm = Math.max(startNm + MIN_SPECTRUM_SPAN_NM, result.centerWavelengthNm + halfWindow);

    setInputs({
      ...inputs,
      wavelengthStartNm: startNm,
      wavelengthEndNm: endNm,
    });
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Solid State Volumetric Display Simulator</h1>
        <p>
          Version 1 foundation for a browser-based Transfer Matrix Method Bragg
          reflector simulator.
        </p>
      </header>

      <section className="workspace" aria-label="Bragg reflector simulator">
        <aside className="panel" aria-label="Simulation inputs">
          <h2>Bragg Reflector Inputs</h2>
          <BraggReflectorForm
            inputs={inputs}
            validationIssues={validationIssues}
            onChange={setInputs}
          />
          <AssumptionsPanel />
        </aside>

        <section className="chart-panel" aria-label="Simulation outputs">
          <div className="chart-heading">
            <h2>Spectrum</h2>
            <div className="chart-controls">
              <button
                type="button"
                onClick={centerSweepOnBandwidth}
                disabled={!result || result.bandwidthNm <= 0}
              >
                Center on Bandwidth
              </button>
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
          <ReflectanceChart result={result} showTransmission={showTransmission} />
          <MetricsPanel result={result} />
          <StackDefinitionPanel inputs={inputs} isValid={validationIssues.length === 0} />
        </section>
      </section>
    </main>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
