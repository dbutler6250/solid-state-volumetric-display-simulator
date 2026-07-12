import type { QuarterWaveStackInputs, SimulationResult } from '../types/simulation';
import { formatCsvRow } from './csv';
import { formatRefractiveIndex } from '../simulation/materials/material';

const formatNumber = (value: number): string => {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return Number.isFinite(value) ? String(value) : '';
};

const formatCommentValue = (value: string | number): string =>
  String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/"/g, '\\"');

const formatCommentLine = (label: string, value: string | number): string =>
  `# ${label}: ${formatCommentValue(value)}`;

/** Exports the current simulation setup and spectrum as a self-describing CSV file. */
export function exportResultsCsv(inputs: QuarterWaveStackInputs, result: SimulationResult): string {
  const lines = [
    '# Solid State Volumetric Display Simulator',
    '# Optical stack spectrum export',
    '# schema: ssvds-results-csv-v1',
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
    formatCommentLine('peakReflectance', result.peakReflectance),
    formatCommentLine('centerWavelengthNm', result.centerWavelengthNm),
    formatCommentLine('bandwidthNm', result.bandwidthNm),
    formatCommentLine('maxEnergyConservationError', result.maxEnergyConservationError),
    'wavelength_nm,reflectance,transmission',
    ...result.spectrum.map((point) =>
      formatCsvRow([
        formatNumber(point.wavelengthNm),
        formatNumber(point.reflectance),
        formatNumber(point.transmission),
      ]),
    ),
  ];

  return `${lines.join('\n')}\n`;
}
