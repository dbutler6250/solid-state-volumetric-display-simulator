import { Suspense, useEffect, useMemo, useState } from 'react';
import { createHybridBraggModel } from '../simulation/structures/hybridBraggGrating';
import { sampleStrainField } from '../simulation/perturbations/strainField';
import {
  solveReflectionRegionEvolution,
  type MovingPulseExperimentResult,
} from '../simulation/experiments/hybridBraggExperiments';
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
  const [regionRetryKey, setRegionRetryKey] = useState(0);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const perturbationProfile = useMemo(() => {
    if (!design) return null;
    const model = createHybridBraggModel(design);
    const sampleCount = 121;
    const stepM = model.grating.lengthM / (sampleCount - 1);
    return Array.from({ length: sampleCount }, (_, index) => {
      const zM = stepM * index;
      return {
        zMm: zM * 1e3,
        value: sampleStrainField(model.strain, zM),
      };
    });
  }, [design]);
  const reflectionEvolution = useMemo(() => {
    if (!design || !result) return null;
    return solveReflectionRegionEvolution(design, 0.5);
  }, [design, result]);
  useEffect(() => {
    if (!isPlaying || !reflectionEvolution || reflectionEvolution.frames.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      setFrameIndex((current) => (current + 1) % reflectionEvolution.frames.length);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isPlaying, frameIndex, reflectionEvolution]);

  if (!result || !design || !perturbationProfile || !reflectionEvolution) {
    return (
      <div className="chart-placeholder" role="status">
        {progress ? null : 'The moving-region experiment will update when a valid hybrid grating is resolved.'}
        <ChartProgressOverlay label="Calculating moving-region response..." progress={progress} />
      </div>
    );
  }

  const isPhaseScan = isPhaseScannedField(result.strainShape);
  const boundedFrameIndex = Math.min(frameIndex, reflectionEvolution.frames.length - 1);
  const currentFrame = reflectionEvolution.frames[boundedFrameIndex];
  const currentParameterLabel = isPhaseScan ? 'phase' : 'position';
  const parameterLabel = isPhaseScan ? 'Phase' : 'Position';
  const parameterUnit = isPhaseScan ? 'rad' : 'mm';
  const metrics = [
    ['Static reflectance', formatMetric(result.metrics.staticReflectance)],
    ['Peak reflectance', formatMetric(result.metrics.peakReflectance)],
    ['Peak enhancement', formatMetric(result.metrics.peakEnhancement)],
    ['Peak gain', formatMetric(result.metrics.peakGain)],
    [`Peak ${parameterLabel.toLowerCase()}`, `${result.metrics.peakPositionMm.toPrecision(4)} ${parameterUnit}`],
    ['Minimum reflectance', formatMetric(result.metrics.minReflectance)],
    ['Mean reflectance', formatMetric(result.metrics.meanReflectance)],
    [`${parameterLabel} std dev`, formatMetric(result.metrics.standardDeviationReflectance)],
    ['Uniformity', formatMetric(result.metrics.uniformity)],
    ['Effective optical width', formatWidth(result)],
    ['Response class', result.metrics.localization.responseClassification],
    ['Secondary peak ratio', formatMetric(result.metrics.localization.secondaryPeakRatio)],
    ['Peak dominance', formatMetric(result.metrics.localization.peakDominance)],
    ['Localized fraction', formatMetric(result.metrics.localization.localizedFraction)],
    ['Boundary-dominated peak', result.metrics.localization.boundaryDominated ? 'yes' : 'no'],
  ];

  return (
    <div className="moving-pulse-panel">
      <div className="moving-pulse-metadata">
        <span>{`Fixed laser: ${result.laserWavelengthNm.toPrecision(6)} nm`}</span>
        <span>{`Static Bragg: ${result.staticBraggWavelengthNm.toPrecision(6)} nm`}</span>
        <span>{`${parameterLabel} step: ${result.positionStepMm.toPrecision(4)} ${parameterUnit}`}</span>
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
                  hovertemplate: 'parameter=%{x:.4f}<br>R=%{y:.5f}<extra></extra>',
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
                xaxis: { title: { text: getResponseAxisLabel(result.strainShape) }, gridcolor: '#263443', zerolinecolor: '#334457' },
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
                  x: perturbationProfile.map((point) => point.zMm),
                  y: perturbationProfile.map((point) => point.value),
                  type: 'scatter' as const,
                  mode: 'lines' as const,
                  name: 'Perturbation field',
                  line: { color: '#9fb7ff', width: 2 },
                  hovertemplate: 'z=%{x:.4f} mm<br>epsilon=%{y:.6g}<extra></extra>',
                },
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: '#101720',
                plot_bgcolor: '#101720',
                font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
                margin: { t: 18, r: 22, b: 48, l: 66 },
                xaxis: { title: { text: 'Position z (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
                yaxis: { title: { text: 'Perturbation epsilon(z)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
                showlegend: false,
              }}
              config={{ displaylogo: false, responsive: true }}
              useResizeHandler
            />
          </Suspense>
        </LazyPlotErrorBoundary>
      </div>
      <section className="reflection-region-view" aria-label="Calculated reflection-region visualization">
        <div className="reflection-region-toolbar">
          <div>
            <h3>Calculated Reflection Regions</h3>
            <span>{`Frame ${boundedFrameIndex + 1} / ${reflectionEvolution.frames.length}; ${currentParameterLabel} ${currentFrame.parameterValue.toPrecision(4)} ${parameterUnit}`}</span>
          </div>
          <div className="chart-toolbar">
            <button type="button" className="action-button" onClick={() => setFrameIndex((current) => Math.max(0, current - 1))}>
              Previous
            </button>
            <button type="button" className="action-button" onClick={() => setIsPlaying((current) => !current)}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="action-button" onClick={() => setFrameIndex((current) => Math.min(reflectionEvolution.frames.length - 1, current + 1))}>
              Next
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, reflectionEvolution.frames.length - 1)}
              value={boundedFrameIndex}
              onChange={(event) => {
                setIsPlaying(false);
                setFrameIndex(Number(event.target.value));
              }}
              aria-label="Reflection-region frame"
            />
          </div>
        </div>
        <div className="moving-pulse-metadata">
          <span>{`Total R: ${formatMetric(currentFrame.reflectance)}`}</span>
          <span>{`Detected regions: ${currentFrame.regions.length}`}</span>
          <span>{`Active sections: ${currentFrame.activeSectionIds.length > 0 ? currentFrame.activeSectionIds.map((id) => id + 1).join(', ') : 'none'}`}</span>
          <span>{`Laser timing: ${currentFrame.regions.length > 0 ? 'ON candidate' : 'OFF'}`}</span>
        </div>
        <div className="chart-frame moving-pulse-profile-frame">
          <LazyPlotErrorBoundary
            key={regionRetryKey}
            fallback={<ChartUnavailableFallback chartName="Reflection-region chart" onRetry={() => setRegionRetryKey((current) => current + 1)} />}
          >
            <Suspense fallback={<div className="chart-placeholder" role="status">Loading chart...</div>}>
              <LazyPlot
                retryKey={regionRetryKey}
                className="moving-pulse-profile-chart"
                data={[
                  {
                    x: currentFrame.spatialField.map((sample) => sample.zM * 1e3),
                    y: currentFrame.spatialField.map((sample) => sample.normalizedBackwardIntensity),
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    name: 'Calculated |B(z)|²',
                    line: { color: '#f08a7a', width: 3 },
                    fill: 'tozeroy' as const,
                    hovertemplate: 'z=%{x:.4f} mm<br>normalized |B|^2=%{y:.4f}<extra></extra>',
                  },
                  {
                    x: currentFrame.spatialField.map((sample) => sample.zM * 1e3),
                    y: currentFrame.spatialField.map((sample) => sample.strain),
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    name: 'Perturbation epsilon(z)',
                    yaxis: 'y2',
                    line: { color: '#9fb7ff', width: 2, dash: 'dot' },
                    hovertemplate: 'z=%{x:.4f} mm<br>epsilon=%{y:.6g}<extra></extra>',
                  },
                  ...currentFrame.regions.map((region, index) => ({
                    x: [region.peakMm],
                    y: [region.peakNormalizedIntensity],
                    type: 'scatter' as const,
                    mode: 'markers' as const,
                    name: index === 0 ? 'Detected region peaks' : undefined,
                    marker: { color: '#ffd166', size: 9 },
                    hovertemplate: `region=${index + 1}<br>z=%{x:.4f} mm<br>peak=%{y:.4f}<extra></extra>`,
                    showlegend: index === 0,
                  })),
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: '#101720',
                  plot_bgcolor: '#101720',
                  font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
                  margin: { t: 24, r: 62, b: 52, l: 66 },
                  xaxis: { title: { text: 'Depth z (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
                  yaxis: { title: { text: 'Normalized calculated backward intensity' }, range: [0, 1.05], gridcolor: '#263443', zerolinecolor: '#334457' },
                  yaxis2: { title: { text: 'Perturbation' }, overlaying: 'y', side: 'right', showgrid: false },
                  legend: { orientation: 'h', x: 0, y: 1.16 },
                  shapes: [
                    ...getSectionShapes(currentFrame),
                    ...currentFrame.regions.map((region) => ({
                      type: 'rect' as const,
                      xref: 'x' as const,
                      yref: 'paper' as const,
                      x0: region.startMm,
                      x1: region.endMm,
                      y0: 0,
                      y1: 1,
                      fillcolor: 'rgba(255, 209, 102, 0.18)',
                      line: { width: 0 },
                    })),
                  ],
                }}
                config={{ displaylogo: false, responsive: true }}
                useResizeHandler
              />
            </Suspense>
          </LazyPlotErrorBoundary>
        </div>
        <div className="chart-frame moving-pulse-profile-frame">
          <LazyPlotErrorBoundary
            key={mapRetryKey}
            fallback={<ChartUnavailableFallback chartName="Depth-time reflection map" onRetry={() => setMapRetryKey((current) => current + 1)} />}
          >
            <Suspense fallback={<div className="chart-placeholder" role="status">Loading chart...</div>}>
              <LazyPlot
                retryKey={mapRetryKey}
                className="moving-pulse-profile-chart"
                data={[
                  {
                    x: reflectionEvolution.frames.map((frame) => frame.parameterValue),
                    y: currentFrame.spatialField.map((sample) => sample.zM * 1e3),
                    z: transposeReflectionMap(reflectionEvolution.frames.map((frame) =>
                      frame.spatialField.map((sample) => sample.normalizedBackwardIntensity),
                    )),
                    type: 'heatmap' as const,
                    colorscale: 'Viridis' as const,
                    zmin: 0,
                    zmax: 1,
                    colorbar: { title: { text: '|B|² norm' } },
                    hovertemplate: `${currentParameterLabel}=%{x:.4f}<br>z=%{y:.4f} mm<br>|B|²=%{z:.4f}<extra></extra>`,
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: '#101720',
                  plot_bgcolor: '#101720',
                  font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
                  margin: { t: 20, r: 76, b: 52, l: 66 },
                  xaxis: { title: { text: isPhaseScan ? 'Time / phase parameter (rad)' : 'Field center position (mm)' }, gridcolor: '#263443' },
                  yaxis: { title: { text: 'Depth z (mm)' }, gridcolor: '#263443' },
                }}
                config={{ displaylogo: false, responsive: true }}
                useResizeHandler
              />
            </Suspense>
          </LazyPlotErrorBoundary>
        </div>
      </section>
    </div>
  );
}

function getSectionShapes(frame: ReturnType<typeof solveReflectionRegionEvolution>['frames'][number]) {
  const sections = new Map<number, { startMm: number; endMm: number }>();
  frame.spatialField.forEach((sample) => {
    if (sample.sectionId === null || sample.sectionStartM === null || sample.sectionEndM === null) return;
    sections.set(sample.sectionId, { startMm: sample.sectionStartM * 1e3, endMm: sample.sectionEndM * 1e3 });
  });
  return Array.from(sections.values()).map((section) => ({
    type: 'rect' as const,
    xref: 'x' as const,
    yref: 'paper' as const,
    x0: section.startMm,
    x1: section.endMm,
    y0: 0,
    y1: 1,
    fillcolor: 'rgba(104, 182, 163, 0.08)',
    line: { color: 'rgba(104, 182, 163, 0.28)', width: 1 },
    layer: 'below' as const,
  }));
}

function transposeReflectionMap(values: number[][]): number[][] {
  if (values.length === 0) return [];
  return values[0].map((_, rowIndex) => values.map((column) => column[rowIndex]));
}

function getResponseAxisLabel(strainShape: HybridBraggDesignInputs['strainShape']): string {
  if (isPhaseScannedField(strainShape)) {
    return 'Field Phase Parameter (rad)';
  }
  return 'Field Center Position (mm)';
}

function isPhaseScannedField(strainShape: HybridBraggDesignInputs['strainShape']): boolean {
  return strainShape === 'traveling-sinusoid' || strainShape === 'standing-wave' || strainShape === 'multi-tone';
}
