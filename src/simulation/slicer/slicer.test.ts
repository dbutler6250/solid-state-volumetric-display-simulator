import { describe, expect, it } from 'vitest';
import { createSampleHollowSphereMesh } from './stl';
import {
  buildPlaybackTimeline,
  buildSlicerExportEnvelope,
  buildSliceStack,
  buildSlicerOutput,
  getPlaybackStep,
  normalizeMeshToVolumeSpace,
  serializePlaybackTimelineJson,
  serializeSlicerExportEnvelopeJson,
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
    expect(stackA.diagnostics.averageSliceCoverage).toBeGreaterThan(0);
    expect(stackA.diagnostics.peakSliceCoverage).toBeGreaterThan(0);
    expect(stackA.diagnostics.coverageSamplesPerCell).toBe(9);
    expect(stackA.diagnostics.refinedCoverageSamplesPerCell).toBe(25);
    expect(stackA.diagnostics.refinedCellCount).toBeGreaterThan(0);
    expect(stackA.mesh.triangleCount).toBeGreaterThan(0);
    expect(stackA.mesh.vertexCount).toBeGreaterThan(0);
  });
});

describe('playback', () => {
  it('creates a timeline and instantaneous state from the slice stack', () => {
    const stack = buildSliceStack(createSampleHollowSphereMesh(), { sliceCount: 4, gridResolution: 4 });
    const timeline = buildPlaybackTimeline(stack);
    const step = getPlaybackStep(stack, 2);

    expect(timeline.steps).toHaveLength(4);
    expect(timeline.timing.frameIntervalMs).toBeGreaterThan(0);
    expect(timeline.timing.sweepDurationMs).toBeGreaterThan(timeline.timing.frameIntervalMs - 1);
    expect(timeline.steps[0]?.timestampMs).toBeCloseTo(timeline.timing.syncOffsetMs, 6);
    expect(step.step).toBe(2);
    expect(step.state.projectedFrame.index).toBe(2);
    expect(step.state.timestampMs).toBeCloseTo(timeline.steps[2]?.timestampMs ?? 0, 6);
    expect(step.state.visibleVoxels.length).toBeGreaterThan(0);
    expect(step.state.projection.projectedSamples.length).toBeGreaterThan(0);
    expect(step.state.projection.axis).toBe('z');
    expect(step.state.projection.mapping).toEqual({
      planeAxes: ['x', 'y'],
      depthAxis: 'z',
      sourceSpace: 'normalized-unit-volume',
    });
  });

  it('maps the display plane from the active slice axis', () => {
    const mesh = createSampleHollowSphereMesh();
    const stack = buildSliceStack(mesh, { axis: 'x', sliceCount: 3, gridResolution: 3 });
    const step = stack.slices
      .map((_, index) => getPlaybackStep(stack, index))
      .find((candidate) => candidate.state.projection.projectedSamples.length > 0);

    expect(step).toBeDefined();
    expect(step?.state.projection.mapping).toEqual({
      planeAxes: ['y', 'z'],
      depthAxis: 'x',
      sourceSpace: 'normalized-unit-volume',
    });
    const sample = step?.state.projection.projectedSamples[0];
    expect(sample).toBeDefined();
    expect(sample?.displayX).toBeCloseTo(sample?.sourceCenter[1] ?? 0, 6);
    expect(sample?.displayY).toBeCloseTo(sample?.sourceCenter[2] ?? 0, 6);
  });

  it('keeps timing deterministic for the same stack', () => {
    const stack = buildSliceStack(createSampleHollowSphereMesh(), { sliceCount: 5, gridResolution: 5 });
    const timelineA = buildPlaybackTimeline(stack);
    const timelineB = buildPlaybackTimeline(stack);

    expect(timelineA.timing).toEqual(timelineB.timing);
    expect(timelineA.steps.map((step) => step.timestampMs)).toEqual(timelineB.steps.map((step) => step.timestampMs));
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

  it('wraps the output in a versioned export envelope for downstream consumers', () => {
    const output = buildSlicerOutput(createSampleHollowSphereMesh(), { sliceCount: 2, gridResolution: 2 });
    const envelope = buildSlicerExportEnvelope(output, '2026-07-13T00:00:00.000Z');

    expect(envelope).toEqual({
      schema: 'slicer-output',
      version: 1,
      generatedAt: '2026-07-13T00:00:00.000Z',
      output,
    });
    expect(serializeSlicerExportEnvelopeJson(envelope)).toContain('"schema": "slicer-output"');
  });
});
