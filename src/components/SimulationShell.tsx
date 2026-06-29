import { useMemo, useState } from 'react';
import { BraggReflectorForm } from './inputs/BraggReflectorForm';
import { MetricsPanel } from './outputs/MetricsPanel';
import { ReflectanceChart } from '../plots/ReflectanceChart';
import { DEFAULT_BRAGG_REFLECTOR_INPUTS } from '../simulation/structures/braggReflector';
import { solveBraggReflector } from '../simulation/solvers/transferMatrix';

export function SimulationShell() {
  const [inputs, setInputs] = useState(DEFAULT_BRAGG_REFLECTOR_INPUTS);
  const result = useMemo(() => solveBraggReflector(inputs), [inputs]);

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
          <BraggReflectorForm inputs={inputs} onChange={setInputs} />
        </aside>

        <section className="chart-panel" aria-label="Simulation outputs">
          <h2>Reflectance Spectrum</h2>
          <ReflectanceChart result={result} />
          <MetricsPanel result={result} />
        </section>
      </section>
    </main>
  );
}
