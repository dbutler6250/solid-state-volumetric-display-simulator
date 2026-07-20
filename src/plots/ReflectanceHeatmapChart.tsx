import { Suspense, useState } from 'react';
import { ChartProgressOverlay, type ChartProgress } from './ChartProgressOverlay';
import { ChartUnavailableFallback, LazyPlot, LazyPlotErrorBoundary } from './LazyPlot';
import type { ReflectanceHeatmapResult } from '../types/simulation';
import { getHeatmapAxisLabel } from './heatmapAxisLabels';

type ReflectanceHeatmapChartProps = {
  result: ReflectanceHeatmapResult | null;
  progress: ChartProgress | null;
};

/** Renders a 2D reflectance heatmap for the selected sweep axes. */
export function ReflectanceHeatmapChart({ result, progress }: ReflectanceHeatmapChartProps) {
  const [retryKey, setRetryKey] = useState(0);

  if (!result) {
    return (
      <div className="chart-placeholder chart-placeholder-compact" role="status">
        {progress ? null : 'Run a heatmap sweep to visualize reflectance across both axes.'}
        <ChartProgressOverlay label="Running heatmap..." progress={progress} />
      </div>
    );
  }

  const xTitle = getHeatmapAxisLabel(result.xAxis.settings.parameter);
  const yTitle = getHeatmapAxisLabel(result.yAxis.settings.parameter);

  return (
    <div className="reflectance-heatmap-frame">
      <LazyPlotErrorBoundary
        key={retryKey}
        fallback={
          <ChartUnavailableFallback
            chartName="Reflectance heatmap"
            onRetry={() => setRetryKey((current) => current + 1)}
          />
        }
      >
        <Suspense
          fallback={
            <div className="chart-placeholder chart-placeholder-compact" role="status">
              Loading heatmap...
            </div>
          }
        >
          <LazyPlot
            retryKey={retryKey}
            className="reflectance-heatmap-chart"
            data={[
              {
                x: result.xAxis.values,
                y: result.yAxis.values,
                z: result.reflectance,
                type: 'heatmap' as const,
                zsmooth: false,
                zmin: 0,
                zmax: 1,
                colorscale: 'Viridis',
                xgap: 1,
                ygap: 1,
                colorbar: {
                  title: { text: 'Reflectance' },
                },
                hovertemplate: `%{x:.2f}<br>%{y:.2f}<br>R=%{z:.4f}<extra></extra>`,
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
              margin: { t: 28, r: 26, b: 62, l: 72 },
              xaxis: {
                title: { text: xTitle },
                gridcolor: '#263443',
                zerolinecolor: '#334457',
              },
              yaxis: {
                title: { text: yTitle },
                gridcolor: '#263443',
                zerolinecolor: '#334457',
              },
              annotations: [
                {
                  text: 'Peak reflectance per parameter pair',
                  xref: 'paper',
                  yref: 'paper',
                  x: 0,
                  y: 1.12,
                  showarrow: false,
                  font: { size: 14, color: '#dce7f2' },
                },
              ],
            }}
            config={{
              displaylogo: false,
              responsive: true,
            }}
            useResizeHandler
          />
        </Suspense>
      </LazyPlotErrorBoundary>
      <ChartProgressOverlay label="Running heatmap..." progress={progress} />
    </div>
  );
}
