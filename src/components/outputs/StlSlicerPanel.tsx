import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import {
  buildPlaybackTimeline,
  buildSliceStack,
  getPlaybackStep,
  serializePlaybackTimelineJson,
  serializeSliceStackCsv,
  serializeSlicerOutput,
} from '../../simulation/slicer/slicer';
import { createSampleHollowSphereMesh, parseStlBytes } from '../../simulation/slicer/stl';
import type { MeshGeometry, MeshSourceMetadata } from '../../simulation/slicer/types';

type StlSlicerPanelState = {
  mesh: MeshGeometry | null;
  sourceLabel: string;
  error: string | null;
  sourceMetadata: MeshSourceMetadata;
};

/** Demonstrates the STL slicer and playback foundation with a deterministic preview. */
export function StlSlicerPanel() {
  const [state, setState] = useState<StlSlicerPanelState>({
    mesh: createSampleHollowSphereMesh(),
    sourceLabel: 'Sample hollow sphere mesh',
    error: null,
    sourceMetadata: { label: 'Sample hollow sphere mesh', kind: 'sample' },
  });
  const [sliceCount, setSliceCount] = useState(12);
  const [gridResolution, setGridResolution] = useState(10);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepInput, setStepInput] = useState('0');
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('z');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [fileName, setFileName] = useState('sample-hollow-sphere.stl');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const sliceStack = useMemo(() => {
    if (!state.mesh) return null;
    try {
      return buildSliceStack(state.mesh, { sliceCount, gridResolution, axis });
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'The mesh could not be sliced.' };
    }
  }, [axis, gridResolution, sliceCount, state.mesh]);

  const playbackTimeline = useMemo(
    () => (sliceStack && 'slices' in sliceStack ? buildPlaybackTimeline(sliceStack) : null),
    [sliceStack],
  );
  const playbackStep = useMemo(() => {
    if (!sliceStack || !('slices' in sliceStack)) return null;
    return getPlaybackStep(sliceStack, stepIndex);
  }, [sliceStack, stepIndex]);
  const slicerOutput = useMemo(() => {
    if (!sliceStack || !playbackTimeline || !('slices' in sliceStack)) return null;
    return { stack: sliceStack, timeline: playbackTimeline };
  }, [playbackTimeline, sliceStack]);

  const activeFrame = playbackStep?.state.projectedFrame;
  const activeCount = playbackStep?.state.visibleVoxels.length ?? 0;
  const totalCount = activeFrame
    ? activeFrame.occupancyMask.length * (activeFrame.occupancyMask[0]?.length ?? 0)
    : 0;
  const planeY = activeFrame ? 8 + activeFrame.planeCoordinate * 84 : 8;
  const projectionPreview = playbackStep?.state.projection.projectedSamples[0] ?? null;
  const previewSteps = playbackTimeline
    ? playbackTimeline.steps.slice(Math.max(0, stepIndex - 2), Math.min(playbackTimeline.steps.length, stepIndex + 3))
    : [];

  useEffect(() => {
    setStepInput(String(stepIndex));
  }, [stepIndex]);

  useEffect(() => {
    if (!isPlaying || !playbackTimeline || playbackTimeline.steps.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setStepIndex((current) => {
        const nextStep = current + 1;
        const limit = playbackTimeline.steps.length - 1;
        if (nextStep > limit) {
          return isLooping ? 0 : limit;
        }
        return nextStep;
      });
    }, 650 / playbackRate);

    return () => window.clearInterval(interval);
  }, [isLooping, isPlaying, playbackRate, playbackTimeline]);

  const loadSample = () => {
    setState({
      mesh: createSampleHollowSphereMesh(),
      sourceLabel: 'Sample hollow sphere mesh',
      error: null,
      sourceMetadata: { label: 'Sample hollow sphere mesh', kind: 'sample' },
    });
    setFileName('sample-hollow-sphere.stl');
    setStepIndex(0);
    setStepInput('0');
    setAxis('z');
    setIsPlaying(false);
  };

  const loadFile = (file: File) => {
    setIsLoadingFile(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable || file.size <= 0) return;
      setUploadProgress(Math.max(0, Math.min(100, Math.round((event.loaded / file.size) * 100))));
    };
    reader.onload = () => {
      try {
        const bytes = reader.result;
        if (!(bytes instanceof ArrayBuffer)) {
          throw new Error('The STL file could not be read.');
        }
        const mesh = parseStlBytes(bytes);
        setState({
          mesh,
          sourceLabel: file.name,
          error: null,
          sourceMetadata: { label: file.name, kind: 'file-upload', fileName: file.name },
        });
        setFileName(file.name);
        setStepIndex(0);
        setStepInput('0');
        setIsPlaying(false);
      } catch (error) {
        setState({
          mesh: null,
          sourceLabel: 'Failed import',
          error: error instanceof Error ? error.message : 'The STL file could not be read.',
          sourceMetadata: { label: 'Failed import', kind: 'file-upload', fileName: file.name },
        });
      } finally {
        setIsLoadingFile(false);
        setUploadProgress(null);
      }
    };
    reader.onerror = () => {
      setIsLoadingFile(false);
      setUploadProgress(null);
      setState({
        mesh: null,
        sourceLabel: 'Failed import',
        error: 'The STL file could not be read.',
        sourceMetadata: { label: 'Failed import', kind: 'file-upload', fileName: file.name },
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    const [file] = Array.from(event.dataTransfer.files ?? []).filter((candidate) =>
      candidate.name.toLowerCase().endsWith('.stl'),
    );
    if (!file) {
      setState((current) => ({
        ...current,
        error: 'Drop an STL file to load it into the slicer.',
      }));
      return;
    }
    await loadFile(file);
  };

  const goToStep = (value: number) => {
    if (!playbackTimeline) return;
    const safeValue = Number.isFinite(value) ? value : 0;
    const nextStep = Math.min(Math.max(0, Math.round(safeValue)), Math.max(0, playbackTimeline.steps.length - 1));
    setStepIndex(nextStep);
    setStepInput(String(nextStep));
  };

  const downloadExport = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stl-slicer-panel">
      <div className="stack-panel-heading">
        <h2>STL Slicer</h2>
        <span>{state.sourceLabel}</span>
      </div>
      <p className="reflectance-volume-hint">
        Upload an STL file, normalize it into display-volume space, choose an axis, and replay the deterministic plane sweep.
      </p>

      <div className="stl-slicer-grid">
        <div className="stl-slicer-upload">
          <label className="field">
            <span>STL file</span>
            <input
              type="file"
              accept=".stl,model/stl"
              onChange={(event) => {
                const [file] = Array.from(event.target.files ?? []);
                if (!file) return;
                void loadFile(file);
                event.target.value = '';
              }}
            />
          </label>
          <div
            className={isDropActive ? 'stl-slicer-dropzone stl-slicer-dropzone-active' : 'stl-slicer-dropzone'}
            role="button"
            tabIndex={0}
            aria-label="Drop STL file here"
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDropActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDropActive(true);
            }}
            onDragLeave={() => setIsDropActive(false)}
            onDrop={(event) => void handleFileDrop(event)}
          >
            <strong>{fileName}</strong>
            <p>Binary and ASCII .stl files are accepted. The mesh is normalized before slicing.</p>
            <p>Drag and drop a `.stl` file here, or use the file picker above.</p>
          </div>
        </div>
        <div className="stl-slicer-actions">
          <button type="button" className="action-button" onClick={loadSample}>
            Load sample hollow sphere
          </button>
          <label className="field">
            <span>Slice axis</span>
            <select value={axis} onChange={(event) => setAxis(event.target.value as 'x' | 'y' | 'z')}>
              <option value="x">X axis</option>
              <option value="y">Y axis</option>
              <option value="z">Z axis</option>
            </select>
          </label>
          <label className="field">
            <span>Slice count</span>
            <input
              type="number"
              min={1}
              max={64}
              value={sliceCount}
              onChange={(event) => setSliceCount(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Grid resolution</span>
            <input
              type="number"
              min={2}
              max={24}
              value={gridResolution}
              onChange={(event) => setGridResolution(Number(event.target.value))}
            />
          </label>
          <div className="stl-slicer-playback">
            <button type="button" className="action-button" onClick={() => setIsPlaying((current) => !current)}>
              {isPlaying ? 'Pause playback' : 'Play playback'}
            </button>
            <div className="stl-slicer-playback-nav">
              <button type="button" className="action-button" onClick={() => goToStep(stepIndex - 1)}>
                Previous
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => goToStep(stepIndex + 1)}
              >
                Next
              </button>
            </div>
            <label className="field">
              <span>Playback speed</span>
              <select value={String(playbackRate)} onChange={(event) => setPlaybackRate(Number(event.target.value))}>
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4">4x</option>
              </select>
            </label>
            <label className="stl-slicer-loop">
              <input type="checkbox" checked={isLooping} onChange={(event) => setIsLooping(event.target.checked)} />
              Loop playback
            </label>
            <label className="field">
              <span>Jump to step</span>
              <input
                type="number"
                min={0}
                max={Math.max(0, (playbackTimeline?.steps.length ?? 1) - 1)}
                value={stepInput}
                onChange={(event) => setStepInput(event.target.value)}
                onBlur={() => {
                  goToStep(Number(stepInput));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    goToStep(Number(stepInput));
                  }
                }}
              />
            </label>
            <div className="stl-slicer-playback-nav">
              <button type="button" className="action-button" onClick={() => goToStep(0)}>
                Start
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => goToStep(Math.max(0, (playbackTimeline?.steps.length ?? 1) - 1))}
              >
                End
              </button>
            </div>
          </div>
          <div className="stl-slicer-progress" aria-live="polite">
            {isLoadingFile ? (
              <>
                <progress max={100} value={uploadProgress ?? undefined} />
                <span>
                  {uploadProgress === null ? 'Reading STL file...' : `Reading STL file... ${uploadProgress}%`}
                </span>
              </>
            ) : (
              <span>Ready for upload.</span>
            )}
          </div>
        </div>
      </div>

      {state.error ? <p className="chart-toolbar-message" role="alert">{state.error}</p> : null}
      {'error' in (sliceStack ?? {}) ? <p className="chart-toolbar-message" role="alert">{(sliceStack as { error: string }).error}</p> : null}

      {sliceStack && 'slices' in sliceStack && playbackTimeline ? (
        <div className="stl-slicer-results">
          <div className="stack-summary-grid">
            <div className="stack-summary-item">
              <span>Normalized bounds</span>
              <strong>{`${sliceStack.bounds.min.map((value) => value.toFixed(2)).join(', ')} to ${sliceStack.bounds.max.map((value) => value.toFixed(2)).join(', ')}`}</strong>
            </div>
            <div className="stack-summary-item">
              <span>Timeline steps</span>
              <strong>{playbackTimeline.steps.length}</strong>
            </div>
            <div className="stack-summary-item">
              <span>Active voxels</span>
              <strong>{activeCount} / {totalCount}</strong>
            </div>
            <div className="stack-summary-item">
              <span>Occupied slices</span>
              <strong>{sliceStack.diagnostics.occupiedSliceCount} / {sliceStack.sliceCount}</strong>
            </div>
            <div className="stack-summary-item">
              <span>Average occupancy</span>
              <strong>{(sliceStack.diagnostics.averageSliceOccupancy * 100).toFixed(1)}%</strong>
            </div>
            <div className="stack-summary-item">
              <span>Peak slice occupancy</span>
              <strong>{sliceStack.diagnostics.peakSliceOccupancy} voxels</strong>
            </div>
            <div className="stack-summary-item">
              <span>Mesh topology</span>
              <strong>{sliceStack.mesh.triangleCount} triangles / {sliceStack.mesh.vertexCount} vertices</strong>
            </div>
            <div className="stack-summary-item">
              <span>Coverage samples</span>
              <strong>{sliceStack.diagnostics.coverageSamplesPerCell} base / {sliceStack.diagnostics.refinedCoverageSamplesPerCell} refined</strong>
            </div>
            <div className="stack-summary-item">
              <span>Refined cells</span>
              <strong>{sliceStack.diagnostics.refinedCellCount} boundary cells</strong>
            </div>
          </div>
          <div className="stl-slicer-export">
            <button
              type="button"
              className="action-button"
              onClick={() => {
                if (!slicerOutput) return;
                downloadExport('stl-slicer-output.json', serializeSlicerOutput(slicerOutput), 'application/json');
              }}
            >
              Export output JSON
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => {
                if (!sliceStack) return;
                downloadExport('stl-slicer-slices.csv', serializeSliceStackCsv(sliceStack), 'text/csv');
              }}
            >
              Export slice CSV
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => {
                if (!playbackTimeline) return;
                downloadExport('stl-slicer-timeline.json', serializePlaybackTimelineJson(playbackTimeline), 'application/json');
              }}
            >
              Export timeline JSON
            </button>
          </div>
          <div className="stl-slicer-timeline-strip" aria-label="Slice timeline preview">
            {playbackTimeline.steps.map((step) => (
              <button
                key={step.stepIndex}
                type="button"
                className={step.stepIndex === playbackStep?.step ? 'stl-slicer-timeline-cell stl-slicer-timeline-cell-active' : 'stl-slicer-timeline-cell'}
                onClick={() => goToStep(step.stepIndex)}
                aria-label={`Go to step ${step.stepIndex}`}
              >
                {step.projectedFrame.occupancyMask.some((row) => row.some(Boolean)) ? '*' : ''}
              </button>
            ))}
          </div>
          <div className="stl-slicer-preview-rail" aria-label="Compact slice preview">
            {previewSteps.map((step) => {
              const totalCells = step.projectedFrame.occupancyMask.length * (step.projectedFrame.occupancyMask[0]?.length ?? 0);
              const activeCells = step.projectedFrame.occupancyMask.reduce(
                (count, row) => count + row.reduce((rowCount, active) => rowCount + (active ? 1 : 0), 0),
                0,
              );
              const fillPercent = totalCells > 0 ? (activeCells / totalCells) * 100 : 0;
              return (
                <button
                  key={step.stepIndex}
                  type="button"
                  className={step.stepIndex === playbackStep?.step ? 'stl-slicer-preview-card stl-slicer-preview-card-active' : 'stl-slicer-preview-card'}
                  onClick={() => goToStep(step.stepIndex)}
                  aria-label={`Preview step ${step.stepIndex}`}
                >
                  <span className="stl-slicer-preview-card-index">#{step.stepIndex}</span>
                  <span className="stl-slicer-preview-card-meter">
                    <span className="stl-slicer-preview-card-meter-fill" style={{ width: `${fillPercent}%` }} />
                  </span>
                  <span className="stl-slicer-preview-card-label">{fillPercent.toFixed(0)}%</span>
                </button>
              );
            })}
          </div>
          <label className="field">
            <span>Playback step <strong>{playbackStep?.step ?? 0}</strong></span>
            <input
              type="range"
              min={0}
              max={Math.max(0, playbackTimeline.steps.length - 1)}
              step={1}
              value={stepIndex}
              onChange={(event) => goToStep(Number(event.target.value))}
            />
          </label>
          <svg className="stl-slicer-preview" viewBox="0 0 100 100" role="img" aria-label="2D slice preview">
            <defs>
              <linearGradient id="stlSliceGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#5aa7c8" />
                <stop offset="100%" stopColor="#f0bf58" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="96" height="96" rx="4" className="stl-slicer-frame" />
            {activeFrame?.occupancyMask.map((row, rowIndex) =>
              row.map((active, columnIndex) => {
                const cellSize = 84 / Math.max(1, row.length);
                const x = 8 + (columnIndex * 84) / Math.max(1, row.length);
                const y = 8 + (rowIndex * 84) / Math.max(1, activeFrame.occupancyMask.length);
                return (
                  <rect
                    key={`${rowIndex}-${columnIndex}`}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx="0.5"
                    className={active ? 'stl-slicer-cell stl-slicer-cell-active' : 'stl-slicer-cell'}
                  />
                );
              }),
            )}
            <line x1="8" y1={planeY} x2="92" y2={planeY} className="stl-slicer-plane-line" />
          </svg>
          <p className="reflectance-volume-summary">
            Source: {state.sourceMetadata.kind === 'file-upload' ? `uploaded file ${state.sourceMetadata.fileName ?? state.sourceMetadata.label}` : state.sourceMetadata.label}
          </p>
          <p className="reflectance-volume-summary">
            Step {playbackStep?.state.stepIndex ?? 0} places the plane at {((playbackStep?.state.planePosition ?? 0) * 100).toFixed(1)}% of the sweep on the {axis.toUpperCase()} axis. The projected frame activates {activeCount} voxels.
          </p>
          <p className="reflectance-volume-summary">
            Coverage averages {(sliceStack.diagnostics.averageSliceCoverage * 100).toFixed(1)}% with a peak slice coverage of {(sliceStack.diagnostics.peakSliceCoverage * 100).toFixed(1)}%.
          </p>
          <p className="reflectance-volume-summary">
            Projection map keeps {playbackStep?.state.projection.projectedSamples.length ?? 0} visible voxels in display-space coordinates for downstream engines.
          </p>
          <p className="reflectance-volume-summary">
            Mapping uses the {playbackStep?.state.projection.mapping.planeAxes.join('/').toUpperCase()} plane with {playbackStep?.state.projection.mapping.depthAxis.toUpperCase()} as depth in normalized unit-volume space.
          </p>
          {projectionPreview ? (
            <p className="reflectance-volume-summary">
              First projected sample lands at ({projectionPreview.displayX.toFixed(3)}, {projectionPreview.displayY.toFixed(3)}) with depth {projectionPreview.depth.toFixed(3)} and intensity {projectionPreview.intensity.toFixed(2)}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
