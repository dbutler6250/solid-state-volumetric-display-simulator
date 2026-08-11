import type { QuarterWaveStackInputs } from '../types/simulation';
import type { MovingPulseExperimentResult } from '../simulation/experiments/hybridBraggExperiments';
import type { ResolvedStructure } from '../simulation/structures/structureResolver';
import { formatCsvRow } from './csv';
import { getSimulationCsvMetadata } from './simulationCsvMetadata';

const formatNumber = (value: number | null): string =>
  value === null || !Number.isFinite(value) ? '' : String(value);

const formatCommentValue = (value: string | number): string =>
  String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/"/g, '\\"');

const formatCommentLine = (label: string, value: string | number): string =>
  `# ${label}: ${formatCommentValue(value)}`;

/** Exports the fixed-laser moving strain-region experiment as a self-describing CSV file. */
export function exportMovingPulseCsv(
  inputs: QuarterWaveStackInputs,
  result: MovingPulseExperimentResult,
  resolved?: ResolvedStructure,
): string {
  const design = inputs.hybridBraggDesign;
  const structureLines = getSimulationCsvMetadata(inputs, resolved).map(([label, value]) =>
    formatCommentLine(label, value),
  );
  const lines = [
    '# Solid State Volumetric Display Simulator',
    '# Fixed-laser moving strain-region export',
    '# schema: ssvds-moving-pulse-csv-v1',
    ...structureLines,
    formatCommentLine('laserWavelengthNm', result.laserWavelengthNm),
    formatCommentLine('staticBraggWavelengthNm', result.staticBraggWavelengthNm),
    formatCommentLine('staticReflectance', result.metrics.staticReflectance),
    formatCommentLine('peakReflectance', result.metrics.peakReflectance),
    formatCommentLine('peakEnhancement', result.metrics.peakEnhancement),
    formatCommentLine('peakGain', result.metrics.peakGain ?? ''),
    formatCommentLine('peakPositionMm', result.metrics.peakPositionMm),
    formatCommentLine('uniformity', result.metrics.uniformity ?? ''),
    formatCommentLine('effectiveWidthStatus', result.metrics.effectiveWidth.status),
    formatCommentLine('effectiveWidthMm', result.metrics.effectiveWidth.widthMm ?? ''),
    formatCommentLine('strainWidthMm', result.strainWidthMm),
    formatCommentLine('strainShape', result.strainShape),
    formatCommentLine('segmentCount', result.segmentCount),
    formatCommentLine('positionStepMm', result.positionStepMm),
    ...(design
      ? [
          formatCommentLine('gratingLengthMm', design.lengthMm),
          formatCommentLine('averageIndex', design.averageIndex),
          formatCommentLine('indexModulation', design.indexModulation),
          formatCommentLine('peakStrain', design.peakStrain),
        ]
      : []),
    'pulse_position_mm,reflectance,enhancement,nominal_overlap_mm,clipped_support_start_mm,clipped_support_end_mm',
    ...result.points.map((point) =>
      formatCsvRow([
        formatNumber(point.strainCenterMm),
        formatNumber(point.reflectance),
        formatNumber(point.enhancement),
        formatNumber(point.nominalOverlapMm),
        formatNumber(point.clippedSupportStartMm),
        formatNumber(point.clippedSupportEndMm),
      ]),
    ),
  ];

  return `${lines.join('\n')}\n`;
}

