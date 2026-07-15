import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChartUnavailableFallback, LazyPlotErrorBoundary } from './LazyPlot';
import { getChartUnavailableLabel } from './chartFallbackCopy';

describe('LazyPlotErrorBoundary', () => {
  it('renders the provided fallback after a Plotly load error', () => {
    const fallback = createElement('div', { role: 'alert' }, 'Spectrum chart unavailable');
    const boundary = new LazyPlotErrorBoundary({ fallback, children: null });

    boundary.state = LazyPlotErrorBoundary.getDerivedStateFromError();

    expect(boundary.render()).toBe(fallback);
  });

  it('renders the shared chart unavailable copy with a retry control', () => {
    const markup = renderToStaticMarkup(
      createElement(ChartUnavailableFallback, {
        chartName: 'Spectrum chart',
        onRetry: () => undefined,
      }),
    );

    expect(getChartUnavailableLabel('Spectrum chart')).toBe(
      'Spectrum chart could not be loaded in this browser.',
    );
    expect(markup).toContain('Chart Unavailable');
    expect(markup).toContain('Retry');
  });
});
