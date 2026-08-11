import { Suspense, useMemo, useState } from 'react';
import { createHybridBraggModel } from '../simulation/structures/hybridBraggGrating';
import { sampleStrainField } from '../simulation/perturbations/strainField';
import type { MovingPulseExperimentResult } from '../simulation/experiments/hybridBraggExperiments';
import type { HybridBraggDesignInputs } from '../types/simulation';
import { ChartProgressOverlay, type ChartProgress } from './ChartProgressOverlay';
import { ChartUnavailableFallback, LazyPlot, LazyPlotErrorBoundary } from './LazyPlot';

type MovingPulseExperimentChartProps = {
  result: MovingPulseExperimentResult | null;
  design: HybridBraggDesignInputs | null;
  progress: ChartProgress | null;
};

const formatMetric = (value: number | null, digits = 4): string =>
  value === null || !Number.isFinite(value) ? 'not defined' : value.toPrecision(digits);

const formatWidth = (result: MovingPulseExperimentResult): string => {
  const width = result.metrics.effectiveWidth;
  if (width.status === 'single-peak') return `${width.widthMm.toPrecision(4)} mm`;
  if (width.status === 'multiple-comparable-peaks') return 'not unique';
  return 'not defined';
};

/** Renders fixed-laser reflectance versus moving strain-region position. */
export function MovingPulseExperimentChart({ result, design, progress }: MovingPulseExperimentChartProps) {
  const [responseRetryKey, setResponseRetryKey] = useState(0);
  const [profileRetryKey, setProfileRetryKey] = useState(0);
  const strainProfile = useMemo(() => {
    if (!design) return null;
    const model = createHybridBraggModel(design);
    const sampleCount = 121;
    const stepM = model.grating.lengthM / (sampleCount - 1);
    return Array.from({ length: sampleCount }, (_, index) => {
      const zM = stepM * index;
      return {
        zMm: zM * 1e3,
        strain: sampleStrainField(model.strain, zM),
      };
    });
  }, [design]);

  if (!result || !design || !strainProfile) {
    return (
      <div className="chart-placeholder" role="status">
        {progress ? null : 'The moving-region experiment will update when a valid hybrid grating is resolved.'}
        <ChartProgressOverlay label="Calculating moving-region response..." progress={progress} />
      </div>
    );
  }

  const metrics = [
    ['Static reflectance', formatMetric(result.metrics.staticReflectance)],
    ['Peak reflectance', formatMetric(result.metrics.peakReflectance)],
    ['Peak enhancement', formatMetric(result.metrics.peakEnhancement)],
    ['Peak gain', formatMetric(result.metrics.peakGain)],
    ['Peak position', `${result.metrics.peakPositionMm.toPrecision(4)} mm`],
    ['Minimum reflectance', formatMetric(result.metrics.minReflectance)],
    ['Mean reflectance', formatMetric(result.metrics.meanReflectance)],
    ['Position std dev', formatMetric(result.metrics.standardDeviationReflectance)],
    ['Uniformity', formatMetric(result.metrics.uniformity)],
    ['Effective optical width', formatWidth(result)],
  ];

  return (
    <div className="moving-pulse-panel">
      <div className="moving-pulse-metadata">
        <span>{`Fixed laser: ${result.laserWavelengthNm.toPrecision(6)} nm`}</span>
        <span>{`Static Bragg: ${result.staticBraggWavelengthNm.toPrecision(6)} nm`}</span>
        <span>{`Position step: ${result.positionStepMm.toPrecision(4)} mm`}</span>
        <span>{`Segments: ${result.segmentCount}`}</span>
      </div>
      <div className="chart-frame moving-pulse-chart-frame">
        <LazyPlotErrorBoundary
          key={responseRetryKey}
          fallback={<ChartUnavailableFallback chartName="Moving-region chart" onRetry={() => setResponseRetryKey((current) => current + 1)} />}
        >
          <Suspense fallback={<div className="chart-placeholder" role="status">Loading chart...</div>}>
            <LazyPlot
              retryKey={responseRetryKey}
              className="moving-pulse-chart"
              data={[
                {
                  x: result.points.map((point) => point.strainCenterMm),
                  y: result.points.map((point) => point.reflectance),
                  type: 'scatter' as const,
                  mode: 'lines+markers' as const,
                  name: 'Fixed-laser reflectance',
                  line: { color: '#68b6a3', width: 3 },
                  marker: { size: 5, color: '#68b6a3' },
                  hovertemplate: 'center=%{x:.4f} mm<br>R=%{y:.5f}<extra></extra>',
                },
                {
                  x: result.points.map((point) => point.strainCenterMm),
                  y: result.points.map(() => result.metrics.staticReflectance),
                  type: 'scatter' as const,
                  mode: 'lines' as const,
                  name: 'No-strain baseline',
                  line: { color: '#dab55e', width: 2, dash: 'dash' },
                  hovertemplate: 'R_static=%{y:.5f}<extra></extra>',
                },
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: '#101720',
                plot_bgcolor: '#101720',
                font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
                margin: { t: 22, r: 22, b: 58, l: 66 },
                xaxis: { title: { text: 'Strain Region Center Position (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
                yaxis: { title: { text: 'Reflectance at Fixed Laser Wavelength' }, range: [0, 1], gridcolor: '#263443', zerolinecolor: '#334457' },
                legend: { orientation: 'h', x: 0, y: 1.14 },
              }}
              config={{ displaylogo: false, responsive: true }}
              useResizeHandler
            />
          </Suspense>
        </LazyPlotErrorBoundary>
        <ChartProgressOverlay label="Calculating moving-region response..." progress={progress} />
      </div>
      <div className="metric-grid moving-pulse-metrics" aria-label="Moving-region metrics">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="chart-frame moving-pulse-profile-frame">
        <LazyPlotErrorBoundary
          key={profileRetryKey}
          fallback={<ChartUnavailableFallback chartName="Strain profile chart" onRetry={() => setProfileRetryKey((current) => current + 1)} />}
        >
          <Suspense fallback={<div className="chart-placeholder" role="status">Loading chart...</div>}>
            <LazyPlot
              retryKey={profileRetryKey}
              className="moving-pulse-profile-chart"
              data={[
                {
                  x: strainProfile.map((point) => point.zMm),
                  y: strainProfile.map((point) => point.strain),
                  type: 'scatter' as const,
                  mode: 'lines' as const,
                  name: 'Strain profile',
                  line: { color: '#9fb7ff', width: 2 },
                  hovertemplate: 'z=%{x:.4f} mm<br>strain=%{y:.6g}<extra></extra>',
                },
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: '#101720',
                plot_bgcolor: '#101720',
                font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
                margin: { t: 18, r: 22, b: 48, l: 66 },
                xaxis: { title: { text: 'Position z (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
                yaxis: { title: { text: 'Strain' }, gridcolor: '#263443', zerolinecolor: '#334457' },
                showlegend: false,
              }}
              config={{ displaylogo: false, responsive: true }}
              useResizeHandler
            />
          </Suspense>
        </LazyPlotErrorBoundary>
      </div>
    </div>
  );
}
