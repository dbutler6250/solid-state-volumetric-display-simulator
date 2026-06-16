const placeholderMetrics = [
  { label: 'Peak reflectance', value: 'Pending' },
  { label: 'Center wavelength', value: 'Pending' },
  { label: 'Bandwidth', value: 'Pending' },
];

export function MetricsPanel() {
  return (
    <div className="metric-grid" aria-label="Simulation metrics">
      {placeholderMetrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}
