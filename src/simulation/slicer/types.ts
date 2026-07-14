/** 3D point used by the STL slicer and playback engine. */
export type MeshPoint3D = [number, number, number];

/** Triangle index triplet into the mesh vertex buffer. */
export type MeshTriangle = [number, number, number];

/** Raw mesh input accepted by the slicer pipeline. */
export type MeshGeometry = {
  vertices: MeshPoint3D[];
  triangles: MeshTriangle[];
};

/** Axis-aligned bounds in normalized display-volume space. */
export type VolumeBounds = {
  min: MeshPoint3D;
  max: MeshPoint3D;
};

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
  occupancyMask: boolean[][];
  intensityMask: number[][];
};

/** Reusable slice stack output from the mesh slicer. */
export type SliceStack = {
  axis: 'x' | 'y' | 'z';
  bounds: VolumeBounds;
  gridResolution: number;
  sliceCount: number;
  slices: SliceFrame[];
};

/** Visible voxels reported by the playback engine for one time step. */
export type VisibleVoxel = VoxelCell & {
  sliceIndex: number;
  row: number;
  column: number;
};

/** Instantaneous display playback state. */
export type PlaybackStep = {
  stepIndex: number;
  planePosition: number;
  projectedFrame: SliceFrame;
  visibleVoxels: VisibleVoxel[];
};

/** Deterministic time-ordered playback timeline. */
export type PlaybackTimeline = {
  steps: PlaybackStep[];
};
