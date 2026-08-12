import { Suspense, useMemo, useState } from 'react';
import type {
  MovingResponseClassification,
  MovingResponseRegimeMapQuantity,
  MovingResponseRegimeMapResult,
} from '../simulation/experiments/hybridBraggExperiments';
import { ChartProgressOverlay, type ChartProgress } from './ChartProgressOverlay';
import { ChartUnavailableFallback, LazyPlot, LazyPlotErrorBoundary } from './LazyPlot';

type MovingResponseRegimeMapChartProps = {
  result: MovingResponseRegimeMapResult | null;
  progress: ChartProgress | null;
  quantity: MovingResponseRegimeMapQuantity;
  onQuantityChange: (quantity: MovingResponseRegimeMapQuantity) => void;
};

const CLASSIFICATION_VALUES: Record<MovingResponseClassification, number> = {
  'no-enhancement': 0,
  weak: 1,
  broad: 2,
  'multi-peak': 3,
  'single-dominant': 4,
};

const CLASSIFICATION_LABELS = ['no-enhancement', 'weak', 'broad', 'multi-peak', 'single-dominant'];

const QUANTITY_LABELS: Record<MovingResponseRegimeMapQuantity, string> = {
  classification: 'Classification',
  peakEnhancement: 'Peak enhancement',
  secondaryPeakRatio: 'Secondary peak ratio',
  effectiveWidthMm: 'Effective width',
  staticReflectance: 'Static baseline',
  peakReflectance: 'Peak reflectance',
  localizedFraction: 'Localized fraction',
};

/** Displays detuning x strain-width slices of the moving-response regime map. */
export function MovingResponseRegimeMapChart({
  result,
  progress,
  quantity,
  onQuantityChange,
}: MovingResponseRegimeMapChartProps) {
  const [retryKey, setRetryKey] = useState(0);
  const [sliceIndex, setSliceIndex] = useState(0);
  const [rowIndex, setRowIndex] = useState(0);
  const [columnIndex, setColumnIndex] = useState(0);
  const slice = result?.slices[Math.min(sliceIndex, Math.max(0, result.slices.length - 1))] ?? null;
  const selectedRow = slice
    ? slice.cells[Math.min(rowIndex, Math.max(0, slice.cells.length - 1))]
    : null;
  const selectedCell = selectedRow?.[Math.min(columnIndex, Math.max(0, selectedRow.length - 1))] ?? null;
  const heatmap = useMemo(() => slice ? buildHeatmapValues(slice.cells, quantity) : null, [quantity, slice]);

  if (!result || !slice || !heatmap) {
    return (
      <section className="regime-map-panel" aria-label="Moving-response regime map">
        <div className="chart-placeholder chart-placeholder-compact" role="status">
          {progress ? null : 'Run a regime map to classify detuning, strain width, and coupling slices.'}
          <ChartProgressOverlay label="Running regime map..." progress={progress} />
        </div>
      </section>
    );
  }

  return (
    <section className="regime-map-panel" aria-label="Moving-response regime map">
      <div className="regime-map-toolbar">
        <label className="field">
          <span>Map quantity</span>
          <select value={quantity} onChange={(event) => onQuantityChange(event.target.value as MovingResponseRegimeMapQuantity)}>
            {Object.entries(QUANTITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Fixed coupling slice</span>
          <select value={sliceIndex} onChange={(event) => setSliceIndex(Number(event.target.value))}>
            {result.slices.map((candidate, index) => (
              <option key={`${candidate.strainShape}-${candidate.indexModulation}`} value={index}>
                {`${candidate.strainShape}, Delta n=${candidate.indexModulation.toPrecision(3)}, kappa L=${candidate.kappaLengthProduct.toPrecision(3)}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="moving-pulse-metadata">
        <span>{`Outcome: ${result.summary.overallOutcome}`}</span>
        <span>{`Static Bragg: ${result.staticBraggWavelengthNm.toPrecision(6)} nm`}</span>
        <span>{`L_c: ${slice.couplingLengthMm?.toPrecision(4) ?? 'not defined'} mm`}</span>
      </div>
      <div className="chart-frame regime-map-chart-frame">
        <LazyPlotErrorBoundary
          key={retryKey}
          fallback={<ChartUnavailableFallback chartName="Regime map" onRetry={() => setRetryKey((current) => current + 1)} />}
        >
          <Suspense fallback={<div className="chart-placeholder chart-placeholder-compact" role="status">Loading regime map...</div>}>
            <LazyPlot
              retryKey={retryKey}
              className="regime-map-chart"
              data={[
                {
                  x: result.detuningValuesNm,
                  y: slice.cells.map((row) => row[0]?.strainWidthMm ?? 0),
                  z: heatmap.z,
                  type: 'heatmap' as const,
                  zsmooth: false,
                  colorscale: quantity === 'classification' ? classificationColorscale() : 'Viridis',
                  zmin: quantity === 'classification' ? 0 : undefined,
                  zmax: quantity === 'classification' ? 4 : undefined,
                  xgap: 1,
                  ygap: 1,
                  colorbar: {
                    title: { text: QUANTITY_LABELS[quantity] },
                    tickvals: quantity === 'classification' ? [0, 1, 2, 3, 4] : undefined,
                    ticktext: quantity === 'classification' ? CLASSIFICATION_LABELS : undefined,
                  },
                  text: heatmap.text as unknown as string[],
                  hovertemplate: '%{text}<extra></extra>',
                },
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: '#101720',
                plot_bgcolor: '#101720',
                font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
                margin: { t: 24, r: 26, b: 62, l: 76 },
                xaxis: { title: { text: 'Laser detuning from static Bragg (nm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
                yaxis: { title: { text: 'Strain width (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
              }}
              config={{ displaylogo: false, responsive: true }}
              useResizeHandler
            />
          </Suspense>
        </LazyPlotErrorBoundary>
        <ChartProgressOverlay label="Running regime map..." progress={progress} />
      </div>
      <div className="regime-map-drilldown">
        <label className="field">
          <span>Inspect width</span>
          <select value={rowIndex} onChange={(event) => setRowIndex(Number(event.target.value))}>
            {slice.cells.map((row, index) => (
              <option key={row[0]?.strainWidthMm ?? index} value={index}>
                {`${(row[0]?.strainWidthMm ?? 0).toPrecision(4)} mm`}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Inspect detuning</span>
          <select value={columnIndex} onChange={(event) => setColumnIndex(Number(event.target.value))}>
            {result.detuningValuesNm.map((detuningNm, index) => (
              <option key={detuningNm} value={index}>{`${detuningNm.toPrecision(4)} nm`}</option>
            ))}
          </select>
        </label>
      </div>
      {selectedCell ? <RegimeMapCellDrilldown cell={selectedCell} /> : null}
    </section>
  );
}

function RegimeMapCellDrilldown({ cell }: { cell: NonNullable<MovingResponseRegimeMapResult['slices'][number]['cells'][number][number]> }) {
  return (
    <div className="regime-map-cell">
      <div className="metric-grid moving-pulse-metrics" aria-label="Selected regime-map cell metrics">
        <Metric label="Classification" value={cell.classification} />
        <Metric label="Peak enhancement" value={formatNumber(cell.peakEnhancement)} />
        <Metric label="Secondary ratio" value={formatNumber(cell.secondaryPeakRatio)} />
        <Metric label="Localized fraction" value={formatNumber(cell.localizedFraction)} />
        <Metric label="W / L_c" value={formatNumber(cell.strainWidthToCouplingLength)} />
        <Metric label="W_opt / L_c" value={formatNumber(cell.effectiveWidthToCouplingLength)} />
        <Metric label="Peak position" value={cell.primaryPeakPositionMm === null ? 'not defined' : `${cell.primaryPeakPositionMm.toPrecision(4)} mm`} />
        <Metric label="Boundary peak" value={cell.boundaryDominated ? 'yes' : 'no'} />
      </div>
      <LazyPlot
        className="regime-map-drilldown-chart"
        data={[
          {
            x: cell.result.points.map((point) => point.strainCenterMm),
            y: cell.result.points.map((point) => point.enhancement),
            type: 'scatter' as const,
            mode: 'lines+markers' as const,
            name: 'Enhancement',
            line: { color: '#68b6a3', width: 3 },
            marker: { size: 5, color: '#68b6a3' },
            hovertemplate: 'center=%{x:.4f} mm<br>E=%{y:.5f}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: '#101720',
          plot_bgcolor: '#101720',
          font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
          margin: { t: 18, r: 22, b: 48, l: 66 },
          xaxis: { title: { text: 'Strain Region Center Position (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
          yaxis: { title: { text: 'Enhancement over Static Baseline' }, gridcolor: '#263443', zerolinecolor: '#334457' },
          showlegend: false,
        }}
        config={{ displaylogo: false, responsive: true }}
        useResizeHandler
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildHeatmapValues(
  cells: MovingResponseRegimeMapResult['slices'][number]['cells'],
  quantity: MovingResponseRegimeMapQuantity,
): { z: number[][]; text: string[][] } {
  return {
    z: cells.map((row) => row.map((cell) => getCellQuantity(cell, quantity))),
    text: cells.map((row) => row.map((cell) => [
      `classification=${cell.classification}`,
      `detuning=${cell.detuningNm.toPrecision(4)} nm`,
      `width=${cell.strainWidthMm.toPrecision(4)} mm`,
      `Delta n=${cell.indexModulation.toPrecision(4)}`,
      `peak E=${cell.peakEnhancement.toPrecision(4)}`,
      `secondary=${formatNumber(cell.secondaryPeakRatio)}`,
      `localized=${formatNumber(cell.localizedFraction)}`,
    ].join('<br>'))),
  };
}

function getCellQuantity(
  cell: MovingResponseRegimeMapResult['slices'][number]['cells'][number][number],
  quantity: MovingResponseRegimeMapQuantity,
): number {
  if (quantity === 'classification') return CLASSIFICATION_VALUES[cell.classification];
  if (quantity === 'peakEnhancement') return cell.peakEnhancement;
  if (quantity === 'secondaryPeakRatio') return cell.secondaryPeakRatio ?? 0;
  if (quantity === 'effectiveWidthMm') return cell.effectiveWidthMm ?? 0;
  if (quantity === 'staticReflectance') return cell.staticReflectance;
  if (quantity === 'peakReflectance') return cell.peakReflectance;
  return cell.localizedFraction ?? 0;
}

function classificationColorscale(): Array<[number, string]> {
  return [
    [0, '#5d6773'],
    [0.24, '#5d6773'],
    [0.25, '#8b6f3d'],
    [0.49, '#8b6f3d'],
    [0.5, '#4f78a7'],
    [0.74, '#4f78a7'],
    [0.75, '#b45f5f'],
    [0.89, '#b45f5f'],
    [0.9, '#68b6a3'],
    [1, '#68b6a3'],
  ];
}

function formatNumber(value: number | null): string {
  return value === null || !Number.isFinite(value) ? 'not defined' : value.toPrecision(4);
}
