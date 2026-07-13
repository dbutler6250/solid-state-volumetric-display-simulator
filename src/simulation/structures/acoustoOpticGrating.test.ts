import { describe, expect, it } from 'vitest';
import {
  buildAcousticGratingStack,
  buildAcousticGratingStackAsync,
  getAcousticDesignSummary,
  getAcousticEstimatedLayerCount,
} from './acoustoOpticGrating';
import type { QuarterWaveStackInputs } from '../../types/simulation';
import type { Material } from '../materials/material';
import { buildQuarterWaveStackLayers, getResolvedStackInputs } from './quarterWaveStack';

const makeMaterial = (id: string, name: string, refractiveIndex: Material['refractiveIndex']): Material => ({
  id,
  name,
  refractiveIndex,
});

const inputs: QuarterWaveStackInputs = {
  highIndexMaterial: makeMaterial('tio2', 'Titanium Dioxide', 2.45),
  lowIndexMaterial: makeMaterial('sio2', 'Silicon Dioxide', 1.46),
  periodCount: 12,
  designWavelengthNm: 532,
  incidentAngleDegrees: 0,
  polarization: 'TE',
  thicknessMode: 'acoustic',
  acousticDesign: {
    acousticMaterial: makeMaterial('fused-silica', 'Fused silica', 1.45),
    acousticVelocityMps: 5970,
    acousticFrequencyHz: 1e9,
    acousticPeriodCount: 4,
    braggOrder: 1,
    acousticIndexModulation: 0.002,
    acousticRepresentationMode: 'accurate',
  },
};

const binaryInputs: QuarterWaveStackInputs = {
  ...inputs,
  acousticDesign: {
    ...inputs.acousticDesign!,
    acousticPeriodCount: 2,
    acousticRepresentationMode: 'binary',
  },
};

describe('acoustoOpticGrating', () => {
  it('derives acoustic summary values from the drive inputs', () => {
    const summary = getAcousticDesignSummary(inputs);

    expect(summary?.slicesPerPeriod).toBe(16);
    expect(summary?.estimatedLayers).toBe(64);
    expect(summary?.acousticWavelengthNm).toBeCloseTo(5970);
    expect(summary?.totalLengthNm).toBeCloseTo(23880);
  });

  it('builds a discretized optical stack for the acoustic waveform', () => {
    const stack = buildAcousticGratingStack(inputs);

    expect(stack?.layers).toHaveLength(64);
    expect(stack?.layers[0].thicknessNm).toBeCloseTo(5970 / 16);
    expect(stack?.layers[0].material.refractiveIndex).not.toBe(stack?.layers[1].material.refractiveIndex);
    expect(stack?.layers[stack.layers.length - 1]?.thicknessNm).toBeCloseTo(5970 / 16);
    expect(stack?.layers.every((layer) => layer.thicknessNm > 0)).toBe(true);
    expect(stack?.layers.every((layer) => typeof layer.material.refractiveIndex === 'number')).toBe(true);
  });

  it('builds a true two-level profile in binary mode', () => {
    const stack = buildAcousticGratingStack(binaryInputs);

    expect(stack?.layers).toHaveLength(4);
    expect(stack?.layers[0].material.refractiveIndex).not.toBe(stack?.layers[1].material.refractiveIndex);
    expect(stack?.layers[0].material.refractiveIndex).toBe(stack?.layers[2].material.refractiveIndex);
    expect(stack?.layers[1].material.refractiveIndex).toBe(stack?.layers[3].material.refractiveIndex);
  });

  it('reports the estimated layer count for the configured representation', () => {
    expect(getAcousticEstimatedLayerCount(inputs)).toBe(64);
  });

  it('builds a stack asynchronously while reporting progress', async () => {
    const progressUpdates: Array<{ completedLayers: number; totalLayers: number }> = [];
    const stack = await buildAcousticGratingStackAsync(
      inputs,
      (progress) => {
        progressUpdates.push(progress);
      },
    );

    expect(stack?.layers).toHaveLength(64);
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[0]).toEqual({
      completedLayers: 64,
      totalLayers: 64,
    });
    expect(progressUpdates[progressUpdates.length - 1]).toEqual({
      completedLayers: 64,
      totalLayers: 64,
    });
  });

  it('resolves acoustic inputs into solver-facing stack values', () => {
    const resolved = getResolvedStackInputs(inputs);

    expect(resolved.periodCount).toBe(4);
    expect(resolved.designWavelengthNm).toBeCloseTo(2 * 1.45 * 5970);
    expect(resolved.highIndexThicknessNm).toBeCloseTo(5970 / 16);
    expect(resolved.lowIndexThicknessNm).toBeCloseTo(5970 / 16);
  });

  it('builds layers using the resolved acoustic period count', () => {
    const stack = buildQuarterWaveStackLayers({
      ...inputs,
      periodCount: 1,
      thicknessMode: 'acoustic',
    });

    expect(stack).toHaveLength(8);
  });
});
