import type {
  QuarterWaveStackInputs,
  ReflectanceHeatmapResult,
  ReflectanceHeatmapSettings,
} from '../types/simulation';
import type { ResolvedStructure } from '../simulation/structures/structureResolver';
import { formatCsvRow } from './csv';
import { getSimulationCsvMetadata } from './simulationCsvMetadata';

const formatNumber = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : String(value);
};

const formatCommentValue = (value: string | number): string =>
  String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/"/g, '\\"');

const formatCommentLine = (label: string, value: string | number): string =>
  `# ${label}: ${formatCommentValue(value)}`;

/** Exports a general 2D reflectance heatmap as a self-describing CSV file. */
export function exportReflectanceHeatmapCsv(
  inputs: QuarterWaveStackInputs,
  settings: ReflectanceHeatmapSettings,
  result: ReflectanceHeatmapResult,
  resolved?: ResolvedStructure,
): string {
  const structureLines = getSimulationCsvMetadata(inputs, resolved).map(([label, value]) =>
    formatCommentLine(label, value),
  );
  const lines = [
    '# Solid State Volumetric Display Simulator',
    '# Reflectance heatmap export',
    '# schema: ssvds-reflectance-heatmap-csv-v1',
    formatCommentLine('heatmap.xParameter', settings.xAxis.parameter),
    formatCommentLine('heatmap.yParameter', settings.yAxis.parameter),
    formatCommentLine('heatmap.xStart', settings.xAxis.start),
    formatCommentLine('heatmap.xEnd', settings.xAxis.end),
    formatCommentLine('heatmap.xPointCount', settings.xAxis.pointCount),
    formatCommentLine('heatmap.yStart', settings.yAxis.start),
    formatCommentLine('heatmap.yEnd', settings.yAxis.end),
    formatCommentLine('heatmap.yPointCount', settings.yAxis.pointCount),
    ...structureLines,
    formatCommentLine('incidentAngleDegrees', inputs.incidentAngleDegrees),
    formatCommentLine('polarization', inputs.polarization),
    formatCommentLine('wavelengthStartNm', inputs.wavelengthStartNm ?? ''),
    formatCommentLine('wavelengthEndNm', inputs.wavelengthEndNm ?? ''),
    formatCommentLine('wavelengthPointCount', inputs.wavelengthPointCount ?? ''),
    `x_parameter,y_parameter,reflectance`,
  ];

  result.yAxis.values.forEach((yValue, rowIndex) => {
    result.xAxis.values.forEach((xValue, columnIndex) => {
      lines.push(
        formatCsvRow([
          formatNumber(xValue),
          formatNumber(yValue),
          formatNumber(result.reflectance[rowIndex]?.[columnIndex] ?? null),
        ]),
      );
    });
  });

  return `${lines.join('\n')}\n`;
}
