import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import { createSimulationDocument, resolveSimulationDocument } from '../simulation/structures/structureResolver';
import { solveResolvedStructure } from '../simulation/solvers/transferMatrix';
import { buildReflectanceVolumeScene } from './reflectanceVolumeScene';

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
});
