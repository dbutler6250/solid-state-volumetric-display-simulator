import type {
  DisplayProjection,
  MeshGeometry,
  MeshPoint3D,
  PlaybackTimeline,
  SlicerOutput,
  SliceFrame,
  SliceDiagnostics,
  SliceStack,
  VisibleVoxel,
  VolumeBounds,
  SlicerAxis,
} from './types';

/** Validates, centers, and scales incoming mesh geometry into unit display-volume space. */
export function normalizeMeshToVolumeSpace(mesh: MeshGeometry): { mesh: MeshGeometry; bounds: VolumeBounds } {
  if (!mesh.vertices.length || !mesh.triangles.length) {
    throw new Error('The mesh is empty.');
  }

  const bounds = getMeshBounds(mesh.vertices);
  const sizeX = bounds.max[0] - bounds.min[0];
  const sizeY = bounds.max[1] - bounds.min[1];
  const sizeZ = bounds.max[2] - bounds.min[2];
  const maxSize = Math.max(sizeX, sizeY, sizeZ);
  if (!Number.isFinite(maxSize) || maxSize <= 0) {
    throw new Error('The mesh bounds have zero volume.');
  }

  const center: MeshPoint3D = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const scale = 1 / maxSize;

  const normalizedVertices = mesh.vertices.map((vertex) => {
    const normalized: MeshPoint3D = [
      (vertex[0] - center[0]) * scale + 0.5,
      (vertex[1] - center[1]) * scale + 0.5,
      (vertex[2] - center[2]) * scale + 0.5,
    ];
    if (!normalized.every(Number.isFinite)) {
      throw new Error('The mesh contains non-finite coordinates.');
    }
    return normalized;
  });

  return {
    mesh: { vertices: normalizedVertices, triangles: mesh.triangles.slice() },
    bounds: {
      min: [0, 0, 0],
      max: [1, 1, 1],
    },
  };
}

/** Slices a normalized mesh into evenly spaced planes and coarse occupancy masks. */
export function buildSliceStack(
  mesh: MeshGeometry,
  options: { axis?: SlicerAxis; sliceCount?: number; gridResolution?: number } = {},
): SliceStack {
  const axis = options.axis ?? 'z';
  const sliceCount = Math.max(1, Math.round(options.sliceCount ?? 16));
  const gridResolution = Math.max(2, Math.round(options.gridResolution ?? 12));
  const { mesh: normalizedMesh, bounds } = normalizeMeshToVolumeSpace(mesh);
  const coverageSamplesPerCell = 9;
  const slices: SliceFrame[] = [];
  let activeVoxelCount = 0;
  let occupiedSliceCount = 0;
  let peakSliceOccupancy = 0;
  let coverageAccumulator = 0;
  let peakSliceCoverage = 0;

  for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex += 1) {
    const planePosition = sliceCount === 1 ? 0.5 : (sliceIndex + 0.5) / sliceCount;
    const planeCoordinate = planePosition;
    const occupancyMask: boolean[][] = [];
    const intensityMask: number[][] = [];
    let sliceActiveVoxelCount = 0;
    let sliceCoverageSum = 0;

    for (let row = 0; row < gridResolution; row += 1) {
      const occupancyRow: boolean[] = [];
      const intensityRow: number[] = [];
      for (let column = 0; column < gridResolution; column += 1) {
        const coverage = getCellCoverage(normalizedMesh, axis, planePosition, row, column, gridResolution);
        const active = coverage > 0;
        occupancyRow.push(active);
        intensityRow.push(coverage);
        sliceCoverageSum += coverage;
        if (active) {
          sliceActiveVoxelCount += 1;
        }
      }
      occupancyMask.push(occupancyRow);
      intensityMask.push(intensityRow);
    }

    activeVoxelCount += sliceActiveVoxelCount;
    coverageAccumulator += sliceCoverageSum;
    if (sliceActiveVoxelCount > 0) {
      occupiedSliceCount += 1;
    }
    peakSliceOccupancy = Math.max(peakSliceOccupancy, sliceActiveVoxelCount);
    peakSliceCoverage = Math.max(peakSliceCoverage, sliceCoverageSum);
    slices.push({ index: sliceIndex, planePosition, planeCoordinate, occupancyMask, intensityMask });
  }

  const diagnostics = buildSliceDiagnostics({
    activeVoxelCount,
    occupiedSliceCount,
    sliceCount,
    sliceResolution: gridResolution * gridResolution,
    peakSliceOccupancy,
    averageSliceCoverage: coverageAccumulator,
    peakSliceCoverage,
    coverageSamplesPerCell,
  });

  return {
    axis,
    bounds,
    gridResolution,
    sliceCount,
    slices,
    diagnostics,
    mesh: {
      vertexCount: normalizedMesh.vertices.length,
      triangleCount: normalizedMesh.triangles.length,
    },
  };
}

/** Replays the slice stack as a deterministic display timeline. */
export function buildPlaybackTimeline(stack: SliceStack): PlaybackTimeline {
  return {
    steps: stack.slices.map((slice, stepIndex) => ({
      stepIndex,
      planePosition: slice.planePosition,
      projectedFrame: slice,
      visibleVoxels: buildVisibleVoxels(stack, slice),
      projection: buildDisplayProjection(stack, slice),
    })),
  };
}

/** Returns the instantaneous playback state for the requested step index. */
export function getPlaybackStep(stack: SliceStack, stepIndex: number): { step: number; state: PlaybackTimeline['steps'][number] } {
  const clampedIndex = Math.min(stack.slices.length - 1, Math.max(0, Math.round(stepIndex)));
  const projectedFrame = stack.slices[clampedIndex];
  return {
    step: clampedIndex,
    state: {
      stepIndex: clampedIndex,
      planePosition: projectedFrame.planePosition,
      projectedFrame,
      visibleVoxels: buildVisibleVoxels(stack, projectedFrame),
      projection: buildDisplayProjection(stack, projectedFrame),
    },
  };
}

/** Returns the stable slicer output contract for engine consumers and exports. */
export function buildSlicerOutput(mesh: MeshGeometry, options: { axis?: SlicerAxis; sliceCount?: number; gridResolution?: number } = {}): SlicerOutput {
  const stack = buildSliceStack(mesh, options);
  return {
    stack,
    timeline: buildPlaybackTimeline(stack),
  };
}

/** Serializes a slicer output snapshot into a deterministic JSON payload. */
export function serializeSlicerOutput(output: SlicerOutput): string {
  return JSON.stringify(output, null, 2);
}

/** Serializes a slice stack to a compact CSV summary for downstream tools. */
export function serializeSliceStackCsv(stack: SliceStack): string {
  const lines = ['sliceIndex,planePosition,planeCoordinate,activeVoxelCount,totalVoxelCount,occupancyPercent'];
  for (const slice of stack.slices) {
    const activeVoxelCount = slice.occupancyMask.reduce(
      (count, row) => count + row.reduce((rowCount, active) => rowCount + (active ? 1 : 0), 0),
      0,
    );
    const totalVoxelCount = stack.gridResolution * stack.gridResolution;
    const occupancyPercent = totalVoxelCount > 0 ? (activeVoxelCount / totalVoxelCount) * 100 : 0;
    lines.push([
      slice.index,
      slice.planePosition.toFixed(6),
      slice.planeCoordinate.toFixed(6),
      activeVoxelCount,
      totalVoxelCount,
      occupancyPercent.toFixed(3),
    ].join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** Serializes the deterministic playback timeline to JSON for inspection or export. */
export function serializePlaybackTimelineJson(timeline: PlaybackTimeline): string {
  return JSON.stringify(timeline, null, 2);
}

function buildSliceDiagnostics(params: {
  activeVoxelCount: number;
  occupiedSliceCount: number;
  averageSliceCoverage: number;
  peakSliceOccupancy: number;
  peakSliceCoverage: number;
  sliceCount: number;
  sliceResolution: number;
  coverageSamplesPerCell: number;
}): SliceDiagnostics {
  const totalVoxelCount = params.sliceCount * params.sliceResolution;
  return {
    activeVoxelCount: params.activeVoxelCount,
    totalVoxelCount,
    occupiedSliceCount: params.occupiedSliceCount,
    emptySliceCount: params.sliceCount - params.occupiedSliceCount,
    averageSliceOccupancy: totalVoxelCount > 0 ? params.activeVoxelCount / totalVoxelCount : 0,
    averageSliceCoverage: totalVoxelCount > 0 ? params.averageSliceCoverage / totalVoxelCount : 0,
    peakSliceOccupancy: params.peakSliceOccupancy,
    peakSliceCoverage: params.peakSliceCoverage,
    coverageSamplesPerCell: params.coverageSamplesPerCell,
  };
}

function getCellCoverage(
  mesh: MeshGeometry,
  axis: SlicerAxis,
  planePosition: number,
  row: number,
  column: number,
  gridResolution: number,
): number {
  const samples = [
    getSamplePoint(axis, planePosition, row + 1 / 6, column + 1 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 1 / 6, column + 3 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 1 / 6, column + 5 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 3 / 6, column + 1 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 3 / 6, column + 3 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 3 / 6, column + 5 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 5 / 6, column + 1 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 5 / 6, column + 3 / 6, gridResolution),
    getSamplePoint(axis, planePosition, row + 5 / 6, column + 5 / 6, gridResolution),
  ];
  let hitCount = 0;
  for (const sample of samples) {
    if (isPointInsideMesh(mesh, sample, axis)) {
      hitCount += 1;
    }
  }
  return hitCount / samples.length;
}

function buildVisibleVoxels(stack: SliceStack, slice: SliceFrame): VisibleVoxel[] {
  const voxels: VisibleVoxel[] = [];
  for (let row = 0; row < stack.gridResolution; row += 1) {
    for (let column = 0; column < stack.gridResolution; column += 1) {
      if (!slice.occupancyMask[row]?.[column]) continue;
      voxels.push({
        sliceIndex: slice.index,
        row,
        column,
        center: getVoxelCenter(stack.axis, slice.planePosition, row, column, stack.gridResolution),
        active: true,
        intensity: slice.intensityMask[row]?.[column] ?? 0,
      });
    }
  }
  return voxels;
}

/** Maps visible voxels into deterministic display-plane coordinates for downstream engines. */
function buildDisplayProjection(stack: SliceStack, slice: SliceFrame): DisplayProjection {
  const mapping = getDisplayProjectionMapping(stack.axis);
  const projectedSamples = buildVisibleVoxels(stack, slice).map((voxel) => ({
    sliceIndex: voxel.sliceIndex,
    row: voxel.row,
    column: voxel.column,
    sourceCenter: voxel.center,
    displayX: voxel.center[getAxisIndex(mapping.planeAxes[0])],
    displayY: voxel.center[getAxisIndex(mapping.planeAxes[1])],
    depth: voxel.center[getAxisIndex(mapping.depthAxis)],
    intensity: voxel.intensity,
  }));

  return {
    axis: stack.axis,
    planePosition: slice.planePosition,
    mapping,
    projectedSamples,
  };
}

/** Keeps the exported projection contract aligned with the active slice axis. */
function getDisplayProjectionMapping(axis: SlicerAxis): DisplayProjection['mapping'] {
  if (axis === 'x') {
    return { planeAxes: ['y', 'z'], depthAxis: 'x', sourceSpace: 'normalized-unit-volume' };
  }
  if (axis === 'y') {
    return { planeAxes: ['x', 'z'], depthAxis: 'y', sourceSpace: 'normalized-unit-volume' };
  }
  return { planeAxes: ['x', 'y'], depthAxis: 'z', sourceSpace: 'normalized-unit-volume' };
}

/** Converts a slicer axis into the matching normalized coordinate index. */
function getAxisIndex(axis: SlicerAxis): number {
  if (axis === 'x') return 0;
  if (axis === 'y') return 1;
  return 2;
}

function isPointInsideMesh(mesh: MeshGeometry, point: MeshPoint3D, axis: 'x' | 'y' | 'z'): boolean {
  const rayAxis = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const origin: MeshPoint3D = [point[0], point[1], point[2]];
  origin[rayAxis] = -1;
  const direction: MeshPoint3D = [0, 0, 0];
  direction[rayAxis] = 1;
  const maxDistance = point[rayAxis] - origin[rayAxis];

  const intersections: number[] = [];
  for (const triangle of mesh.triangles) {
    const a = mesh.vertices[triangle[0]];
    const b = mesh.vertices[triangle[1]];
    const c = mesh.vertices[triangle[2]];
    const hit = intersectRayTriangle(origin, direction, a, b, c);
    if (hit !== null && hit > 0 && hit <= maxDistance) {
      intersections.push(hit);
    }
  }

  intersections.sort((left, right) => left - right);
  let uniqueHits = 0;
  let previousHit = Number.NEGATIVE_INFINITY;
  for (const hit of intersections) {
    if (Math.abs(hit - previousHit) > 1e-7) {
      uniqueHits += 1;
      previousHit = hit;
    }
  }

  return uniqueHits % 2 === 1;
}

function intersectRayTriangle(
  origin: MeshPoint3D,
  direction: MeshPoint3D,
  v0: MeshPoint3D,
  v1: MeshPoint3D,
  v2: MeshPoint3D,
): number | null {
  const epsilon = 1e-9;
  const edge1 = subtract(v1, v0);
  const edge2 = subtract(v2, v0);
  const pVec = cross(direction, edge2);
  const determinant = dot(edge1, pVec);
  if (Math.abs(determinant) < epsilon) return null;

  const inverseDeterminant = 1 / determinant;
  const tVec = subtract(origin, v0);
  const u = dot(tVec, pVec) * inverseDeterminant;
  if (u < -epsilon || u > 1 + epsilon) return null;

  const qVec = cross(tVec, edge1);
  const v = dot(direction, qVec) * inverseDeterminant;
  if (v < -epsilon || u + v > 1 + epsilon) return null;

  const t = dot(edge2, qVec) * inverseDeterminant;
  return t >= epsilon ? t : null;
}

function getSamplePoint(
  axis: SlicerAxis,
  planePosition: number,
  row: number,
  column: number,
  gridResolution: number,
): MeshPoint3D {
  const u = (column + 0.5) / gridResolution;
  const v = (row + 0.5) / gridResolution;
  if (axis === 'x') return [planePosition, u, v];
  if (axis === 'y') return [u, planePosition, v];
  return [u, v, planePosition];
}

function getVoxelCenter(
  axis: SlicerAxis,
  planePosition: number,
  row: number,
  column: number,
  gridResolution: number,
): MeshPoint3D {
  return getSamplePoint(axis, planePosition, row, column, gridResolution);
}

function getMeshBounds(vertices: MeshPoint3D[]): VolumeBounds {
  const min: MeshPoint3D = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max: MeshPoint3D = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const vertex of vertices) {
    for (let index = 0; index < 3; index += 1) {
      if (!Number.isFinite(vertex[index])) {
        throw new Error('The mesh contains non-finite coordinates.');
      }
      min[index] = Math.min(min[index], vertex[index]);
      max[index] = Math.max(max[index], vertex[index]);
    }
  }
  return { min, max };
}

function subtract(a: MeshPoint3D, b: MeshPoint3D): MeshPoint3D {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: MeshPoint3D, b: MeshPoint3D): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: MeshPoint3D, b: MeshPoint3D): MeshPoint3D {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
