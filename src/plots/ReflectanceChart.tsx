import { Suspense, useState } from 'react';
import { ChartUnavailableFallback, LazyPlot, LazyPlotErrorBoundary } from './LazyPlot';
import type { SimulationResult } from '../types/simulation';

type ReflectanceChartProps = {
  result: SimulationResult | null;
  showTransmission: boolean;
  xRange?: [number, number] | null;
};

/** Renders the reflectance spectrum with an optional transmission overlay. */
export function ReflectanceChart({ result, showTransmission, xRange }: ReflectanceChartProps) {
  const [retryKey, setRetryKey] = useState(0);

  if (!result) {
    return (
      <div className="chart-placeholder" role="status">
        The spectrum will update when the inputs are valid.
      </div>
    );
  }

  const chartData = [
    {
      x: result.spectrum.map((point) => point.wavelengthNm),
      y: result.spectrum.map((point) => point.reflectance),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Reflectance',
      line: {
        color: '#5aa7c8',
        width: 3,
      },
      hovertemplate: '%{x:.1f} nm<br>R=%{y:.4f}<extra></extra>',
    },
  ];

  if (showTransmission) {
    chartData.push({
      x: result.spectrum.map((point) => point.wavelengthNm),
      y: result.spectrum.map((point) => point.transmission),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Transmission',
      line: {
        color: '#dab55e',
        width: 2,
      },
      hovertemplate: '%{x:.1f} nm<br>T=%{y:.4f}<extra></extra>',
    });
  }

  return (
    <LazyPlotErrorBoundary
      key={retryKey}
      fallback={<ChartUnavailableFallback chartName="Spectrum chart" onRetry={() => setRetryKey((current) => current + 1)} />}
    >
      <Suspense fallback={<div className="chart-placeholder" role="status">Loading chart...</div>}>
        <LazyPlot
          retryKey={retryKey}
          className="reflectance-chart"
          data={chartData}
          layout={{
            autosize: true,
            paper_bgcolor: '#101720',
            plot_bgcolor: '#101720',
            font: {
              color: '#dce7f2',
              family: 'Inter, system-ui, sans-serif',
            },
            margin: {
              t: 18,
              r: 22,
              b: 56,
              l: 62,
            },
            xaxis: {
              title: {
                text: 'Wavelength (nm)',
              },
              gridcolor: '#263443',
              zerolinecolor: '#334457',
              range: xRange ?? undefined,
            },
            yaxis: {
              title: {
                text: 'Reflectance',
              },
              range: [0, 1],
              gridcolor: '#263443',
              zerolinecolor: '#334457',
            },
            showlegend: showTransmission,
            legend: {
              orientation: 'h',
              x: 0,
              y: 1.12,
            },
          }}
          config={{
            displaylogo: false,
            responsive: true,
          }}
          useResizeHandler
        />
      </Suspense>
    </LazyPlotErrorBoundary>
  );
}
