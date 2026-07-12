import type {
  ParameterSweepResult,
  ParameterSweepSettings,
  QuarterWaveStackInputs,
} from '../types/simulation';
import { formatRefractiveIndex } from '../simulation/materials/material';
import { formatCsvRow } from './csv';

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

/** Exports parameter sweep metrics and fixed stack inputs as a self-describing CSV file. */
export function exportParameterSweepCsv(
  inputs: QuarterWaveStackInputs,
  settings: ParameterSweepSettings,
  result: ParameterSweepResult,
): string {
  const lines = [
    '# Solid State Volumetric Display Simulator',
    '# Optical stack parameter sweep export',
    '# schema: ssvds-parameter-sweep-csv-v1',
    formatCommentLine('sweep.parameter', settings.parameter),
    formatCommentLine('sweep.start', settings.start),
    formatCommentLine('sweep.end', settings.end),
    formatCommentLine('sweep.pointCount', settings.pointCount),
    formatCommentLine('highIndexMaterial.name', inputs.highIndexMaterial.name),
    formatCommentLine('highIndexMaterial.id', inputs.highIndexMaterial.id),
    formatCommentLine(
      'highIndexMaterial.refractiveIndex',
      formatRefractiveIndex(inputs.highIndexMaterial.refractiveIndex),
    ),
    formatCommentLine('lowIndexMaterial.name', inputs.lowIndexMaterial.name),
    formatCommentLine('lowIndexMaterial.id', inputs.lowIndexMaterial.id),
    formatCommentLine(
      'lowIndexMaterial.refractiveIndex',
      formatRefractiveIndex(inputs.lowIndexMaterial.refractiveIndex),
    ),
    formatCommentLine('periodCount', inputs.periodCount),
    formatCommentLine('designWavelengthNm', inputs.designWavelengthNm),
    formatCommentLine('incidentAngleDegrees', inputs.incidentAngleDegrees),
    formatCommentLine('polarization', inputs.polarization),
    formatCommentLine('wavelengthStartNm', inputs.wavelengthStartNm ?? ''),
    formatCommentLine('wavelengthEndNm', inputs.wavelengthEndNm ?? ''),
    formatCommentLine('wavelengthPointCount', inputs.wavelengthPointCount ?? ''),
    'parameter_value,peak_reflectance,center_wavelength_nm,bandwidth_nm',
    ...result.points.map((point) =>
      formatCsvRow([
        formatNumber(point.parameterValue),
        formatNumber(point.peakReflectance),
        formatNumber(point.centerWavelengthNm),
        formatNumber(point.bandwidthNm),
      ]),
    ),
  ];

  return `${lines.join('\n')}\n`;
}
