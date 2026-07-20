import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { PlotParams } from 'react-plotly.js';

export type LazyPlotBridgeProps = PlotParams;

const lazyPlotComponentCache = new Map<number, ComponentType<LazyPlotBridgeProps>>();

/** Creates a fresh lazy Plotly bridge so retries remount the importer. */
export function createLazyPlotComponent(retryKey: number): ComponentType<LazyPlotBridgeProps> {
  const cached = lazyPlotComponentCache.get(retryKey);
  if (cached) return cached;

  const component = lazy(async () => {
    void retryKey;
    const [{ default: Plotly }, { default: createPlotlyComponent }] = await Promise.all([
      import('plotly.js-cartesian-dist-min'),
      import('react-plotly.js/factory'),
    ]);

    return {
      default: createPlotlyComponent(Plotly) as ComponentType<LazyPlotBridgeProps>,
    };
  });

  lazyPlotComponentCache.set(retryKey, component);
  return component;
}
