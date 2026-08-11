import type { LayerStack } from '../layers/stack';
import { AIR } from '../materials/catalog';
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
import { DEFAULT_WAVELENGTH_POINT_COUNT } from '../simulationLimits';
import {
  buildAcousticGratingStack,
  buildAcousticGratingStackAsync,
  getAcousticDesignSummary,
} from './acoustoOpticGrating';
import {
  createHybridBraggModel,
  getHybridDesignBraggWavelengthNm,
  getHybridLengthNm,
  type HybridBraggModel,
} from './hybridBraggGrating';

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

export type HybridResolvedSummary = {
  type: 'hybrid-bragg-grating';
  layerCount: number;
  segmentCount: number;
  totalThicknessNm: number;
  referenceWavelengthNm: number;
  averageIndex: number;
  indexModulation: number;
  gratingPeriodNm: number;
  peakStrain: number;
  strainCenterMm: number;
  strainWidthMm: number;
  strainShape: string;
  fixedLaserWavelengthNm: number;
};

export type ResolvedStructure = {
  stack: LayerStack;
  summary: QuarterWaveResolvedSummary | AcousticResolvedSummary | HybridResolvedSummary;
  sweepParameters: SweepParameter[];
  referenceWavelengthNm: number;
  hybridModel?: HybridBraggModel;
};

/** Converts the legacy flat UI/import shape into the canonical discriminated document. */
export function createSimulationDocument(inputs: QuarterWaveStackInputs): SimulationDocument {
  const analysis: AnalysisSettings = {
    incidentAngleDegrees: inputs.incidentAngleDegrees,
    polarization: inputs.polarization,
    wavelengthStartNm: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
    wavelengthEndNm: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
    wavelengthPointCount: inputs.wavelengthPointCount ?? DEFAULT_WAVELENGTH_POINT_COUNT,
  };

  if (inputs.thicknessMode === 'acoustic' && inputs.acousticDesign) {
    return {
      analysis,
      structure: { type: 'acousto-optic-grating', design: inputs.acousticDesign },
    };
  }

  if (inputs.thicknessMode === 'hybrid' && inputs.hybridBraggDesign) {
    return {
      analysis,
      structure: { type: 'hybrid-bragg-grating', design: inputs.hybridBraggDesign },
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
    return createAcousticResolvedStructure(document.structure, stack, acoustic);
  }

  if (document.structure.type === 'hybrid-bragg-grating') {
    const design = document.structure.design;
    return {
      stack: { incidentMedium: AIR, layers: [], exitMedium: AIR },
      referenceWavelengthNm: getHybridDesignBraggWavelengthNm(design),
      hybridModel: createHybridBraggModel(design),
      sweepParameters: [
        'hybridPeakStrain',
        'hybridStrainCenterMm',
        'hybridStrainWidthMm',
        'hybridIndexModulation',
      ],
      summary: {
        type: 'hybrid-bragg-grating',
        layerCount: Math.round(design.segmentCount),
        segmentCount: Math.round(design.segmentCount),
        totalThicknessNm: getHybridLengthNm(design),
        referenceWavelengthNm: getHybridDesignBraggWavelengthNm(design),
        averageIndex: design.averageIndex,
        indexModulation: design.indexModulation,
        gratingPeriodNm: design.gratingPeriodNm,
        peakStrain: design.peakStrain,
        strainCenterMm: design.strainCenterMm,
        strainWidthMm: design.strainWidthMm,
        strainShape: design.strainShape,
        fixedLaserWavelengthNm: design.fixedLaserWavelengthNm,
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

/** Resolves acoustic layers cooperatively so edits can cancel stale materialization work. */
export async function resolveSimulationDocumentAsync(
  document: SimulationDocument,
  signal?: AbortSignal,
): Promise<ResolvedStructure> {
  if (document.structure.type !== 'acousto-optic-grating') {
    return resolveSimulationDocument(document);
  }

  const legacyInputs = documentToLegacyInputs(document);
  const [stack, acoustic] = await Promise.all([
    buildAcousticGratingStackAsync(legacyInputs, undefined, signal),
    Promise.resolve(getAcousticDesignSummary(legacyInputs)),
  ]);
  if (signal?.aborted) throw createAbortError();
  if (!stack || !acoustic) throw new Error('The acoustic grating could not be resolved.');
  return createAcousticResolvedStructure(document.structure, stack, acoustic);
}

function createAcousticResolvedStructure(
  structure: Extract<StructureDefinition, { type: 'acousto-optic-grating' }>,
  stack: LayerStack,
  acoustic: NonNullable<ReturnType<typeof getAcousticDesignSummary>>,
): ResolvedStructure {
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
      representation: structure.design.acousticRepresentationMode,
      materialName: structure.design.acousticMaterial.name,
      indexModulation: structure.design.acousticIndexModulation,
    },
  };
}

function createAbortError(): Error {
  const error = new Error('The stale acoustic calculation was cancelled.');
  error.name = 'AbortError';
  return error;
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
  } else if (document.structure.type === 'acousto-optic-grating') {
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
  } else {
    const field = settings.parameter;
    if (
      field === 'hybridPeakStrain' ||
      field === 'hybridStrainCenterMm' ||
      field === 'hybridStrainWidthMm' ||
      field === 'hybridIndexModulation'
    ) {
      const key =
        field === 'hybridPeakStrain'
          ? 'peakStrain'
          : field === 'hybridStrainCenterMm'
            ? 'strainCenterMm'
            : field === 'hybridStrainWidthMm'
              ? 'strainWidthMm'
              : 'indexModulation';
      return {
        ...document,
        structure: {
          ...document.structure,
          design: { ...document.structure.design, [key]: value },
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
  if (document.structure.type === 'hybrid-bragg-grating') {
    return {
      highIndexMaterial: { id: 'hybrid-medium', name: 'Hybrid medium', refractiveIndex: document.structure.design.averageIndex },
      lowIndexMaterial: { id: 'hybrid-medium', name: 'Hybrid medium', refractiveIndex: document.structure.design.averageIndex },
      periodCount: 1,
      designWavelengthNm: getHybridDesignBraggWavelengthNm(document.structure.design),
      thicknessMode: 'hybrid',
      hybridBraggDesign: document.structure.design,
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
