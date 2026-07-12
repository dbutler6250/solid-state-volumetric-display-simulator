import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { PlotParams } from 'react-plotly.js';

export type LazyPlotProps = PlotParams;

/** Loads the Plotly React bridge only when a chart first renders. */
export const LazyPlot = lazy(async () => {
  const [{ default: Plotly }, { default: createPlotlyComponent }] = await Promise.all([
    import('plotly.js-basic-dist-min'),
    import('react-plotly.js/factory'),
  ]);

  return {
    default: createPlotlyComponent(Plotly) as ComponentType<LazyPlotProps>,
  };
});
