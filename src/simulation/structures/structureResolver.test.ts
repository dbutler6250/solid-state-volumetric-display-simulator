import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from './quarterWaveStack';
import { DEFAULT_ACOUSTIC_DESIGN_INPUTS } from './acoustoOpticGrating';
import {
  applySweepValue,
  createSimulationDocument,
  resolveSimulationDocument,
} from './structureResolver';
import { solveLayerStack } from '../solvers/transferMatrix';

const acousticInputs = {
  ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
  thicknessMode: 'acoustic' as const,
  wavelengthStartNm: 400,
  wavelengthEndNm: 800,
  wavelengthPointCount: 41,
  acousticDesign: {
    ...DEFAULT_ACOUSTIC_DESIGN_INPUTS,
    acousticFrequencyHz: 30e9,
    acousticPeriodCount: 4,
  },
};

describe('structure resolver', () => {
  it('resolves a quarter-wave definition and reports the exact solver layer count', () => {
    const resolved = resolveSimulationDocument(
      createSimulationDocument(DEFAULT_QUARTER_WAVE_STACK_INPUTS),
    );
    expect(resolved.summary.type).toBe('quarter-wave-stack');
    expect(resolved.stack.layers).toHaveLength(20);
    expect(resolved.summary.layerCount).toBe(resolved.stack.layers.length);
    expect(resolved.sweepParameters).toEqual([
      'designWavelengthNm',
      'periodCount',
      'incidentAngleDegrees',
    ]);
  });

  it('resolves acoustic slices as the active solver structure and reports one consistent count', () => {
    const resolved = resolveSimulationDocument(createSimulationDocument(acousticInputs));
    expect(resolved.summary.type).toBe('acousto-optic-grating');
    expect(resolved.stack.layers).toHaveLength(64);
    expect(resolved.summary.layerCount).toBe(resolved.stack.layers.length);
    expect(resolved.stack.layers[0].material.name).toContain('Fused silica slice');
    expect(resolved.sweepParameters).toEqual([
      'acousticFrequencyHz',
      'acousticPeriodCount',
      'acousticIndexModulation',
      'incidentAngleDegrees',
    ]);
  });

  it('matches an equivalent homogeneous layer when acoustic modulation is zero', () => {
    const modulatedDocument = createSimulationDocument(acousticInputs);
    const homogeneousDocument = createSimulationDocument({
      ...acousticInputs,
      acousticDesign: { ...acousticInputs.acousticDesign, acousticIndexModulation: 0 },
    });
    const modulated = resolveSimulationDocument(modulatedDocument);
    const homogeneous = resolveSimulationDocument(homogeneousDocument);
    if (homogeneous.summary.type !== 'acousto-optic-grating') return;
    const homogeneousIndices = new Set(
      homogeneous.stack.layers.map((layer) => JSON.stringify(layer.material.refractiveIndex)),
    );
    expect(homogeneousIndices.size).toBe(1);
    expect(new Set(modulated.stack.layers.map((layer) => layer.material.refractiveIndex)).size).toBeGreaterThan(1);

    const equivalentStack = {
      ...homogeneous.stack,
      layers: [{
        material: acousticInputs.acousticDesign.acousticMaterial,
        thicknessNm: homogeneous.summary.totalThicknessNm,
      }],
    };
    for (const sample of [
      { wavelengthNm: 450, incidentAngleDegrees: 0, polarization: 'TE' as const },
      { wavelengthNm: 600, incidentAngleDegrees: 35, polarization: 'TM' as const },
      { wavelengthNm: 750, incidentAngleDegrees: 60, polarization: 'TE' as const },
    ]) {
      const sliced = solveLayerStack(homogeneous.stack, sample);
      const equivalent = solveLayerStack(equivalentStack, sample);
      expect(sliced.reflectance).toBeCloseTo(equivalent.reflectance, 10);
      expect(sliced.transmission).toBeCloseTo(equivalent.transmission, 10);
    }
  });

  it('maps acoustic fields to physically interpretable geometry and spectrum changes', () => {
    const baseDocument = createSimulationDocument(acousticInputs);
    const fasterDocument = createSimulationDocument({
      ...acousticInputs,
      acousticDesign: { ...acousticInputs.acousticDesign, acousticFrequencyHz: 60e9 },
    });
    const longerDocument = createSimulationDocument({
      ...acousticInputs,
      acousticDesign: { ...acousticInputs.acousticDesign, acousticPeriodCount: 8 },
    });
    const finerDocument = createSimulationDocument({
      ...acousticInputs,
      acousticDesign: { ...acousticInputs.acousticDesign, acousticRepresentationMode: 'reference' },
    });
    const differentMaterialDocument = createSimulationDocument({
      ...acousticInputs,
      acousticDesign: {
        ...acousticInputs.acousticDesign,
        acousticMaterial: { id: 'dense', name: 'Dense glass', refractiveIndex: 1.7 },
      },
    });
    const base = resolveSimulationDocument(baseDocument);
    const faster = resolveSimulationDocument(fasterDocument);
    const longer = resolveSimulationDocument(longerDocument);
    const finer = resolveSimulationDocument(finerDocument);
    const differentMaterial = resolveSimulationDocument(differentMaterialDocument);
    if (
      base.summary.type !== 'acousto-optic-grating' ||
      faster.summary.type !== 'acousto-optic-grating' ||
      longer.summary.type !== 'acousto-optic-grating' ||
      finer.summary.type !== 'acousto-optic-grating' ||
      differentMaterial.summary.type !== 'acousto-optic-grating'
    ) return;

    expect(faster.summary.sliceThicknessNm).toBeCloseTo(base.summary.sliceThicknessNm / 2, 12);
    expect(faster.summary.referenceWavelengthNm).toBeCloseTo(base.summary.referenceWavelengthNm / 2, 12);
    expect(longer.summary.layerCount).toBe(base.summary.layerCount * 2);
    expect(longer.summary.totalThicknessNm).toBeCloseTo(base.summary.totalThicknessNm * 2, 12);
    expect(finer.summary.layerCount).toBe(base.summary.layerCount * 2);
    expect(finer.summary.totalThicknessNm).toBeCloseTo(base.summary.totalThicknessNm, 12);
    expect(differentMaterial.summary.referenceWavelengthNm).toBeGreaterThan(base.summary.referenceWavelengthNm);
    expect(differentMaterial.stack.layers[0].material.refractiveIndex).not.toEqual(
      base.stack.layers[0].material.refractiveIndex,
    );

    const basePoint = solveLayerStack(base.stack, {
      wavelengthNm: base.summary.referenceWavelengthNm,
      incidentAngleDegrees: 0,
      polarization: 'TE',
    });
    const zeroModulation = resolveSimulationDocument(createSimulationDocument({
      ...acousticInputs,
      acousticDesign: { ...acousticInputs.acousticDesign, acousticIndexModulation: 0 },
    }));
    const zeroPoint = solveLayerStack(zeroModulation.stack, {
      wavelengthNm: base.summary.referenceWavelengthNm,
      incidentAngleDegrees: 0,
      polarization: 'TE',
    });
    expect(Math.abs(basePoint.reflectance - zeroPoint.reflectance)).toBeGreaterThan(1e-8);
  });

  it('applies acoustic sweep values to the acoustic definition before re-resolution', () => {
    const document = createSimulationDocument(acousticInputs);
    const swept = applySweepValue(
      document,
      { parameter: 'acousticFrequencyHz', start: 20e9, end: 40e9, pointCount: 3 },
      40e9,
    );
    expect(swept.structure.type).toBe('acousto-optic-grating');
    if (swept.structure.type !== 'acousto-optic-grating') return;
    expect(swept.structure.design.acousticFrequencyHz).toBe(40e9);
    expect(resolveSimulationDocument(swept).referenceWavelengthNm).not.toBe(
      resolveSimulationDocument(document).referenceWavelengthNm,
    );
  });

  it('preserves a complex acoustic index through every resolved slice', () => {
    const resolved = resolveSimulationDocument(
      createSimulationDocument({
        ...acousticInputs,
        acousticDesign: {
          ...acousticInputs.acousticDesign,
          acousticMaterial: {
            id: 'lossy',
            name: 'Lossy medium',
            refractiveIndex: { real: 1.6, imag: 0.02 },
          },
        },
      }),
    );
    expect(resolved.stack.layers[0].material.refractiveIndex).toMatchObject({ imag: 0.02 });
  });
});
