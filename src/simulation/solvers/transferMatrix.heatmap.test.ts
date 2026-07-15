import { describe, expect, it } from 'vitest';
import type { QuarterWaveStackInputs } from '../../types/simulation';
import { DEFAULT_ACOUSTIC_DESIGN_INPUTS } from '../structures/acoustoOpticGrating';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../structures/quarterWaveStack';
import { createSimulationDocument } from '../structures/structureResolver';
import {
  solveSimulationDocumentReflectanceHeatmap,
  solveSimulationDocumentReflectanceHeatmapAsync,
} from './transferMatrix';

describe('reflectance heatmap solver', () => {
  it('returns a 2D reflectance grid for supported axes and reuses cached runs', () => {
    const inputs: QuarterWaveStackInputs = {
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      periodCount: 6,
      designWavelengthNm: 600,
      incidentAngleDegrees: 0,
      wavelengthStartNm: 450,
      wavelengthEndNm: 750,
      wavelengthPointCount: 61,
    };
    const document = createSimulationDocument(inputs);
    const settings = {
      xAxis: { parameter: 'designWavelengthNm', start: 500, end: 650, pointCount: 3 },
      yAxis: { parameter: 'incidentAngleDegrees', start: 0, end: 30, pointCount: 4 },
    } as const;

    const first = solveSimulationDocumentReflectanceHeatmap(document, settings);
    const second = solveSimulationDocumentReflectanceHeatmap(document, settings);

    expect(first).toBe(second);
    expect(first.xAxis.values).toEqual([500, 575, 650]);
    expect(first.yAxis.values).toEqual([0, 10, 20, 30]);
    expect(first.reflectance).toHaveLength(4);
    expect(first.reflectance.every((row) => row.length === 3)).toBe(true);
    expect(first.reflectance.flat().every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it('rejects axes that are not supported by the active structure', () => {
    const inputs: QuarterWaveStackInputs = {
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      thicknessMode: 'acoustic',
      wavelengthStartNm: 500,
      wavelengthEndNm: 700,
      wavelengthPointCount: 11,
      acousticDesign: DEFAULT_ACOUSTIC_DESIGN_INPUTS,
    };
    const document = createSimulationDocument(inputs);

    expect(() =>
      solveSimulationDocumentReflectanceHeatmap(document, {
        xAxis: { parameter: 'designWavelengthNm', start: 500, end: 650, pointCount: 3 },
        yAxis: { parameter: 'incidentAngleDegrees', start: 0, end: 30, pointCount: 4 },
      }),
    ).toThrow(/not supported/i);
  });

  it('can solve heatmaps asynchronously', async () => {
    const inputs: QuarterWaveStackInputs = {
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      periodCount: 10,
      designWavelengthNm: 600,
      incidentAngleDegrees: 0,
      wavelengthStartNm: 450,
      wavelengthEndNm: 750,
      wavelengthPointCount: 61,
    };
    const document = createSimulationDocument(inputs);
    const settings = {
      xAxis: { parameter: 'designWavelengthNm', start: 500, end: 700, pointCount: 11 },
      yAxis: { parameter: 'periodCount', start: 1, end: 11, pointCount: 11 },
    } as const;

    await expect(solveSimulationDocumentReflectanceHeatmapAsync(document, settings)).resolves.toMatchObject({
      xAxis: { values: expect.any(Array) },
      yAxis: { values: expect.any(Array) },
      reflectance: expect.any(Array),
    });
  });
});
