import type { LayerStack } from '../layers/stack';
import type { OpticalLayer } from '../layers/layer';
import { AIR } from '../materials/catalog';
import type { AcousticDesignInputs, QuarterWaveStackInputs } from '../../types/simulation';

const DEFAULT_ACOUSTIC_REPRESENTATION_SLICES: Record<AcousticDesignInputs['acousticRepresentationMode'], number> = {
  binary: 2,
  fast: 8,
  accurate: 16,
  reference: 32,
};

const ACOUSTIC_LAYER_YIELD_INTERVAL = 4096;

/** Default acoustic design values used when the acoustic generator is enabled. */
export const DEFAULT_ACOUSTIC_DESIGN_INPUTS: AcousticDesignInputs = {
  acousticMaterial: {
    id: 'fused-silica',
    name: 'Fused silica',
    refractiveIndex: 1.45,
  },
  acousticVelocityMps: 5970,
  acousticFrequencyHz: 1e9,
  acousticPeriodCount: 10,
  braggOrder: 1,
  acousticIndexModulation: 0.002,
  acousticRepresentationMode: 'accurate',
};

export type AcousticGenerationProgress = {
  completedLayers: number;
  totalLayers: number;
};

/** Returns the acoustic wavelength in the propagation medium. */
export function getAcousticWavelengthNm(inputs: AcousticDesignInputs): number {
  if (!Number.isFinite(inputs.acousticVelocityMps) || !Number.isFinite(inputs.acousticFrequencyHz) || inputs.acousticFrequencyHz <= 0) {
    return Number.NaN;
  }

  return (inputs.acousticVelocityMps / inputs.acousticFrequencyHz) * 1e9;
}

/** Returns the number of slices per acoustic period for the chosen approximation. */
export function getAcousticSlicesPerPeriod(mode: AcousticDesignInputs['acousticRepresentationMode']): number {
  return DEFAULT_ACOUSTIC_REPRESENTATION_SLICES[mode];
}

/** Builds a discretized acoustic grating as a homogeneous optical stack. */
export function buildAcousticGratingStack(inputs: QuarterWaveStackInputs): LayerStack | null {
  const design = inputs.acousticDesign;
  if (!design) {
    return null;
  }

  const slicesPerPeriod = getAcousticSlicesPerPeriod(design.acousticRepresentationMode);
  const acousticWavelengthNm = getAcousticWavelengthNm(design);

  if (!Number.isFinite(acousticWavelengthNm) || acousticWavelengthNm <= 0) {
    return null;
  }

  const sliceThicknessNm = acousticWavelengthNm / slicesPerPeriod;
  const totalSlices = Math.max(0, Math.round(design.acousticPeriodCount)) * slicesPerPeriod;
  const layers = buildAcousticLayers(design, sliceThicknessNm, totalSlices);

  return {
    incidentMedium: AIR,
    layers,
    exitMedium: AIR,
  };
}

/** Builds the acoustic stack in chunks so the UI can stay responsive while large stacks are materialized. */
export async function buildAcousticGratingStackAsync(
  inputs: QuarterWaveStackInputs,
  onProgress?: (progress: AcousticGenerationProgress) => void,
  signal?: AbortSignal,
): Promise<LayerStack | null> {
  const design = inputs.acousticDesign;
  if (!design) return null;

  const slicesPerPeriod = getAcousticSlicesPerPeriod(design.acousticRepresentationMode);
  const acousticWavelengthNm = getAcousticWavelengthNm(design);
  if (!Number.isFinite(acousticWavelengthNm) || acousticWavelengthNm <= 0) return null;

  const sliceThicknessNm = acousticWavelengthNm / slicesPerPeriod;
  const totalSlices = Math.max(0, Math.round(design.acousticPeriodCount)) * slicesPerPeriod;
  const layers: OpticalLayer[] = [];
  for (let sliceIndex = 0; sliceIndex < totalSlices; sliceIndex += 1) {
    if (signal?.aborted) {
      return null;
    }

    layers.push(buildAcousticLayer(design, sliceIndex, sliceThicknessNm, slicesPerPeriod));
    if (sliceIndex > 0 && sliceIndex % ACOUSTIC_LAYER_YIELD_INTERVAL === 0) {
      onProgress?.({ completedLayers: sliceIndex, totalLayers: totalSlices });
      await yieldToBrowser();
    }
  }

  onProgress?.({ completedLayers: totalSlices, totalLayers: totalSlices });
  return {
    incidentMedium: AIR,
    layers,
    exitMedium: AIR,
  };
}

/** Returns derived quantities for display alongside the generated acoustic grating. */
export function getAcousticDesignSummary(inputs: QuarterWaveStackInputs) {
  const design = inputs.acousticDesign;
  if (!design) {
    return null;
  }

  const acousticWavelengthNm = getAcousticWavelengthNm(design);
  const slicesPerPeriod = getAcousticSlicesPerPeriod(design.acousticRepresentationMode);
  const periodLengthNm = Number.isFinite(acousticWavelengthNm) ? acousticWavelengthNm : Number.NaN;
  const totalLengthNm = Number.isFinite(periodLengthNm)
    ? periodLengthNm * Math.max(0, Math.round(design.acousticPeriodCount))
    : Number.NaN;
  const braggWavelengthNm = Number.isFinite(acousticWavelengthNm)
    ? (2 * getOpticalIndex(design) * acousticWavelengthNm) / Math.max(1, design.braggOrder)
    : Number.NaN;

  return {
    acousticWavelengthNm,
    slicesPerPeriod,
    periodLengthNm,
    totalLengthNm,
    braggWavelengthNm,
    estimatedLayers: Math.max(0, Math.round(design.acousticPeriodCount)) * slicesPerPeriod,
  };
}

/** Returns the derived total layer count for the configured acoustic representation. */
export function getAcousticEstimatedLayerCount(inputs: QuarterWaveStackInputs): number {
  const design = inputs.acousticDesign;
  if (!design) return 0;
  return Math.max(0, Math.round(design.acousticPeriodCount)) * getAcousticSlicesPerPeriod(design.acousticRepresentationMode);
}

function buildAcousticLayers(
  design: AcousticDesignInputs,
  sliceThicknessNm: number,
  totalSlices: number,
): OpticalLayer[] {
  return Array.from({ length: totalSlices }, (_, sliceIndex) =>
    buildAcousticLayer(design, sliceIndex, sliceThicknessNm, getAcousticSlicesPerPeriod(design.acousticRepresentationMode)),
  );
}

function buildAcousticLayer(
  design: AcousticDesignInputs,
  sliceIndex: number,
  thicknessNm: number,
  slicesPerPeriod: number,
): OpticalLayer {
  const sample = Math.cos((2 * Math.PI * (sliceIndex + 0.5)) / slicesPerPeriod);
  const refractiveIndex = design.acousticMaterial.refractiveIndex;
  const baseIndex = typeof refractiveIndex === 'number' ? refractiveIndex : refractiveIndex.real;

  return {
    material: {
      ...design.acousticMaterial,
      id: `${design.acousticMaterial.id}-${sliceIndex + 1}`,
      name: `${design.acousticMaterial.name} slice ${sliceIndex + 1}`,
      refractiveIndex: baseIndex + design.acousticIndexModulation * sample,
    },
    thicknessNm,
  };
}

async function yieldToBrowser() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function getOpticalIndex(design: AcousticDesignInputs): number {
  const refractiveIndex = design.acousticMaterial.refractiveIndex;
  return typeof refractiveIndex === 'number' ? refractiveIndex : refractiveIndex.real;
}
