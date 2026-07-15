import { Component, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { PlotParams } from 'react-plotly.js';
import { getChartUnavailableLabel } from './chartFallbackCopy';
import { createLazyPlotComponent } from './lazyPlotFactory';

export type LazyPlotProps = PlotParams & {
  /** Changes to force a fresh dynamic import after a failed load. */
  retryKey?: number;
};

/** Loads the Plotly React bridge only when a chart first renders. */
export function LazyPlot({ retryKey = 0, ...plotProps }: LazyPlotProps) {
  const Plot = useMemo(() => createLazyPlotComponent(retryKey), [retryKey]);

  return <Plot {...plotProps} />;
}


type LazyPlotErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

type LazyPlotErrorBoundaryState = {
  hasError: boolean;
};

/** Contains Plotly lazy-load failures so the rest of the workspace keeps working. */
export class LazyPlotErrorBoundary extends Component<
  LazyPlotErrorBoundaryProps,
  LazyPlotErrorBoundaryState
> {
  state: LazyPlotErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LazyPlotErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

type ChartUnavailableFallbackProps = {
  chartName: string;
  onRetry: () => void;
};

/** Shared chart-local fallback shown when Plotly cannot load. */
export function ChartUnavailableFallback({ chartName, onRetry }: ChartUnavailableFallbackProps) {
  return (
    <div className="chart-placeholder" role="alert" aria-live="polite">
      <strong>Chart Unavailable</strong>
      <p>{getChartUnavailableLabel(chartName)}</p>
      <button type="button" className="action-button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
