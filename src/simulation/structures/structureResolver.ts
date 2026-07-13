import type { LayerStack } from '../layers/stack';
import { getRefractiveIndexReal } from '../materials/material';
import type {
  AnalysisSettings,
  ParameterSweepSettings,
  QuarterWaveStackInputs,
  SimulationDocument,
  StructureDefinition,
  SweepParameter,
} from '../../types/simulation';
import { buildQuarterWaveStack } from './quarterWaveStack';
import {
  buildAcousticGratingStack,
  getAcousticDesignSummary,
} from './acoustoOpticGrating';

export type QuarterWaveResolvedSummary = {
  type: 'quarter-wave-stack';
  thicknessStrategy: 'derived' | 'manual';
  periodCount: number;
  layerCount: number;
  highIndexThicknessNm: number;
  lowIndexThicknessNm: number;
  totalThicknessNm: number;
  referenceWavelengthNm: number;
};

export type AcousticResolvedSummary = {
  type: 'acousto-optic-grating';
  layerCount: number;
  slicesPerPeriod: number;
  sliceThicknessNm: number;
  totalThicknessNm: number;
  acousticWavelengthNm: number;
  referenceWavelengthNm: number;
  representation: string;
  materialName: string;
  indexModulation: number;
};

export type ResolvedStructure = {
  stack: LayerStack;
  summary: QuarterWaveResolvedSummary | AcousticResolvedSummary;
  sweepParameters: SweepParameter[];
  referenceWavelengthNm: number;
};

/** Converts the legacy flat UI/import shape into the canonical discriminated document. */
export function createSimulationDocument(inputs: QuarterWaveStackInputs): SimulationDocument {
  const analysis: AnalysisSettings = {
    incidentAngleDegrees: inputs.incidentAngleDegrees,
    polarization: inputs.polarization,
    wavelengthStartNm: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
    wavelengthEndNm: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
    wavelengthPointCount: inputs.wavelengthPointCount ?? 500,
  };

  if (inputs.thicknessMode === 'acoustic' && inputs.acousticDesign) {
    return {
      analysis,
      structure: { type: 'acousto-optic-grating', design: inputs.acousticDesign },
    };
  }

  const structure: StructureDefinition = {
    type: 'quarter-wave-stack',
    highIndexMaterial: inputs.highIndexMaterial,
    lowIndexMaterial: inputs.lowIndexMaterial,
    periodCount: inputs.periodCount,
    thickness:
      inputs.thicknessMode === 'manual'
        ? {
            type: 'manual',
            referenceWavelengthNm: inputs.designWavelengthNm,
            highIndexThicknessNm: inputs.highIndexThicknessNm ?? 0,
            lowIndexThicknessNm: inputs.lowIndexThicknessNm ?? 0,
          }
        : { type: 'derived', designWavelengthNm: inputs.designWavelengthNm },
  };

  return { analysis, structure };
}

/** Resolves the active document into the exact physical layers and shared consumer metadata. */
export function resolveSimulationDocument(document: SimulationDocument): ResolvedStructure {
  if (document.structure.type === 'acousto-optic-grating') {
    const legacyInputs = documentToLegacyInputs(document);
    const stack = buildAcousticGratingStack(legacyInputs);
    const acoustic = getAcousticDesignSummary(legacyInputs);
    if (!stack || !acoustic) throw new Error('The acoustic grating could not be resolved.');
    return {
      stack,
      referenceWavelengthNm: acoustic.braggWavelengthNm,
      sweepParameters: [
        'acousticFrequencyHz',
        'acousticPeriodCount',
        'acousticIndexModulation',
        'incidentAngleDegrees',
      ],
      summary: {
        type: 'acousto-optic-grating',
        layerCount: stack.layers.length,
        slicesPerPeriod: acoustic.slicesPerPeriod,
        sliceThicknessNm: acoustic.acousticWavelengthNm / acoustic.slicesPerPeriod,
        totalThicknessNm: stack.layers.reduce((total, layer) => total + layer.thicknessNm, 0),
        acousticWavelengthNm: acoustic.acousticWavelengthNm,
        referenceWavelengthNm: acoustic.braggWavelengthNm,
        representation: document.structure.design.acousticRepresentationMode,
        materialName: document.structure.design.acousticMaterial.name,
        indexModulation: document.structure.design.acousticIndexModulation,
      },
    };
  }

  const legacyInputs = documentToLegacyInputs(document);
  const stack = buildQuarterWaveStack(legacyInputs);
  const thickness = document.structure.thickness;
  const referenceWavelengthNm =
    thickness.type === 'derived' ? thickness.designWavelengthNm : thickness.referenceWavelengthNm;
  const highIndexThicknessNm =
    thickness.type === 'derived'
      ? thickness.designWavelengthNm /
        (4 * getRefractiveIndexReal(document.structure.highIndexMaterial.refractiveIndex))
      : thickness.highIndexThicknessNm;
  const lowIndexThicknessNm =
    thickness.type === 'derived'
      ? thickness.designWavelengthNm /
        (4 * getRefractiveIndexReal(document.structure.lowIndexMaterial.refractiveIndex))
      : thickness.lowIndexThicknessNm;
  return {
    stack,
    referenceWavelengthNm,
    sweepParameters:
      thickness.type === 'derived'
        ? ['designWavelengthNm', 'periodCount', 'incidentAngleDegrees']
        : ['periodCount', 'incidentAngleDegrees'],
    summary: {
      type: 'quarter-wave-stack',
      thicknessStrategy: thickness.type,
      periodCount: document.structure.periodCount,
      layerCount: stack.layers.length,
      highIndexThicknessNm,
      lowIndexThicknessNm,
      totalThicknessNm: stack.layers.reduce((total, layer) => total + layer.thicknessNm, 0),
      referenceWavelengthNm,
    },
  };
}

/** Applies one supported sweep value to its discriminated source field. */
export function applySweepValue(
  document: SimulationDocument,
  settings: ParameterSweepSettings,
  value: number,
): SimulationDocument {
  if (settings.parameter === 'incidentAngleDegrees') {
    return { ...document, analysis: { ...document.analysis, incidentAngleDegrees: value } };
  }
  if (document.structure.type === 'quarter-wave-stack') {
    if (settings.parameter === 'periodCount') {
      return {
        ...document,
        structure: { ...document.structure, periodCount: Math.round(value) },
      };
    }
    if (settings.parameter === 'designWavelengthNm' && document.structure.thickness.type === 'derived') {
      return {
        ...document,
        structure: {
          ...document.structure,
          thickness: { type: 'derived', designWavelengthNm: value },
        },
      };
    }
  } else {
    const field = settings.parameter;
    if (
      field === 'acousticFrequencyHz' ||
      field === 'acousticPeriodCount' ||
      field === 'acousticIndexModulation'
    ) {
      return {
        ...document,
        structure: {
          ...document.structure,
          design: {
            ...document.structure.design,
            [field]: field === 'acousticPeriodCount' ? Math.round(value) : value,
          },
        },
      };
    }
  }
  throw new Error(`Sweep parameter ${settings.parameter} is not supported by the active structure.`);
}

/** Adapts a canonical document for legacy form, validation, and export boundaries. */
export function documentToLegacyInputs(document: SimulationDocument): QuarterWaveStackInputs {
  const analysis = document.analysis;
  if (document.structure.type === 'acousto-optic-grating') {
    return {
      highIndexMaterial: document.structure.design.acousticMaterial,
      lowIndexMaterial: document.structure.design.acousticMaterial,
      periodCount: document.structure.design.acousticPeriodCount,
      designWavelengthNm: getAcousticDesignSummary({
        highIndexMaterial: document.structure.design.acousticMaterial,
        lowIndexMaterial: document.structure.design.acousticMaterial,
        periodCount: 1,
        designWavelengthNm: 1,
        incidentAngleDegrees: analysis.incidentAngleDegrees,
        polarization: analysis.polarization,
        acousticDesign: document.structure.design,
      })?.braggWavelengthNm ?? 1,
      thicknessMode: 'acoustic',
      acousticDesign: document.structure.design,
      ...analysis,
    };
  }
  const thickness = document.structure.thickness;
  return {
    highIndexMaterial: document.structure.highIndexMaterial,
    lowIndexMaterial: document.structure.lowIndexMaterial,
    periodCount: document.structure.periodCount,
    designWavelengthNm:
      thickness.type === 'derived' ? thickness.designWavelengthNm : thickness.referenceWavelengthNm,
    thicknessMode: thickness.type,
    ...(thickness.type === 'manual'
      ? {
          highIndexThicknessNm: thickness.highIndexThicknessNm,
          lowIndexThicknessNm: thickness.lowIndexThicknessNm,
        }
      : {}),
    ...analysis,
  };
}
