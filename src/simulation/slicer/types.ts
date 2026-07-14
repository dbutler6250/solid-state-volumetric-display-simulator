/** 3D point used by the STL slicer and playback engine. */
export type MeshPoint3D = [number, number, number];

/** Triangle index triplet into the mesh vertex buffer. */
export type MeshTriangle = [number, number, number];

/** Raw mesh input accepted by the slicer pipeline. */
export type MeshGeometry = {
  vertices: MeshPoint3D[];
  triangles: MeshTriangle[];
};

/** Optional provenance metadata describing where a mesh came from. */
export type MeshSourceMetadata = {
  label: string;
  kind: 'sample' | 'file-upload';
  fileName?: string;
};

/** Axis-aligned bounds in normalized display-volume space. */
export type VolumeBounds = {
  min: MeshPoint3D;
  max: MeshPoint3D;
};

/** Canonical axis identifier used by the slicer contracts. */
export type SlicerAxis = 'x' | 'y' | 'z';

/** A voxel cell in the normalized mesh grid. */
export type VoxelCell = {
  center: MeshPoint3D;
  active: boolean;
  intensity: number;
};

/** Occupancy and projected intensity for a single slice. */
export type SliceFrame = {
  index: number;
  planePosition: number;
  planeCoordinate: number;
  occupancyMask: boolean[][];
  intensityMask: number[][];
};

/** Summary diagnostics for one slice stack. */
export type SliceDiagnostics = {
  activeVoxelCount: number;
  totalVoxelCount: number;
  occupiedSliceCount: number;
  emptySliceCount: number;
  averageSliceOccupancy: number;
  averageSliceCoverage: number;
  peakSliceOccupancy: number;
  peakSliceCoverage: number;
  coverageSamplesPerCell: number;
  refinedCoverageSamplesPerCell: number;
  refinedCellCount: number;
};

/** Reusable slice stack output from the mesh slicer. */
export type SliceStack = {
  axis: SlicerAxis;
  bounds: VolumeBounds;
  gridResolution: number;
  sliceCount: number;
  slices: SliceFrame[];
  diagnostics: SliceDiagnostics;
  mesh: {
    vertexCount: number;
    triangleCount: number;
  };
};

/** Explicit display-plane axes selected from the normalized mesh volume. */
export type DisplayProjectionMapping = {
  planeAxes: [SlicerAxis, SlicerAxis];
  depthAxis: SlicerAxis;
  sourceSpace: 'normalized-unit-volume';
};

/** Visible voxels reported by the playback engine for one time step. */
export type VisibleVoxel = VoxelCell & {
  sliceIndex: number;
  row: number;
  column: number;
};

/** Display-plane projection for a single visible voxel. */
export type DisplayProjectionSample = {
  sliceIndex: number;
  row: number;
  column: number;
  sourceCenter: MeshPoint3D;
  displayX: number;
  displayY: number;
  depth: number;
  intensity: number;
};

/** Explicit mapping from slice-space voxels into display-plane coordinates. */
export type DisplayProjection = {
  axis: SlicerAxis;
  planePosition: number;
  mapping: DisplayProjectionMapping;
  projectedSamples: DisplayProjectionSample[];
};

/** Instantaneous display playback state. */
export type PlaybackStep = {
  stepIndex: number;
  planePosition: number;
  projectedFrame: SliceFrame;
  visibleVoxels: VisibleVoxel[];
  projection: DisplayProjection;
};

/** Deterministic time-ordered playback timeline. */
export type PlaybackTimeline = {
  steps: PlaybackStep[];
};

/** Immutable snapshot that future display engines can consume directly. */
export type SlicerOutput = {
  stack: SliceStack;
  timeline: PlaybackTimeline;
};
