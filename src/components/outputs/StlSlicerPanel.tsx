import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { buildPlaybackTimeline, buildSliceStack, getPlaybackStep } from '../../simulation/slicer/slicer';
import { createSampleCubeMesh, parseStlBytes } from '../../simulation/slicer/stl';
import type { MeshGeometry } from '../../simulation/slicer/types';

type StlSlicerPanelState = {
  mesh: MeshGeometry | null;
  sourceLabel: string;
  error: string | null;
};

/** Demonstrates the STL slicer and playback foundation with a deterministic preview. */
export function StlSlicerPanel() {
  const [state, setState] = useState<StlSlicerPanelState>({
    mesh: createSampleCubeMesh(),
    sourceLabel: 'Sample cube mesh',
    error: null,
  });
  const [sliceCount, setSliceCount] = useState(12);
  const [gridResolution, setGridResolution] = useState(10);
  const [stepIndex, setStepIndex] = useState(0);
  const [fileName, setFileName] = useState('sample-cube.stl');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const sliceStack = useMemo(() => {
    if (!state.mesh) return null;
    try {
      return buildSliceStack(state.mesh, { sliceCount, gridResolution, axis: 'z' });
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'The mesh could not be sliced.' };
    }
  }, [gridResolution, sliceCount, state.mesh]);

  const playbackTimeline = useMemo(
    () => (sliceStack && 'slices' in sliceStack ? buildPlaybackTimeline(sliceStack) : null),
    [sliceStack],
  );
  const playbackStep = useMemo(() => {
    if (!sliceStack || !('slices' in sliceStack)) return null;
    return getPlaybackStep(sliceStack, stepIndex);
  }, [sliceStack, stepIndex]);

  const activeFrame = playbackStep?.state.projectedFrame;
  const activeCount = playbackStep?.state.visibleVoxels.length ?? 0;
  const totalCount = activeFrame
    ? activeFrame.occupancyMask.length * (activeFrame.occupancyMask[0]?.length ?? 0)
    : 0;
  const planeY = activeFrame ? 8 + activeFrame.planePosition * 84 : 8;

  const loadSample = () => {
    setState({ mesh: createSampleCubeMesh(), sourceLabel: 'Sample cube mesh', error: null });
    setFileName('sample-cube.stl');
    setStepIndex(0);
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
        setState({ mesh, sourceLabel: file.name, error: null });
        setFileName(file.name);
        setStepIndex(0);
      } catch (error) {
        setState({
          mesh: null,
          sourceLabel: 'Failed import',
          error: error instanceof Error ? error.message : 'The STL file could not be read.',
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

  return (
    <div className="stl-slicer-panel">
      <div className="stack-panel-heading">
        <h2>STL Slicer</h2>
        <span>{state.sourceLabel}</span>
      </div>
      <p className="reflectance-volume-hint">
        Upload an STL file, normalize it into display-volume space, slice it along `z`, and replay the plane sweep.
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
            Load sample cube
          </button>
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
          </div>
          <label className="field">
            <span>Playback step <strong>{playbackStep?.step ?? 0}</strong></span>
            <input
              type="range"
              min={0}
              max={Math.max(0, playbackTimeline.steps.length - 1)}
              step={1}
              value={stepIndex}
              onChange={(event) => setStepIndex(Number(event.target.value))}
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
            Step {playbackStep?.state.stepIndex ?? 0} places the plane at {((playbackStep?.state.planePosition ?? 0) * 100).toFixed(1)}% of the sweep. The projected frame activates {activeCount} voxels.
          </p>
        </div>
      ) : null}
    </div>
  );
}
