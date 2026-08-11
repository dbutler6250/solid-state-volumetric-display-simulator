import type { QuarterWaveStackInputs } from '../types/simulation';
import { formatRefractiveIndex } from '../simulation/materials/material';
import {
  createSimulationDocument,
  resolveSimulationDocument,
  type ResolvedStructure,
} from '../simulation/structures/structureResolver';

export type CsvMetadataEntry = readonly [label: string, value: string | number];

/** Describes the canonical physical stack represented by a result or sweep export. */
export function getSimulationCsvMetadata(
  inputs: QuarterWaveStackInputs,
  suppliedResolved?: ResolvedStructure,
): CsvMetadataEntry[] {
  const document = createSimulationDocument(inputs);
  const resolved = suppliedResolved ?? resolveSimulationDocument(document);

  if (document.structure.type === 'acousto-optic-grating') {
    if (resolved.summary.type !== 'acousto-optic-grating') {
      throw new Error('Resolved structure does not match the acoustic simulation document.');
    }
    const design = document.structure.design;
    const summary = resolved.summary;
    return [
      ['structureType', document.structure.type],
      ['thicknessMode', 'acoustic'],
      ['acousticMaterial.name', design.acousticMaterial.name],
      ['acousticMaterial.id', design.acousticMaterial.id],
      ['acousticMaterial.refractiveIndex', formatRefractiveIndex(design.acousticMaterial.refractiveIndex)],
      ['acousticVelocityMps', design.acousticVelocityMps],
      ['acousticFrequencyHz', design.acousticFrequencyHz],
      ['acousticPeriodCount', design.acousticPeriodCount],
      ['braggOrder', design.braggOrder],
      ['acousticIndexModulation', design.acousticIndexModulation],
      ['acousticRepresentationMode', design.acousticRepresentationMode],
      ['resolvedLayerCount', summary.layerCount],
      ['slicesPerPeriod', summary.slicesPerPeriod],
      ['sliceThicknessNm', summary.sliceThicknessNm],
      ['acousticWavelengthNm', summary.acousticWavelengthNm],
      ['referenceWavelengthNm', summary.referenceWavelengthNm],
      ['resolvedTotalThicknessNm', summary.totalThicknessNm],
    ];
  }

  if (document.structure.type === 'hybrid-bragg-grating') {
    if (resolved.summary.type !== 'hybrid-bragg-grating') {
      throw new Error('Resolved structure does not match the hybrid Bragg simulation document.');
    }
    const design = document.structure.design;
    return [
      ['structureType', document.structure.type],
      ['thicknessMode', 'hybrid'],
      ['lengthMm', design.lengthMm],
      ['averageIndex', design.averageIndex],
      ['indexModulation', design.indexModulation],
      ['gratingPeriodNm', design.gratingPeriodNm],
      ['peakStrain', design.peakStrain],
      ['strainCenterMm', design.strainCenterMm],
      ['strainWidthMm', design.strainWidthMm],
      ['strainShape', design.strainShape],
      ['effectivePhotoelasticCoefficient', design.effectivePhotoelasticCoefficient],
      ['segmentCount', design.segmentCount],
      ['fixedLaserWavelengthNm', design.fixedLaserWavelengthNm],
      ['referenceWavelengthNm', resolved.summary.referenceWavelengthNm],
      ['resolvedTotalThicknessNm', resolved.summary.totalThicknessNm],
    ];
  }

  if (resolved.summary.type !== 'quarter-wave-stack') {
    throw new Error('Resolved structure does not match the quarter-wave simulation document.');
  }
  const structure = document.structure;
  const summary = resolved.summary;
  return [
    ['structureType', structure.type],
    ['thicknessMode', summary.thicknessStrategy],
    ['thicknessStrategy', summary.thicknessStrategy],
    ['highIndexMaterial.name', structure.highIndexMaterial.name],
    ['highIndexMaterial.id', structure.highIndexMaterial.id],
    ['highIndexMaterial.refractiveIndex', formatRefractiveIndex(structure.highIndexMaterial.refractiveIndex)],
    ['lowIndexMaterial.name', structure.lowIndexMaterial.name],
    ['lowIndexMaterial.id', structure.lowIndexMaterial.id],
    ['lowIndexMaterial.refractiveIndex', formatRefractiveIndex(structure.lowIndexMaterial.refractiveIndex)],
    ['periodCount', structure.periodCount],
    ['designWavelengthNm', summary.referenceWavelengthNm],
    ['highIndexThicknessNm', summary.highIndexThicknessNm],
    ['lowIndexThicknessNm', summary.lowIndexThicknessNm],
    ['resolvedLayerCount', summary.layerCount],
    ['resolvedTotalThicknessNm', summary.totalThicknessNm],
  ];
}
