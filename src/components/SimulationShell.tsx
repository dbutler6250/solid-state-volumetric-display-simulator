import { useMemo, useState } from 'react';
import { BraggReflectorForm } from './inputs/BraggReflectorForm';
import { AssumptionsPanel } from './outputs/AssumptionsPanel';
import { MetricsPanel } from './outputs/MetricsPanel';
import { ReflectanceChart } from '../plots/ReflectanceChart';
import { DEFAULT_BRAGG_REFLECTOR_INPUTS } from '../simulation/structures/braggReflector';
import { solveBraggReflector } from '../simulation/solvers/transferMatrix';
import { validateBraggReflectorInputs } from '../simulation/validation/braggReflectorValidation';

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
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={showTransmission}
                onChange={(event) => setShowTransmission(event.target.checked)}
              />
              <span>Transmission</span>
            </label>
          </div>
          <ReflectanceChart result={result} showTransmission={showTransmission} />
          <MetricsPanel result={result} />
        </section>
      </section>
    </main>
  );
}
