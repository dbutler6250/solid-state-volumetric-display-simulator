import { describe, expect, it } from 'vitest';
import { createSampleCubeMesh } from './stl';
import { buildPlaybackTimeline, buildSliceStack, getPlaybackStep, normalizeMeshToVolumeSpace } from './slicer';

describe('normalizeMeshToVolumeSpace', () => {
  it('centers and scales the mesh into unit volume space', () => {
    const { mesh, bounds } = normalizeMeshToVolumeSpace(createSampleCubeMesh());
    expect(bounds.min).toEqual([0, 0, 0]);
    expect(bounds.max).toEqual([1, 1, 1]);
    expect(mesh.vertices.every((vertex) => vertex.every((value) => value >= 0 && value <= 1))).toBe(true);
  });
});

describe('buildSliceStack', () => {
  it('builds deterministic slices for the same mesh', () => {
    const mesh = createSampleCubeMesh();
    const stackA = buildSliceStack(mesh, { sliceCount: 6, gridResolution: 6 });
    const stackB = buildSliceStack(mesh, { sliceCount: 6, gridResolution: 6 });
    expect(stackA).toEqual(stackB);
    expect(stackA.slices).toHaveLength(6);
    expect(stackA.slices[0].occupancyMask.some((row) => row.some(Boolean))).toBe(true);
  });
});

describe('playback', () => {
  it('creates a timeline and instantaneous state from the slice stack', () => {
    const stack = buildSliceStack(createSampleCubeMesh(), { sliceCount: 4, gridResolution: 4 });
    const timeline = buildPlaybackTimeline(stack);
    const step = getPlaybackStep(stack, 2);

    expect(timeline.steps).toHaveLength(4);
    expect(step.step).toBe(2);
    expect(step.state.projectedFrame.index).toBe(2);
    expect(step.state.visibleVoxels.length).toBeGreaterThan(0);
  });
});
