import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import { createSimulationDocument, resolveSimulationDocument } from '../simulation/structures/structureResolver';
import { solveResolvedStructure } from '../simulation/solvers/transferMatrix';
import { buildReflectanceVolumeScene, getReflectancePlaneTransform } from './reflectanceVolumeScene';

describe('reflectance volume scene', () => {
  it('builds reusable proxy scene metadata from the canonical resolved structure', () => {
    const document = createSimulationDocument(DEFAULT_QUARTER_WAVE_STACK_INPUTS);
    const resolved = resolveSimulationDocument(document);
    const result = solveResolvedStructure(resolved, document.analysis);
    const scene = buildReflectanceVolumeScene(document, resolved, result, {
      mode: 'volume',
      threshold: 0.1,
      clipFraction: 0.4,
    });

    expect(scene.mode).toBe('volume');
    expect(scene.summary.stackLayerCount).toBe(resolved.stack.layers.length);
    expect(scene.summary.sourceLabel).toContain('periods');
    expect(scene.field.cells.length).toBeGreaterThan(0);
    expect(scene.field.cells.every((cell) => cell.intensity >= 0.1)).toBe(true);
  });

  it('switches the proxy emphasis between plane and volume views', () => {
    const document = createSimulationDocument(DEFAULT_QUARTER_WAVE_STACK_INPUTS);
    const resolved = resolveSimulationDocument(document);
    const result = solveResolvedStructure(resolved, document.analysis);
    const volume = buildReflectanceVolumeScene(document, resolved, result, { mode: 'volume' });
    const plane = buildReflectanceVolumeScene(document, resolved, result, { mode: 'plane', sliceIndex: 4 });

    expect(volume.field.cells.length).toBeGreaterThan(plane.field.cells.length);
    expect(plane.summary.subtitle).toContain('plane');
    expect(plane.medium.clipFraction).toBeGreaterThanOrEqual(0);
    expect(plane.medium.clipFraction).toBeLessThanOrEqual(1);
  });

  it('distinguishes the overlay modes in the scene metadata', () => {
    const document = createSimulationDocument(DEFAULT_QUARTER_WAVE_STACK_INPUTS);
    const resolved = resolveSimulationDocument(document);
    const result = solveResolvedStructure(resolved, document.analysis);
    const ghosted = buildReflectanceVolumeScene(document, resolved, result, {
      overlayMode: 'ghosted-stack',
    });
    const glass = buildReflectanceVolumeScene(document, resolved, result, {
      overlayMode: 'transparent-medium',
    });
    const shellOnly = buildReflectanceVolumeScene(document, resolved, result, {
      overlayMode: 'none',
    });

    expect(ghosted.overlays.showGhostedStack).toBe(true);
    expect(ghosted.overlays.showInteriorDetail).toBe(true);
    expect(glass.overlays.showGhostedStack).toBe(false);
    expect(glass.overlays.showInteriorDetail).toBe(true);
    expect(shellOnly.overlays.showShell).toBe(true);
    expect(shellOnly.overlays.showInteriorDetail).toBe(false);
  });

  it('maps normalized plane phases to a moving plane position', () => {
    expect(getReflectancePlaneTransform(0)).toMatchObject({ phase: 0, positionZ: -1 });
    expect(getReflectancePlaneTransform(0.5)).toMatchObject({ phase: 0.5, positionZ: 0 });
    expect(getReflectancePlaneTransform(1)).toMatchObject({ phase: 1, positionZ: 1 });
  });
});
