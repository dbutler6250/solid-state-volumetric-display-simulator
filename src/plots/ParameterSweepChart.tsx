import { Suspense } from 'react';
import { LazyPlot } from './LazyPlot';
import type { ParameterSweepResult } from '../types/simulation';

type ParameterSweepChartProps = {
  result: ParameterSweepResult | null;
};

const SERIES_COLORS = {
  peak: '#5aa7c8',
  center: '#dab55e',
  bandwidth: '#8fcf9f',
};

const getParameterLabel = (result: ParameterSweepResult): string =>
  result.settings.parameter === 'periodCount'
    ? 'Periods'
    : result.settings.parameter === 'incidentAngleDegrees'
      ? 'Incident angle (deg)'
      : 'Design wavelength (nm)';

/** Renders sweep metrics against the selected swept parameter. */
export function ParameterSweepChart({ result }: ParameterSweepChartProps) {
  if (!result) {
    return (
      <div className="chart-placeholder chart-placeholder-compact" role="status">
        Run a parameter sweep to compare peak reflectance, center wavelength, and bandwidth.
      </div>
    );
  }

  const x = result.points.map((point) => point.parameterValue);
  const xAxisTitle = getParameterLabel(result);

  return (
    <div className="parameter-sweep-chart-frame">
      <div className="parameter-sweep-legend parameter-sweep-legend-left" aria-hidden="true">
        <LegendItem color={SERIES_COLORS.peak} label="Peak" />
      </div>
      <div className="parameter-sweep-legend parameter-sweep-legend-right" aria-hidden="true">
        <LegendItem color={SERIES_COLORS.center} label="Center" />
        <LegendItem color={SERIES_COLORS.bandwidth} label="Bandwidth" />
      </div>
      <Suspense
        fallback={
          <div className="chart-placeholder chart-placeholder-compact" role="status">
            Loading chart...
          </div>
        }
      >
        <LazyPlot
          className="parameter-sweep-chart"
          data={[
            {
              x,
              y: result.points.map((point) => point.peakReflectance),
              type: 'scatter' as const,
              mode: 'lines+markers' as const,
              name: 'Peak',
              line: { color: SERIES_COLORS.peak, width: 3 },
              yaxis: 'y',
              hovertemplate: `%{x:.2f}<br>Peak R=%{y:.4f}<extra></extra>`,
            },
            {
              x,
              y: result.points.map((point) => point.centerWavelengthNm),
              type: 'scatter' as const,
              mode: 'lines+markers' as const,
              name: 'Center',
              line: { color: SERIES_COLORS.center, width: 2 },
              yaxis: 'y2',
              hovertemplate: `%{x:.2f}<br>Center=%{y:.1f} nm<extra></extra>`,
            },
            {
              x,
              y: result.points.map((point) => point.bandwidthNm),
              type: 'scatter' as const,
              mode: 'lines+markers' as const,
              name: 'Bandwidth',
              line: { color: SERIES_COLORS.bandwidth, width: 2 },
              yaxis: 'y2',
              hovertemplate: `%{x:.2f}<br>Bandwidth=%{y:.1f} nm<extra></extra>`,
            },
          ]}
          layout={{
            autosize: true,
            paper_bgcolor: '#101720',
            plot_bgcolor: '#101720',
            font: {
              color: '#dce7f2',
              family: 'Inter, system-ui, sans-serif',
            },
            margin: { t: 34, r: 70, b: 56, l: 62 },
            xaxis: {
              title: { text: xAxisTitle },
              gridcolor: '#263443',
              zerolinecolor: '#334457',
            },
            yaxis: {
              title: { text: 'Peak reflectance' },
              range: [0, 1],
              gridcolor: '#263443',
              zerolinecolor: '#334457',
            },
            yaxis2: {
              title: { text: 'Wavelength metric (nm)' },
              overlaying: 'y',
              side: 'right',
              gridcolor: '#263443',
              zerolinecolor: '#334457',
            },
            showlegend: false,
          }}
          config={{
            displaylogo: false,
            responsive: true,
          }}
          useResizeHandler
        />
      </Suspense>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="parameter-sweep-legend-item">
      <span className="parameter-sweep-legend-line" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
