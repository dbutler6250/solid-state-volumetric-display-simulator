import type { SimulationResult } from '../../types/simulation';

type MetricsPanelProps = {
  result: SimulationResult | null;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
const formatNanometers = (value: number): string => `${value.toFixed(1)} nm`;

/** Summarizes the key spectral metrics produced by the simulation. */
export function MetricsPanel({ result }: MetricsPanelProps) {
  if (!result) {
    return (
      <div className="metric-grid" aria-label="Simulation metrics">
        <div className="metric metric-wide">
          <span>Simulation status</span>
          <strong>Update the highlighted inputs to run the model.</strong>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Peak reflectance', value: formatPercent(result.peakReflectance) },
    { label: 'Center wavelength', value: formatNanometers(result.centerWavelengthNm) },
    { label: 'Bandwidth', value: formatNanometers(result.bandwidthNm) },
    {
      label: 'Max |R + T - 1|',
      value: result.maxEnergyConservationError.toExponential(2),
    },
  ];

  return (
    <div className="metric-grid" aria-label="Simulation metrics">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}
