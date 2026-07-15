import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { PlotParams } from 'react-plotly.js';

export type LazyPlotBridgeProps = PlotParams;

/** Creates a fresh lazy Plotly bridge so retries remount the importer. */
export function createLazyPlotComponent(retryKey: number): ComponentType<LazyPlotBridgeProps> {
  return lazy(async () => {
    void retryKey;
    const [{ default: Plotly }, { default: createPlotlyComponent }] = await Promise.all([
      import('plotly.js-basic-dist-min'),
      import('react-plotly.js/factory'),
    ]);

    return {
      default: createPlotlyComponent(Plotly) as ComponentType<LazyPlotBridgeProps>,
    };
  });
}
