import type { LayerStack } from '../simulation/layers/stack';
import type { ResolvedStructure } from '../simulation/structures/structureResolver';
import type { SimulationDocument, SimulationResult } from '../types/simulation';

export type ReflectanceVolumeDisplayMode = 'volume' | 'plane';
export type ReflectanceVolumeOverlayMode = 'none' | 'ghosted-stack' | 'transparent-medium';

export type ReflectanceVolumeCell = {
  position: [number, number, number];
  intensity: number;
  phaseOffset: number;
};

export type ReflectanceVolumeScene = {
  mode: ReflectanceVolumeDisplayMode;
  overlayMode: ReflectanceVolumeOverlayMode;
  field: {
    width: number;
    height: number;
    depth: number;
    cells: ReflectanceVolumeCell[];
  };
  medium: {
    opacity: number;
    clipFraction: number;
    phaseRate: number;
  };
  summary: {
    title: string;
    subtitle: string;
    peakReflectance: number;
    normalizedIntensity: number;
    sourceLabel: string;
    stackLayerCount: number;
  };
};

const DEFAULT_FIELD_RESOLUTION = 6;
const DEFAULT_CLIP_FRACTION = 0.35;

/** Builds a reusable 3D scene description from the canonical resolved structure and solver output. */
export function buildReflectanceVolumeScene(
  document: SimulationDocument,
  resolved: ResolvedStructure,
  result: SimulationResult,
  options: {
    mode?: ReflectanceVolumeDisplayMode;
    overlayMode?: ReflectanceVolumeOverlayMode;
    sliceIndex?: number;
    threshold?: number;
    clipFraction?: number;
  } = {},
): ReflectanceVolumeScene {
  const mode = options.mode ?? 'volume';
  const overlayMode = options.overlayMode ?? 'ghosted-stack';
  const threshold = clamp01(options.threshold ?? 0.2);
  const clipFraction = clamp01(options.clipFraction ?? DEFAULT_CLIP_FRACTION);
  const sourceLabel =
    resolved.summary.type === 'quarter-wave-stack'
      ? `${resolved.summary.periodCount} periods, ${resolved.summary.layerCount} layers`
      : `${resolved.summary.layerCount} acoustic slices`;
  const normalizedIntensity = clamp01(result.peakReflectance);
  const cells = createCells(resolved.stack, normalizedIntensity, {
    sliceIndex: options.sliceIndex,
    threshold,
    mode,
  });

  return {
    mode,
    overlayMode,
    field: {
      width: DEFAULT_FIELD_RESOLUTION,
      height: DEFAULT_FIELD_RESOLUTION,
      depth: Math.max(DEFAULT_FIELD_RESOLUTION, Math.min(18, Math.round(resolved.stack.layers.length / 2))),
      cells,
    },
    medium: {
      opacity: overlayMode === 'transparent-medium' ? 0.18 : 0.32,
      clipFraction,
      phaseRate: getPhaseRate(document, resolved, result),
    },
    summary: {
      title:
        resolved.summary.type === 'quarter-wave-stack' ? 'Quarter-wave proxy field' : 'Acoustic proxy field',
      subtitle:
        mode === 'plane'
          ? 'Single moving reflectance plane'
          : 'Volume proxy with thresholded intensity cells',
      peakReflectance: result.peakReflectance,
      normalizedIntensity,
      sourceLabel,
      stackLayerCount: resolved.stack.layers.length,
    },
  };
}

function createCells(
  stack: LayerStack,
  normalizedIntensity: number,
  options: {
    sliceIndex?: number;
    threshold: number;
    mode: ReflectanceVolumeDisplayMode;
  },
): ReflectanceVolumeCell[] {
  const cells: ReflectanceVolumeCell[] = [];
  const resolution = DEFAULT_FIELD_RESOLUTION;
  const activeSlice = clampInteger(options.sliceIndex ?? Math.floor(resolution / 2), 0, resolution - 1);
  const sliceBias = resolution > 1 ? activeSlice / (resolution - 1) : 0.5;
  const layerWeight = stack.layers.length > 0 ? stack.layers.length / (stack.layers.length + 8) : 0.25;

  for (let z = 0; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const centeredX = (x / (resolution - 1)) * 2 - 1;
        const centeredY = (y / (resolution - 1)) * 2 - 1;
        const centeredZ = (z / (resolution - 1)) * 2 - 1;
        const radialFalloff = Math.max(0, 1 - Math.hypot(centeredX, centeredY, centeredZ) * 0.55);
        const planeFalloff =
          options.mode === 'plane'
            ? Math.max(0, 1 - Math.abs(z / Math.max(1, resolution - 1) - sliceBias) * 4)
            : 1;
        const intensity = clamp01(normalizedIntensity * radialFalloff * planeFalloff * layerWeight);
        if (intensity < options.threshold) continue;
        cells.push({
          position: [centeredX, centeredY, centeredZ],
          intensity,
          phaseOffset: (x + y + z) / Math.max(1, resolution * 3),
        });
      }
    }
  }

  return cells;
}

function getPhaseRate(document: SimulationDocument, resolved: ResolvedStructure, result: SimulationResult): number {
  const analysisWeight = document.analysis.wavelengthPointCount / 500;
  const structureWeight =
    resolved.summary.type === 'quarter-wave-stack'
      ? resolved.summary.periodCount / 16
      : resolved.summary.layerCount / 80;
  return clamp01(0.25 + result.peakReflectance * 0.5 + analysisWeight * 0.1 + structureWeight * 0.15);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
