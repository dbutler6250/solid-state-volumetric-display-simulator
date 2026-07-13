import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from './quarterWaveStack';
import { DEFAULT_ACOUSTIC_DESIGN_INPUTS } from './acoustoOpticGrating';
import {
  applySweepValue,
  createSimulationDocument,
  resolveSimulationDocument,
} from './structureResolver';
import { solveSimulationDocument } from '../solvers/transferMatrix';

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

  it('changes both the acoustic material profile and spectrum when modulation changes', () => {
    const modulatedDocument = createSimulationDocument(acousticInputs);
    const homogeneousDocument = createSimulationDocument({
      ...acousticInputs,
      acousticDesign: { ...acousticInputs.acousticDesign, acousticIndexModulation: 0 },
    });
    const modulated = resolveSimulationDocument(modulatedDocument);
    const homogeneous = resolveSimulationDocument(homogeneousDocument);
    const homogeneousIndices = new Set(
      homogeneous.stack.layers.map((layer) => JSON.stringify(layer.material.refractiveIndex)),
    );
    expect(homogeneousIndices.size).toBe(1);
    expect(new Set(modulated.stack.layers.map((layer) => layer.material.refractiveIndex)).size).toBeGreaterThan(1);
    expect(solveSimulationDocument(modulatedDocument).spectrum).not.toEqual(
      solveSimulationDocument(homogeneousDocument).spectrum,
    );
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
