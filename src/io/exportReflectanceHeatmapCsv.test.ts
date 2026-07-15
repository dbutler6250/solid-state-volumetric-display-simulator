import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import { createSimulationDocument } from '../simulation/structures/structureResolver';
import { solveSimulationDocumentReflectanceHeatmap } from '../simulation/solvers/transferMatrix';
import { exportReflectanceHeatmapCsv } from './exportReflectanceHeatmapCsv';

describe('exportReflectanceHeatmapCsv', () => {
  it('exports heatmap coordinates and reflectance rows', () => {
    const inputs = {
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      wavelengthStartNm: 450,
      wavelengthEndNm: 750,
      wavelengthPointCount: 61,
    };
    const document = createSimulationDocument(inputs);
    const settings = {
      xAxis: { parameter: 'designWavelengthNm', start: 500, end: 650, pointCount: 3 },
      yAxis: { parameter: 'incidentAngleDegrees', start: 0, end: 20, pointCount: 3 },
    } as const;
    const result = solveSimulationDocumentReflectanceHeatmap(document, settings);

    const csv = exportReflectanceHeatmapCsv(inputs, settings, result);

    expect(csv).toContain('# schema: ssvds-reflectance-heatmap-csv-v1');
    expect(csv).toContain('x_parameter,y_parameter,reflectance');
    expect(csv).toContain('500,0,');
    expect(csv).toContain('650,20,');
  });
});
