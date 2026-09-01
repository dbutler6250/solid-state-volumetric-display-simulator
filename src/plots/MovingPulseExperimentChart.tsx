import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  solveReflectionRegionEvolution,
  type MovingPulseExperimentResult,
  type ReflectionRegionFrame,
} from '../simulation/experiments/hybridBraggExperiments';
import {
  createSpatialMaxwellValidationIdentity,
  validateSpatialAddressingWithMaxwell,
  type SpatialMaxwellValidationResult,
} from '../simulation/validation/spatialMaxwellValidation';
import type { HybridBraggDesignInputs } from '../types/simulation';
import { ChartProgressOverlay, type ChartProgress } from './ChartProgressOverlay';
import { ChartUnavailableFallback, LazyPlot, LazyPlotErrorBoundary } from './LazyPlot';

type MovingPulseExperimentChartProps = {
  result: MovingPulseExperimentResult | null;
  design: HybridBraggDesignInputs | null;
  progress: ChartProgress | null;
};

type MaxwellValidation =
  | { status: 'not-run' }
  | { status: 'running'; identity: string }
  | { status: 'current' | 'stale'; validation: SpatialMaxwellValidationResult; validatedAt: string }
  | { status: 'unavailable'; message: string };

type SpatialView = 'current-state' | 'trajectory-map';

const formatMetric = (value: number | null, digits = 4): string =>
  value === null || !Number.isFinite(value) ? 'not defined' : value.toPrecision(digits);

const formatMm = (value: number | null, digits = 3): string =>
  value === null || !Number.isFinite(value) ? 'not defined' : `${value.toFixed(digits)} mm`;

const formatWidth = (result: MovingPulseExperimentResult): string => {
  const width = result.metrics.effectiveWidth;
  if (width.status === 'single-peak') return `${width.widthMm.toPrecision(4)} mm`;
  if (width.status === 'multiple-comparable-peaks') return 'not unique';
  return 'not defined';
};

/** Renders fixed-laser spatial addressing as shared-depth traces and trajectory maps. */
export function MovingPulseExperimentChart({ result, design, progress }: MovingPulseExperimentChartProps) {
  const [responseRetryKey, setResponseRetryKey] = useState(0);
  const [regionRetryKey, setRegionRetryKey] = useState(0);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [spatialView, setSpatialView] = useState<SpatialView>('current-state');
  const [maxwellValidation, setMaxwellValidation] = useState<MaxwellValidation>({ status: 'not-run' });

  const reflectionEvolution = useMemo(() => {
    if (!design || !result) return null;
    return solveReflectionRegionEvolution(design, 0.5);
  }, [design, result]);
  const validationIdentity = useMemo(() => (design ? createSpatialMaxwellValidationIdentity(design) : null), [design]);

  useEffect(() => {
    if (!isPlaying || !reflectionEvolution || reflectionEvolution.frames.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      setFrameIndex((current) => (current + 1) % reflectionEvolution.frames.length);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isPlaying, frameIndex, reflectionEvolution]);

  if (!result || !design || !reflectionEvolution) {
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
  const isActuatorScan = currentFrame.parameterKind === 'actuator-index';
  const currentParameterLabel = isActuatorScan ? 'actuator' : isPhaseScan ? 'phase' : 'position';
  const parameterLabel = isActuatorScan ? 'Actuator' : isPhaseScan ? 'Phase' : 'Position';
  const parameterUnit = isActuatorScan ? 'index' : isPhaseScan ? 'rad' : 'mm';
  const primaryRegion = currentFrame.regions[0] ?? null;
  const strongestCompetitor = currentFrame.regions[1] ?? null;
  const trackingErrorMm =
    primaryRegion && currentFrame.parameterKind === 'position'
      ? primaryRegion.centerMm - currentFrame.parameterValue
      : null;
  const opticalWidthMm = primaryRegion ? primaryRegion.endMm - primaryRegion.startMm : null;
  const secondaryRegionRatio = primaryRegion && strongestCompetitor && primaryRegion.peakNormalizedIntensity > 0
    ? strongestCompetitor.peakNormalizedIntensity / primaryRegion.peakNormalizedIntensity
    : null;
  const displayedMaxwellValidation =
    maxwellValidation.status === 'current' && maxwellValidation.validation.identity !== validationIdentity
      ? { ...maxwellValidation, status: 'stale' as const }
      : maxwellValidation;
  const maxwellIsCurrent = displayedMaxwellValidation.status === 'current' && displayedMaxwellValidation.validation.identity === validationIdentity;
  const maxwellPrimaryRegion =
    (displayedMaxwellValidation.status === 'current' || displayedMaxwellValidation.status === 'stale')
      ? displayedMaxwellValidation.validation.regions[0] ?? null
      : null;
  const maxwellMetrics = getMaxwellComparisonMetrics(currentFrame, displayedMaxwellValidation);
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

  const runMaxwellValidation = () => {
    if (!validationIdentity) return;
    setIsPlaying(false);
    setMaxwellValidation({ status: 'running', identity: validationIdentity });
    window.setTimeout(() => {
      try {
        const validation = validateSpatialAddressingWithMaxwell(design, reflectionEvolution.thresholdFraction);
        setMaxwellValidation({
          status: 'current',
          validation,
          validatedAt: new Date().toLocaleTimeString(),
        });
      } catch (error) {
        setMaxwellValidation({
          status: 'unavailable',
          message: error instanceof Error ? error.message : 'Maxwell validation failed for this state.',
        });
      }
    }, 0);
  };

  return (
    <div className="moving-pulse-panel">
      <div className="spatial-provenance-bar">
        <div>
          <span>Interactive spatial model</span>
          <strong>CMT</strong>
        </div>
        <div>
          <span>Reference validation</span>
          <strong>{getMaxwellStatusLabel(displayedMaxwellValidation)}</strong>
        </div>
        <button type="button" className="action-button" onClick={runMaxwellValidation} disabled={displayedMaxwellValidation.status === 'running'}>
          {displayedMaxwellValidation.status === 'running' ? 'Validating...' : 'Validate with Maxwell'}
        </button>
      </div>
      <div className="moving-pulse-metadata">
        <span>{`Fixed laser: ${result.laserWavelengthNm.toPrecision(6)} nm`}</span>
        <span>{`Static Bragg: ${result.staticBraggWavelengthNm.toPrecision(6)} nm`}</span>
        <span>{`${parameterLabel} step: ${result.positionStepMm.toPrecision(4)} ${parameterUnit}`}</span>
        <span>{`Depth: 0 to ${design.lengthMm.toPrecision(4)} mm`}</span>
        <span>{`Segments: ${result.segmentCount}`}</span>
      </div>
      <ResponseChart
        result={result}
        responseRetryKey={responseRetryKey}
        setResponseRetryKey={setResponseRetryKey}
        isPhaseScan={isPhaseScan}
        isActuatorScan={isActuatorScan}
        progress={progress}
      />
      <div className="metric-grid moving-pulse-metrics" aria-label="Moving-region metrics">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="reflection-region-view" aria-label="Calculated reflection-region visualization">
        <div className="reflection-region-toolbar">
          <div>
            <h3>Spatial Response</h3>
            <span>{`Frame ${boundedFrameIndex + 1} / ${reflectionEvolution.frames.length}; ${currentParameterLabel} ${currentFrame.parameterValue.toPrecision(4)} ${parameterUnit}`}</span>
          </div>
          <div className="chart-toolbar">
            <button type="button" className="action-button" onClick={() => setFrameIndex((current) => Math.max(0, current - 1))}>Previous</button>
            <button type="button" className="action-button" onClick={() => setIsPlaying((current) => !current)}>{isPlaying ? 'Pause' : 'Play'}</button>
            <button type="button" className="action-button" onClick={() => setFrameIndex((current) => Math.min(reflectionEvolution.frames.length - 1, current + 1))}>Next</button>
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
        <div className="spatial-view-tabs" role="tablist" aria-label="Spatial response view">
          <button type="button" role="tab" aria-selected={spatialView === 'current-state'} onClick={() => setSpatialView('current-state')}>Current State</button>
          <button type="button" role="tab" aria-selected={spatialView === 'trajectory-map'} onClick={() => setSpatialView('trajectory-map')}>Trajectory Map</button>
        </div>
        <div className="spatial-instrument-grid">
          <section className="metric-grid tracking-metrics" aria-label="Tracking metrics">
            <div className="metric"><span>Commanded trough center</span><strong>{currentFrame.parameterKind === 'position' ? formatMm(currentFrame.parameterValue) : 'not position-scanned'}</strong></div>
            <div className="metric"><span>Optical center</span><strong>{formatMm(primaryRegion?.centerMm ?? null)}</strong></div>
            <div className="metric"><span>Tracking error</span><strong>{trackingErrorMm === null ? 'not defined' : `${trackingErrorMm >= 0 ? '+' : ''}${trackingErrorMm.toFixed(3)} mm`}</strong></div>
            <div className="metric"><span>Optical width</span><strong>{formatMm(opticalWidthMm)}</strong></div>
            <div className="metric"><span>Dominant region count</span><strong>{currentFrame.regions.length}</strong></div>
            <div className="metric"><span>Secondary-region ratio</span><strong>{formatMetric(secondaryRegionRatio)}</strong></div>
          </section>
          <section className="metric-grid tracking-metrics" aria-label="Maxwell validation metrics">
            <div className="metric"><span>CMT optical center</span><strong>{formatMm(primaryRegion?.centerMm ?? null)}</strong></div>
            <div className="metric"><span>Maxwell optical center</span><strong>{formatMm(maxwellPrimaryRegion?.centerMm ?? null)}</strong></div>
            <div className="metric"><span>Center difference</span><strong>{formatMm(maxwellMetrics.centerDifferenceMm)}</strong></div>
            <div className="metric"><span>CMT optical width</span><strong>{formatMm(opticalWidthMm)}</strong></div>
            <div className="metric"><span>Maxwell optical width</span><strong>{formatMm(maxwellMetrics.widthMm)}</strong></div>
            <div className="metric"><span>CMT / Maxwell boundary R</span><strong>{maxwellMetrics.boundaryReflectance}</strong></div>
          </section>
        </div>
        {displayedMaxwellValidation.status === 'unavailable' ? <p className="chart-toolbar-message" role="alert">{displayedMaxwellValidation.message}</p> : null}
        {(displayedMaxwellValidation.status === 'current' || displayedMaxwellValidation.status === 'stale') ? (
          <p className="parameter-sweep-status" role="status">
            {displayedMaxwellValidation.status === 'stale' ? 'Stale - configuration changed since validation.' : `Validated current state at ${displayedMaxwellValidation.validatedAt}.`}
          </p>
        ) : null}
        {spatialView === 'current-state' ? (
          <StackedSpatialTraces
            currentFrame={currentFrame}
            design={design}
            regionRetryKey={regionRetryKey}
            setRegionRetryKey={setRegionRetryKey}
            maxwell={maxwellIsCurrent && displayedMaxwellValidation.status === 'current' ? displayedMaxwellValidation.validation.result : null}
          />
        ) : (
          <TrajectoryMap
            reflectionEvolution={reflectionEvolution}
            currentFrame={currentFrame}
            design={design}
            mapRetryKey={mapRetryKey}
            setMapRetryKey={setMapRetryKey}
            isActuatorScan={isActuatorScan}
            isPhaseScan={isPhaseScan}
            currentParameterLabel={currentParameterLabel}
          />
        )}
      </section>
    </div>
  );
}

function ResponseChart({
  result,
  responseRetryKey,
  setResponseRetryKey,
  isPhaseScan,
  isActuatorScan,
  progress,
}: {
  result: MovingPulseExperimentResult;
  responseRetryKey: number;
  setResponseRetryKey: (updater: (current: number) => number) => void;
  isPhaseScan: boolean;
  isActuatorScan: boolean;
  progress: ChartProgress | null;
}) {
  return (
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
              xaxis: { title: { text: isActuatorScan ? 'Actuator state index' : isPhaseScan ? 'Field Phase Parameter (rad)' : 'Field Center Position (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457' },
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
  );
}

function StackedSpatialTraces({
  currentFrame,
  design,
  regionRetryKey,
  setRegionRetryKey,
  maxwell,
}: {
  currentFrame: ReflectionRegionFrame;
  design: HybridBraggDesignInputs;
  regionRetryKey: number;
  setRegionRetryKey: (updater: (current: number) => number) => void;
  maxwell: SpatialMaxwellValidationResult['result'] | null;
}) {
  const primaryRegion = currentFrame.regions[0] ?? null;
  return (
    <div className="chart-frame moving-pulse-spatial-frame">
      <LazyPlotErrorBoundary
        key={regionRetryKey}
        fallback={<ChartUnavailableFallback chartName="Spatial response chart" onRetry={() => setRegionRetryKey((current) => current + 1)} />}
      >
        <Suspense fallback={<div className="chart-placeholder" role="status">Loading chart...</div>}>
          <LazyPlot
            retryKey={regionRetryKey}
            className="moving-pulse-spatial-chart"
            data={[
              {
                x: currentFrame.spatialField.map((sample) => sample.zM * 1e3),
                y: currentFrame.spatialField.map((sample) => sample.strain),
                type: 'scatter' as const,
                mode: 'lines' as const,
                name: 'Strain profile epsilon(z)',
                line: { color: '#9fb7ff', width: 2 },
                hovertemplate: 'z=%{x:.4f} mm<br>epsilon=%{y:.6g}<extra></extra>',
              },
              {
                x: currentFrame.spatialField.map((sample) => sample.zM * 1e3),
                y: currentFrame.spatialField.map((sample) => sample.braggWavelengthM * 1e9 - design.fixedLaserWavelengthNm),
                type: 'scatter' as const,
                mode: 'lines' as const,
                yaxis: 'y2',
                name: 'Local detuning lambda_B - lambda_laser',
                line: { color: '#dab55e', width: 2 },
                hovertemplate: 'z=%{x:.4f} mm<br>detuning=%{y:.5f} nm<extra></extra>',
              },
              {
                x: currentFrame.spatialField.map((sample) => sample.zM * 1e3),
                y: currentFrame.spatialField.map((sample) => sample.normalizedBackwardIntensity),
                type: 'scatter' as const,
                mode: 'lines' as const,
                yaxis: 'y3',
                name: 'CMT normalized backward optical intensity',
                line: { color: '#f08a7a', width: 3 },
                fill: 'tozeroy' as const,
                hovertemplate: 'z=%{x:.4f} mm<br>CMT normalized backward intensity=%{y:.4f}<extra></extra>',
              },
              ...(maxwell ? [{
                x: maxwell.samples.map((sample) => sample.zM * 1e3),
                y: maxwell.samples.map((sample) => sample.normalizedBackwardIntensity),
                type: 'scatter' as const,
                mode: 'lines' as const,
                yaxis: 'y3',
                name: 'Maxwell normalized backward optical intensity',
                line: { color: '#7dd3fc', width: 2, dash: 'dash' as const },
                hovertemplate: 'z=%{x:.4f} mm<br>Maxwell normalized backward intensity=%{y:.4f}<extra></extra>',
              }] : []),
              ...currentFrame.regions.map((region, index) => ({
                x: [region.peakMm],
                y: [region.peakNormalizedIntensity],
                yaxis: 'y3',
                type: 'scatter' as const,
                mode: 'markers' as const,
                name: index === 0 ? 'Detected CMT region peaks' : undefined,
                marker: { color: '#ffd166', size: 9 },
                hovertemplate: `region=${index + 1}<br>z=%{x:.4f} mm<br>peak=%{y:.4f}<extra></extra>`,
                showlegend: index === 0,
              })),
              ...(currentFrame.parameterKind === 'position' ? [makeMarkerTrace(currentFrame.parameterValue, 'Trough target', '#9fb7ff', 'dash')] : []),
              ...(primaryRegion ? [makeMarkerTrace(primaryRegion.centerMm, 'Optical center', '#ffffff', undefined)] : []),
            ]}
            layout={{
              autosize: true,
              paper_bgcolor: '#101720',
              plot_bgcolor: '#101720',
              font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
              margin: { t: 30, r: 34, b: 56, l: 74 },
              xaxis: { title: { text: 'Depth z (mm)' }, gridcolor: '#263443', zerolinecolor: '#334457', range: [0, design.lengthMm] },
              yaxis: { title: { text: 'Strain epsilon(z)' }, domain: [0.7, 1], gridcolor: '#263443', zerolinecolor: '#334457' },
              yaxis2: { title: { text: 'lambda_B - laser (nm)' }, domain: [0.35, 0.65], gridcolor: '#263443', zerolinecolor: '#334457' },
              yaxis3: { title: { text: 'Normalized backward optical intensity' }, domain: [0, 0.3], range: [0, 1.05], gridcolor: '#263443', zerolinecolor: '#334457' },
              legend: { orientation: 'h', x: 0, y: 1.09 },
              shapes: [
                {
                  type: 'line' as const,
                  xref: 'x' as const,
                  yref: 'y2' as const,
                  x0: 0,
                  x1: design.lengthMm,
                  y0: 0,
                  y1: 0,
                  line: { color: '#dab55e', width: 1, dash: 'dot' as const },
                },
                ...getSectionShapes(currentFrame),
                ...currentFrame.regions.map((region) => ({
                  type: 'rect' as const,
                  xref: 'x' as const,
                  yref: 'paper' as const,
                  x0: region.startMm,
                  x1: region.endMm,
                  y0: 0,
                  y1: 0.3,
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
  );
}

function TrajectoryMap({
  reflectionEvolution,
  currentFrame,
  design,
  mapRetryKey,
  setMapRetryKey,
  isActuatorScan,
  isPhaseScan,
  currentParameterLabel,
}: {
  reflectionEvolution: ReturnType<typeof solveReflectionRegionEvolution>;
  currentFrame: ReflectionRegionFrame;
  design: HybridBraggDesignInputs;
  mapRetryKey: number;
  setMapRetryKey: (updater: (current: number) => number) => void;
  isActuatorScan: boolean;
  isPhaseScan: boolean;
  currentParameterLabel: string;
}) {
  return (
    <div className="chart-frame moving-pulse-profile-frame">
      <LazyPlotErrorBoundary
        key={mapRetryKey}
        fallback={<ChartUnavailableFallback chartName="Trajectory map" onRetry={() => setMapRetryKey((current) => current + 1)} />}
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
                colorbar: { title: { text: 'Normalized |B|^2' } },
                hovertemplate: `${currentParameterLabel}=%{x:.4f}<br>z=%{y:.4f} mm<br>normalized backward intensity=%{z:.4f}<extra></extra>`,
              },
              ...(currentFrame.parameterKind === 'position' ? [
                {
                  x: reflectionEvolution.frames.map((frame) => frame.parameterValue),
                  y: reflectionEvolution.frames.map((frame) => frame.parameterValue),
                  type: 'scatter' as const,
                  mode: 'lines' as const,
                  name: 'Commanded trough trajectory',
                  line: { color: '#9fb7ff', width: 2, dash: 'dash' as const },
                  hovertemplate: 'commanded=%{x:.4f} mm<br>z=%{y:.4f} mm<extra></extra>',
                },
                {
                  x: reflectionEvolution.frames.map((frame) => frame.parameterValue),
                  y: reflectionEvolution.frames.map((frame) => frame.regions[0]?.centerMm ?? null),
                  type: 'scatter' as const,
                  mode: 'lines+markers' as const,
                  name: 'Calculated optical center trajectory',
                  line: { color: '#ffffff', width: 2 },
                  marker: { color: '#ffffff', size: 4 },
                  hovertemplate: 'commanded=%{x:.4f} mm<br>optical center=%{y:.4f} mm<extra></extra>',
                },
              ] : []),
            ]}
            layout={{
              autosize: true,
              paper_bgcolor: '#101720',
              plot_bgcolor: '#101720',
              font: { color: '#dce7f2', family: 'Inter, system-ui, sans-serif' },
              margin: { t: 20, r: 76, b: 52, l: 66 },
              xaxis: { title: { text: isActuatorScan ? 'Actuator state index' : isPhaseScan ? 'Time / phase parameter (rad)' : 'Commanded trough position (mm)' }, gridcolor: '#263443' },
              yaxis: { title: { text: 'Optical depth z (mm)' }, gridcolor: '#263443', range: [0, design.lengthMm] },
              legend: { orientation: 'h', x: 0, y: 1.12 },
            }}
            config={{ displaylogo: false, responsive: true }}
            useResizeHandler
          />
        </Suspense>
      </LazyPlotErrorBoundary>
    </div>
  );
}

function makeMarkerTrace(xMm: number, name: string, color: string, dash: 'dash' | undefined) {
  return {
    x: [xMm, xMm],
    y: [0, 1],
    yaxis: 'y3',
    type: 'scatter' as const,
    mode: 'lines' as const,
    name,
    line: { color, width: 2, dash },
    hoverinfo: 'skip' as const,
  };
}

function getSectionShapes(frame: ReflectionRegionFrame) {
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

function getMaxwellStatusLabel(validation: MaxwellValidation): string {
  if (validation.status === 'not-run') return 'Not run';
  if (validation.status === 'running') return 'Running';
  if (validation.status === 'current') return 'Current';
  if (validation.status === 'stale') return 'Stale - configuration changed';
  return 'Unavailable';
}

function getMaxwellComparisonMetrics(currentFrame: ReflectionRegionFrame, validation: MaxwellValidation) {
  if (validation.status !== 'current' && validation.status !== 'stale') {
    return { centerDifferenceMm: null, widthMm: null, boundaryReflectance: 'not defined' };
  }
  const cmtRegion = currentFrame.regions[0] ?? null;
  const maxwellRegion = validation.validation.regions[0] ?? null;
  const centerDifferenceMm = cmtRegion && maxwellRegion ? maxwellRegion.centerMm - cmtRegion.centerMm : null;
  const widthMm = maxwellRegion ? maxwellRegion.endMm - maxwellRegion.startMm : null;
  return {
    centerDifferenceMm,
    widthMm,
    boundaryReflectance: `${formatMetric(currentFrame.reflectance)} / ${formatMetric(validation.validation.result.reflectance)}`,
  };
}

function isPhaseScannedField(strainShape: HybridBraggDesignInputs['strainShape']): boolean {
  return strainShape === 'traveling-sinusoid' || strainShape === 'standing-wave' || strainShape === 'multi-tone';
}
