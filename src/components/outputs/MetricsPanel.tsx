import type { SimulationResult } from '../../types/simulation';

type MetricsPanelProps = {
  result: SimulationResult;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
const formatNanometers = (value: number): string => `${value.toFixed(1)} nm`;

export function MetricsPanel({ result }: MetricsPanelProps) {
  const metrics = [
    { label: 'Peak reflectance', value: formatPercent(result.peakReflectance) },
    { label: 'Center wavelength', value: formatNanometers(result.centerWavelengthNm) },
    { label: 'Bandwidth', value: formatNanometers(result.bandwidthNm) },
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
