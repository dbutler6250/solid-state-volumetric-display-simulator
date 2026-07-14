import { describe, expect, it } from 'vitest';
import { createSampleHollowSphereMesh } from './stl';
import {
  buildPlaybackTimeline,
  buildSliceStack,
  buildSlicerOutput,
  getPlaybackStep,
  normalizeMeshToVolumeSpace,
  serializePlaybackTimelineJson,
  serializeSliceStackCsv,
  serializeSlicerOutput,
} from './slicer';

describe('normalizeMeshToVolumeSpace', () => {
  it('centers and scales the mesh into unit volume space', () => {
    const { mesh, bounds } = normalizeMeshToVolumeSpace(createSampleHollowSphereMesh());
    expect(bounds.min).toEqual([0, 0, 0]);
    expect(bounds.max).toEqual([1, 1, 1]);
    expect(mesh.vertices.every((vertex) => vertex.every((value) => value >= 0 && value <= 1))).toBe(true);
  });
});

describe('buildSliceStack', () => {
  it('builds deterministic slices for the same mesh', () => {
    const mesh = createSampleHollowSphereMesh();
    const stackA = buildSliceStack(mesh, { sliceCount: 6, gridResolution: 6 });
    const stackB = buildSliceStack(mesh, { sliceCount: 6, gridResolution: 6 });
    expect(stackA).toEqual(stackB);
    expect(stackA.slices).toHaveLength(6);
    expect(stackA.diagnostics.activeVoxelCount).toBeGreaterThan(0);
    expect(stackA.slices.some((slice) => slice.occupancyMask.some((row) => row.some(Boolean)))).toBe(true);
  });
});

describe('playback', () => {
  it('creates a timeline and instantaneous state from the slice stack', () => {
    const stack = buildSliceStack(createSampleHollowSphereMesh(), { sliceCount: 4, gridResolution: 4 });
    const timeline = buildPlaybackTimeline(stack);
    const step = getPlaybackStep(stack, 2);

    expect(timeline.steps).toHaveLength(4);
    expect(step.step).toBe(2);
    expect(step.state.projectedFrame.index).toBe(2);
    expect(step.state.visibleVoxels.length).toBeGreaterThan(0);
  });
});

describe('buildSlicerOutput', () => {
  it('packages stack and timeline into a stable output contract', () => {
    const output = buildSlicerOutput(createSampleHollowSphereMesh(), { sliceCount: 3, gridResolution: 3 });
    expect(output.stack.slices).toHaveLength(3);
    expect(output.timeline.steps).toHaveLength(3);
    expect(serializeSlicerOutput(output)).toContain('"sliceCount": 3');
    expect(serializePlaybackTimelineJson(output.timeline)).toContain('"steps"');
    expect(serializeSliceStackCsv(output.stack)).toContain('sliceIndex,planePosition');
  });
});
