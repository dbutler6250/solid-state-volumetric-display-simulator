/** Returns the shared fallback copy used when Plotly cannot load. */
export function getChartUnavailableLabel(chartName: string): string {
  return `${chartName} could not be loaded in this browser.`;
}
