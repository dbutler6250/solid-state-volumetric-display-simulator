const assumptions = [
  'Lossless real-valued refractive indices',
  'No absorption or material dispersion',
  'Air incident and exit media',
  'Coherent planar multilayer stack',
  'Non-magnetic materials',
];

/** Lists the simplifying assumptions used by the current solver. */
export function AssumptionsPanel() {
  return (
    <section className="assumptions-panel" aria-label="Simulation assumptions">
      <h2>Assumptions</h2>
      <ul>
        {assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>
    </section>
  );
}
