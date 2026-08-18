import { validateQuarterWaveStackInputs } from '../simulation/validation/quarterWaveStackValidation';
import { isAcousticRepresentationMode } from '../simulation/structures/acoustoOpticGrating';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../simulation/structures/hybridBraggGrating';
import { MAX_HYBRID_BRAGG_SECTIONS } from '../simulation/simulationLimits';
import type { Material, ComplexRefractiveIndex } from '../simulation/materials/material';
import type {
  ParameterSweepSettings,
  Polarization,
  QuarterWaveStackInputs,
  SweepParameter,
  ThicknessMode,
  HybridCouplingProfile,
  HybridPhaseProfile,
} from '../types/simulation';

const STACK_CONFIG_SCHEMA = 'ssvds-stack-config-v1';
const LEGACY_BRAGG_CONFIG_SCHEMA = 'ssvds-bragg-config-v1';
const STACK_CONFIG_APP = 'solid-state-volumetric-display-simulator';
const STACK_CONFIG_STRUCTURE_TYPE = 'quarter-wave-stack';
const ACOUSTIC_STRUCTURE_TYPE = 'acousto-optic-grating';
const HYBRID_STRUCTURE_TYPE = 'hybrid-bragg-grating';
const LEGACY_BRAGG_STRUCTURE_TYPE = 'quarter-wave-bragg-reflector';

type ImportSuccess = {
  ok: true;
  inputs: QuarterWaveStackInputs;
  parameterSweep?: ParameterSweepSettings;
  parameterSweeps?: Partial<Record<SweepParameter, ParameterSweepSettings>>;
  heatmapSettings?: {
    xAxis: ParameterSweepSettings;
    yAxis: ParameterSweepSettings;
  };
  heatmapSelection?: {
    xParameter: SweepParameter;
    yParameter: SweepParameter;
  };
};

type ImportFailure = {
  ok: false;
  message: string;
};

export type ImportStackConfigJsonResult = ImportSuccess | ImportFailure;

/** Parses stack setup JSON and accepts the legacy Bragg schema for compatibility. */
export function importStackConfigJson(rawJson: string): ImportStackConfigJsonResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, message: 'The selected file is not valid JSON.' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, message: 'The selected file must contain a JSON object.' };
  }

  if (parsed.schema !== STACK_CONFIG_SCHEMA && parsed.schema !== LEGACY_BRAGG_CONFIG_SCHEMA) {
    return { ok: false, message: 'This setup file uses an unsupported schema.' };
  }

  if (parsed.app !== STACK_CONFIG_APP) {
    return { ok: false, message: 'This setup file was not created for this simulator.' };
  }

  if (
    parsed.structureType !== STACK_CONFIG_STRUCTURE_TYPE &&
    parsed.structureType !== ACOUSTIC_STRUCTURE_TYPE &&
    parsed.structureType !== HYBRID_STRUCTURE_TYPE &&
    parsed.structureType !== LEGACY_BRAGG_STRUCTURE_TYPE
  ) {
    return { ok: false, message: 'This setup file uses an unsupported structure type.' };
  }

  const isModernStackConfig = parsed.schema === STACK_CONFIG_SCHEMA;
  if (isModernStackConfig) {
    const units = parseModernUnits(parsed.units);
    if (!units.ok) return units;
  }

  if (!isRecord(parsed.inputs)) {
    return { ok: false, message: 'The setup file is missing its inputs payload.' };
  }

  const rawInputs = parsed.inputs;
  const thicknessMode = parseThicknessMode(rawInputs.thicknessMode, isModernStackConfig);
  if (!thicknessMode.ok) return thicknessMode;

  const structureConsistency = validateStructureTypeConsistency(parsed.structureType, thicknessMode.mode);
  if (!structureConsistency.ok) return structureConsistency;

  const highIndexMaterial = parseMaterial(rawInputs.highIndexMaterial, 'high-index');
  if (!highIndexMaterial.ok) return highIndexMaterial;
  const lowIndexMaterial = parseMaterial(rawInputs.lowIndexMaterial, 'low-index');
  if (!lowIndexMaterial.ok) return lowIndexMaterial;

  const polarization = rawInputs.polarization;
  if (polarization !== 'TE' && polarization !== 'TM') {
    return { ok: false, message: 'Polarization must be TE or TM.' };
  }

  const inputs: QuarterWaveStackInputs = {
    highIndexMaterial: highIndexMaterial.material,
    lowIndexMaterial: lowIndexMaterial.material,
    periodCount: rawInputs.periodCount as number,
    designWavelengthNm: rawInputs.designWavelengthNm as number,
    incidentAngleDegrees: rawInputs.incidentAngleDegrees as number,
    polarization: polarization as Polarization,
    thicknessMode: thicknessMode.mode,
    wavelengthStartNm: rawInputs.wavelengthStartNm as number | undefined,
    wavelengthEndNm: rawInputs.wavelengthEndNm as number | undefined,
    wavelengthPointCount: rawInputs.wavelengthPointCount as number | undefined,
  };

  if (typeof rawInputs.highIndexThicknessNm === 'number') {
    inputs.highIndexThicknessNm = rawInputs.highIndexThicknessNm;
  }

  if (typeof rawInputs.lowIndexThicknessNm === 'number') {
    inputs.lowIndexThicknessNm = rawInputs.lowIndexThicknessNm;
  }

  if (isRecord(rawInputs.acousticDesign)) {
    const acousticDesign = parseAcousticDesign(rawInputs.acousticDesign, !isModernStackConfig);
    if (!acousticDesign.ok) return acousticDesign;
    inputs.acousticDesign = acousticDesign.design;
  }

  if (isRecord(rawInputs.hybridBraggDesign)) {
    const hybridDesign = parseHybridBraggDesign(rawInputs.hybridBraggDesign);
    if (!hybridDesign.ok) return hybridDesign;
    inputs.hybridBraggDesign = hybridDesign.design;
  }

  const issues = validateQuarterWaveStackInputs(inputs);
  if (issues.length > 0) {
    return { ok: false, message: issues[0].message };
  }

  const parameterSweeps = parseParameterSweeps(parsed.parameterSweeps, parsed.parameterSweep);
  if (!parameterSweeps.ok) return parameterSweeps;
  const heatmapSelection = parseHeatmapSelection(parsed.heatmapSelection, parsed.heatmapSettings);
  if (!heatmapSelection.ok) return heatmapSelection;

  return {
    ok: true,
    inputs,
    ...(parameterSweeps.settings
      ? { parameterSweep: firstParameterSweep(parameterSweeps.settings), parameterSweeps: parameterSweeps.settings }
      : {}),
    ...(heatmapSelection.settings
      ? {
          heatmapSelection: heatmapSelection.settings,
          heatmapSettings: {
            xAxis: {
              parameter: heatmapSelection.settings.xParameter,
              ...getDefaultHeatmapAxisBounds(heatmapSelection.settings.xParameter, inputs),
            },
            yAxis: {
              parameter: heatmapSelection.settings.yParameter,
              ...getDefaultHeatmapAxisBounds(heatmapSelection.settings.yParameter, inputs),
            },
          },
        }
      : {}),
  };
}

function parseParameterSweeps(
  value: unknown,
  legacyValue: unknown,
): { ok: true; settings?: Partial<Record<SweepParameter, ParameterSweepSettings>> } | ImportFailure {
  if (value === undefined && legacyValue === undefined) return { ok: true };
  if (value !== undefined && !isRecord(value)) return { ok: false, message: 'The parameter sweep setup is invalid.' };
  if (value !== undefined) {
    const sweeps = parseParameterSweepMap(value);
    if (!sweeps.ok) return sweeps;
    return { ok: true, settings: sweeps.settings };
  }
  const sweep = parseParameterSweep(legacyValue);
  if (!sweep.ok) return sweep;
  return { ok: true, settings: sweep.settings ? { [sweep.settings.parameter]: sweep.settings } : undefined };
}

function parseParameterSweepMap(
  value: Record<string, unknown>,
): { ok: true; settings?: Partial<Record<SweepParameter, ParameterSweepSettings>> } | ImportFailure {
  const settings: Partial<Record<SweepParameter, ParameterSweepSettings>> = {};
  for (const key of Object.keys(value)) {
    if (!isSweepParameter(key)) continue;
    const parsed = parseParameterSweep(value[key]);
    if (!parsed.ok) return parsed;
    if (parsed.settings) settings[key] = parsed.settings;
  }
  return { ok: true, settings };
}

function parseParameterSweep(
  value: unknown,
): { ok: true; settings?: ParameterSweepSettings } | ImportFailure {
  if (value === undefined) return { ok: true };
  if (!isRecord(value)) return { ok: false, message: 'The parameter sweep setup is invalid.' };
  if (!isSweepParameter(value.parameter)) {
    return { ok: false, message: 'Parameter sweep must target design wavelength, angle, or periods.' };
  }
  if (
    value.parameter === 'incidentAngleDegrees'
      ? !isNonNegativeFiniteNumber(value.start) ||
        !isAngleFiniteNumber(value.end) ||
        value.end <= value.start
      : value.parameter === 'acousticIndexModulation' ||
          value.parameter === 'hybridPeakStrain' ||
          value.parameter === 'hybridStrainCenterMm' ||
          value.parameter === 'hybridIndexModulation'
        ? !isNonNegativeFiniteNumber(value.start) ||
          !isNonNegativeFiniteNumber(value.end) ||
          value.end <= value.start
      : !isPositiveFiniteNumber(value.start) ||
        !isPositiveFiniteNumber(value.end) ||
        value.end <= value.start
  ) {
    return { ok: false, message: 'Parameter sweep end must be greater than start.' };
  }
  if (
    typeof value.pointCount !== 'number' ||
    !Number.isFinite(value.pointCount) ||
    value.pointCount < 2 ||
    !Number.isInteger(value.pointCount)
  ) {
    return { ok: false, message: 'Parameter sweep points must be a whole number of at least 2.' };
  }

  return {
    ok: true,
    settings: {
      parameter: value.parameter,
      start: value.start as number,
      end: value.end as number,
      pointCount: value.pointCount as number,
    },
  };
}

function parseHeatmapSelection(
  value: unknown,
  legacyValue: unknown,
): { ok: true; settings?: { xParameter: SweepParameter; yParameter: SweepParameter } } | ImportFailure {
  if (value === undefined && legacyValue === undefined) return { ok: true };
  if (value !== undefined) {
    if (!isRecord(value)) return { ok: false, message: 'The heatmap setup is invalid.' };
    if (!isSweepParameter(value.xParameter) || !isSweepParameter(value.yParameter) || value.xParameter === value.yParameter) {
      return { ok: false, message: 'The heatmap axis selection is invalid.' };
    }
    return { ok: true, settings: { xParameter: value.xParameter, yParameter: value.yParameter } };
  }
  if (!isRecord(legacyValue) || !isRecord(legacyValue.xAxis) || !isRecord(legacyValue.yAxis)) {
    return { ok: false, message: 'The heatmap setup is invalid.' };
  }
  if (!isSweepParameter(legacyValue.xAxis.parameter) || !isSweepParameter(legacyValue.yAxis.parameter)) {
    return { ok: false, message: 'The heatmap axis selection is invalid.' };
  }
  if (legacyValue.xAxis.parameter === legacyValue.yAxis.parameter) {
    return { ok: false, message: 'The heatmap axis selection is invalid.' };
  }
  return { ok: true, settings: { xParameter: legacyValue.xAxis.parameter, yParameter: legacyValue.yAxis.parameter } };
}

function firstParameterSweep(
  settings: Partial<Record<SweepParameter, ParameterSweepSettings>>,
): ParameterSweepSettings | undefined {
  return Object.values(settings)[0];
}

function getDefaultHeatmapAxisBounds(
  parameter: SweepParameter,
  inputs: QuarterWaveStackInputs,
): Pick<ParameterSweepSettings, 'start' | 'end' | 'pointCount'> {
  if (parameter === 'periodCount') {
    return { ...getDefaultPeriodSweepBounds(inputs.periodCount), pointCount: 25 };
  }
  if (parameter === 'acousticPeriodCount') {
    const periods = inputs.acousticDesign?.acousticPeriodCount ?? 10;
    return {
      ...getDefaultPeriodSweepBounds(periods),
      pointCount: 25,
    };
  }
  if (parameter === 'incidentAngleDegrees') {
    return { start: 0, end: 89.9, pointCount: 25 };
  }
  if (parameter === 'acousticFrequencyHz') {
    const frequency = inputs.acousticDesign?.acousticFrequencyHz ?? 1e9;
    return { start: frequency * 0.5, end: frequency * 1.5, pointCount: 25 };
  }
  if (parameter === 'acousticIndexModulation') {
    const modulation = inputs.acousticDesign?.acousticIndexModulation ?? 0.002;
    return { start: 0, end: Math.max(0.001, modulation * 2), pointCount: 25 };
  }
  return {
    start: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
    end: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
    pointCount: 25,
  };
}

function getDefaultPeriodSweepBounds(periodCount: number, maximum?: number) {
  const currentPeriodCount =
    Number.isFinite(periodCount) && periodCount > 0 ? Math.round(periodCount) : 1;

  return {
    start: Math.max(1, currentPeriodCount - 100),
    end: Math.min(
      maximum ?? Number.POSITIVE_INFINITY,
      Math.max(2, currentPeriodCount + 100),
    ),
  };
}

function parseModernUnits(value: unknown): { ok: true } | ImportFailure {
  if (!isRecord(value)) {
    return { ok: false, message: 'Modern setup files must include units metadata.' };
  }

  if (value.wavelength !== 'nm') {
    return { ok: false, message: 'Modern setup wavelength units must be nm.' };
  }

  if (value.angle !== 'deg') {
    return { ok: false, message: 'Modern setup angle units must be deg.' };
  }

  return { ok: true };
}

function parseThicknessMode(
  value: unknown,
  isModernStackConfig: boolean,
): { ok: true; mode: ThicknessMode } | ImportFailure {
  if (value === 'derived' || value === 'manual' || value === 'acoustic' || value === 'hybrid') {
    return { ok: true, mode: value };
  }

  // Legacy Bragg files predate explicit input modes, so omission keeps the historical quarter-wave default.
  if (value === undefined && !isModernStackConfig) {
    return { ok: true, mode: 'derived' };
  }

  if (value === undefined) {
    return { ok: false, message: 'Modern setup files must include an input mode.' };
  }

  return { ok: false, message: 'Input mode must be derived, manual, acoustic, or hybrid.' };
}

function validateStructureTypeConsistency(
  structureType: unknown,
  thicknessMode: ThicknessMode,
): { ok: true } | ImportFailure {
  if (structureType === ACOUSTIC_STRUCTURE_TYPE && thicknessMode !== 'acoustic') {
    return {
      ok: false,
      message: 'Acousto-optic grating setup files must use acoustic input mode.',
    };
  }

  if (structureType === HYBRID_STRUCTURE_TYPE && thicknessMode !== 'hybrid') {
    return {
      ok: false,
      message: 'Hybrid Bragg setup files must use hybrid input mode.',
    };
  }

  if (structureType === STACK_CONFIG_STRUCTURE_TYPE && thicknessMode === 'acoustic') {
    return {
      ok: false,
      message: 'Quarter-wave stack setup files cannot use acoustic input mode.',
    };
  }

  if (structureType === STACK_CONFIG_STRUCTURE_TYPE && thicknessMode === 'hybrid') {
    return {
      ok: false,
      message: 'Quarter-wave stack setup files cannot use hybrid input mode.',
    };
  }

  if (structureType === LEGACY_BRAGG_STRUCTURE_TYPE && thicknessMode === 'acoustic') {
    return {
      ok: false,
      message: 'Legacy Bragg setup files cannot use acoustic input mode.',
    };
  }

  if (structureType === LEGACY_BRAGG_STRUCTURE_TYPE && thicknessMode === 'hybrid') {
    return {
      ok: false,
      message: 'Legacy Bragg setup files cannot use hybrid input mode.',
    };
  }

  return { ok: true };
}

function parseMaterial(
  value: unknown,
  label: 'high-index' | 'low-index' | 'acoustic',
): { ok: true; material: Material } | ImportFailure {
  if (!isRecord(value)) return { ok: false, message: `The ${label} material is missing or invalid.` };
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) {
    return { ok: false, message: `The ${label} material must include a string id and name.` };
  }
  const refractiveIndex = parseRefractiveIndex(value.refractiveIndex);
  if (!refractiveIndex.ok) return refractiveIndex;
  return {
    ok: true,
    material: { id: value.id, name: value.name, refractiveIndex: refractiveIndex.value },
  };
}

function parseRefractiveIndex(
  value: unknown,
): { ok: true; value: Material['refractiveIndex'] } | ImportFailure {
  if (typeof value === 'number') {
    if (isPositiveFiniteNumber(value)) {
      return { ok: true, value };
    }

    return {
      ok: false,
      message: 'The material refractive index must be a finite number greater than 0.',
    };
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      message: 'The material refractive index must be a finite number greater than 0.',
    };
  }

  if (!isFiniteNumber(value.real) || value.real <= 0 || !isFiniteNumber(value.imag) || value.imag < 0) {
    return {
      ok: false,
      message: 'The material refractive index object must include a positive real part and a non-negative imaginary part.',
    };
  }

  return {
    ok: true,
    value: {
      real: value.real,
      imag: value.imag,
    } satisfies ComplexRefractiveIndex,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/** Narrows unknown values to plain JSON objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
/** Checks for a non-empty string field. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSweepParameter(value: unknown): value is SweepParameter {
  return (
    value === 'designWavelengthNm' ||
    value === 'incidentAngleDegrees' ||
    value === 'periodCount' ||
    value === 'acousticFrequencyHz' ||
    value === 'acousticPeriodCount' ||
    value === 'acousticIndexModulation' ||
    value === 'hybridPeakStrain' ||
    value === 'hybridStrainCenterMm' ||
    value === 'hybridStrainWidthMm' ||
    value === 'hybridIndexModulation'
  );
}
/** Checks for a non-negative finite numeric field. */
function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Checks for a finite angle inside the supported open interval below 90 degrees. */
function isAngleFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 90;
}

function parseAcousticDesign(
  value: Record<string, unknown>,
  allowMissingRepresentationMode: boolean,
): { ok: true; design: QuarterWaveStackInputs['acousticDesign'] } | ImportFailure {
  if (!isRecord(value.acousticMaterial)) {
    return { ok: false, message: 'The acoustic material is missing or invalid.' };
  }

  if (!isNonEmptyString(value.acousticMaterial.id) || !isNonEmptyString(value.acousticMaterial.name)) {
    return { ok: false, message: 'The acoustic material must include a string id and name.' };
  }
  const acousticMaterial = parseMaterial(value.acousticMaterial, 'acoustic');
  if (!acousticMaterial.ok) return acousticMaterial;

  if (!isFiniteNumber(value.acousticVelocityMps) || value.acousticVelocityMps <= 0) {
    return { ok: false, message: 'The acoustic velocity must be greater than 0 m/s.' };
  }

  if (!isFiniteNumber(value.acousticFrequencyHz) || value.acousticFrequencyHz <= 0) {
    return { ok: false, message: 'The acoustic frequency must be greater than 0 Hz.' };
  }

  if (!isFiniteNumber(value.acousticPeriodCount) || value.acousticPeriodCount < 1 || !Number.isInteger(value.acousticPeriodCount)) {
    return { ok: false, message: 'The acoustic period count must be a whole number greater than 0.' };
  }

  if (!isFiniteNumber(value.braggOrder) || value.braggOrder < 1 || !Number.isInteger(value.braggOrder)) {
    return { ok: false, message: 'The Bragg order must be a whole number greater than 0.' };
  }

  if (!isFiniteNumber(value.acousticIndexModulation) || value.acousticIndexModulation < 0) {
    return { ok: false, message: 'The acoustic index modulation must be 0 or greater.' };
  }

  if (value.acousticRepresentationMode === undefined && !allowMissingRepresentationMode) {
    return { ok: false, message: 'Acoustic representation mode must be binary, fast, accurate, or reference.' };
  }

  const mode = value.acousticRepresentationMode === undefined && allowMissingRepresentationMode
    ? 'accurate'
    : value.acousticRepresentationMode;

  if (!isAcousticRepresentationMode(mode)) {
    return { ok: false, message: 'Acoustic representation mode must be binary, fast, accurate, or reference.' };
  }

  return {
    ok: true,
    design: {
      acousticMaterial: acousticMaterial.material,
      acousticVelocityMps: value.acousticVelocityMps,
      acousticFrequencyHz: value.acousticFrequencyHz,
      acousticPeriodCount: value.acousticPeriodCount,
      braggOrder: value.braggOrder,
      acousticIndexModulation: value.acousticIndexModulation,
      acousticRepresentationMode: mode,
    },
  };
}

function parseHybridBraggDesign(
  value: Record<string, unknown>,
): { ok: true; design: QuarterWaveStackInputs['hybridBraggDesign'] } | ImportFailure {
  const numericFields = [
    'lengthMm',
    'averageIndex',
    'indexModulation',
    'gratingPeriodNm',
    'gratingPhaseRadians',
    'peakStrain',
    'strainCenterMm',
    'strainWidthMm',
    'effectivePhotoelasticCoefficient',
    'segmentCount',
    'fixedLaserWavelengthNm',
  ] as const;
  for (const field of numericFields) {
    if (!isFiniteNumber(value[field])) {
      return { ok: false, message: `Hybrid Bragg field ${field} must be a finite number.` };
    }
  }
  if (!isHybridStrainShape(value.strainShape)) {
    return { ok: false, message: 'Hybrid strain shape must be a supported prescribed perturbation field.' };
  }
  if (!Number.isInteger(value.segmentCount)) {
    return { ok: false, message: 'Hybrid segment count must be a whole number.' };
  }
  const pulseSweepStartMm = value.pulseSweepStartMm ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.pulseSweepStartMm;
  const pulseSweepEndMm = value.pulseSweepEndMm ?? value.lengthMm;
  const pulseSweepPointCount = value.pulseSweepPointCount ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.pulseSweepPointCount;
  const perturbationEdgeWidthMm = value.perturbationEdgeWidthMm ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationEdgeWidthMm;
  const perturbationPeriodMm = value.perturbationPeriodMm ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationPeriodMm;
  const perturbationPhaseRadians = value.perturbationPhaseRadians ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationPhaseRadians;
  const perturbationTemporalPhaseRadians = value.perturbationTemporalPhaseRadians ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationTemporalPhaseRadians;
  const perturbationVelocityMps = value.perturbationVelocityMps ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationVelocityMps;
  const perturbationSecondaryPeriodMm = value.perturbationSecondaryPeriodMm ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationSecondaryPeriodMm;
  const perturbationSecondaryAmplitudeRatio = value.perturbationSecondaryAmplitudeRatio ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationSecondaryAmplitudeRatio;
  const perturbationSecondaryPhaseRadians = value.perturbationSecondaryPhaseRadians ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.perturbationSecondaryPhaseRadians;
  const strainBias = value.strainBias ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.strainBias;
  const actuatorCount = value.actuatorCount ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.actuatorCount;
  const actuatorPitchMm = value.actuatorPitchMm ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.actuatorPitchMm;
  const activeActuatorIndex = value.activeActuatorIndex ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.activeActuatorIndex;
  const actuatorCommandAmplitude = value.actuatorCommandAmplitude ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.actuatorCommandAmplitude;
  const actuatorAdjacentCommandAmplitude = value.actuatorAdjacentCommandAmplitude ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.actuatorAdjacentCommandAmplitude;
  const actuatorPolarity = value.actuatorPolarity ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.actuatorPolarity;
  const permanentGratingMode = value.permanentGratingMode ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.permanentGratingMode;
  const braggSectionCount = value.braggSectionCount ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.braggSectionCount;
  const braggSectionGapMm = value.braggSectionGapMm ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.braggSectionGapMm;
  const braggSectionPhaseMode = value.braggSectionPhaseMode ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.braggSectionPhaseMode;
  const braggSectionPhaseSequenceRadians = value.braggSectionPhaseSequenceRadians ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.braggSectionPhaseSequenceRadians;
  const braggSectionRandomSeed = value.braggSectionRandomSeed ?? DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.braggSectionRandomSeed;
  const couplingProfile = parseHybridCouplingProfile(value.couplingProfile);
  if (!couplingProfile.ok) return couplingProfile;
  const phaseProfile = parseHybridPhaseProfile(value.phaseProfile);
  if (!phaseProfile.ok) return phaseProfile;
  if (!isFiniteNumber(pulseSweepStartMm) || !isFiniteNumber(pulseSweepEndMm) || !isFiniteNumber(pulseSweepPointCount)) {
    return { ok: false, message: 'Hybrid moving-pulse sweep fields must be finite numbers.' };
  }
  if (
    !isFiniteNumber(perturbationEdgeWidthMm) ||
    !isFiniteNumber(perturbationPeriodMm) ||
    !isFiniteNumber(perturbationPhaseRadians) ||
    !isFiniteNumber(perturbationTemporalPhaseRadians) ||
    !isFiniteNumber(perturbationVelocityMps) ||
    !isFiniteNumber(perturbationSecondaryPeriodMm) ||
    !isFiniteNumber(perturbationSecondaryAmplitudeRatio) ||
    !isFiniteNumber(perturbationSecondaryPhaseRadians) ||
    !isFiniteNumber(strainBias) ||
    !isFiniteNumber(actuatorCount) ||
    !isFiniteNumber(actuatorPitchMm) ||
    !isFiniteNumber(activeActuatorIndex) ||
    !isFiniteNumber(actuatorCommandAmplitude) ||
    !isFiniteNumber(actuatorAdjacentCommandAmplitude)
  ) {
    return { ok: false, message: 'Hybrid perturbation fields must be finite numbers.' };
  }
  if (!Number.isInteger(pulseSweepPointCount)) {
    return { ok: false, message: 'Hybrid pulse sweep points must be a whole number.' };
  }
  if (!Number.isInteger(actuatorCount) || !Number.isInteger(activeActuatorIndex)) {
    return { ok: false, message: 'Hybrid actuator count and active actuator must be whole numbers.' };
  }
  if (actuatorPolarity !== 'window' && actuatorPolarity !== 'trough') {
    return { ok: false, message: 'Hybrid actuator polarity must be window or trough.' };
  }
  if (permanentGratingMode !== 'global' && permanentGratingMode !== 'segmented') {
    return { ok: false, message: 'Hybrid permanent grating mode must be global or segmented.' };
  }
  if (!isHybridSectionPhaseMode(braggSectionPhaseMode)) {
    return { ok: false, message: 'Hybrid section phase mode must be supported.' };
  }
  if (!isFiniteNumber(braggSectionCount) || !Number.isInteger(braggSectionCount) || braggSectionCount < 1) {
    return { ok: false, message: 'Hybrid Bragg section count must be a whole number of at least 1.' };
  }
  if (braggSectionCount > MAX_HYBRID_BRAGG_SECTIONS) {
    return { ok: false, message: `Hybrid Bragg section count must not exceed ${MAX_HYBRID_BRAGG_SECTIONS.toLocaleString()}.` };
  }
  if (!isFiniteNumber(braggSectionGapMm) || braggSectionGapMm < 0 || !isFiniteNumber(braggSectionRandomSeed)) {
    return { ok: false, message: 'Hybrid Bragg segmentation fields must be finite non-negative numbers.' };
  }
  if (!Array.isArray(braggSectionPhaseSequenceRadians) || !braggSectionPhaseSequenceRadians.every(isFiniteNumber)) {
    return { ok: false, message: 'Hybrid section phase sequence must contain only finite numbers.' };
  }
  const design = value as {
    lengthMm: number;
    averageIndex: number;
    indexModulation: number;
    gratingPeriodNm: number;
    gratingPhaseRadians: number;
    peakStrain: number;
    strainCenterMm: number;
    strainWidthMm: number;
    strainShape: NonNullable<QuarterWaveStackInputs['hybridBraggDesign']>['strainShape'];
    effectivePhotoelasticCoefficient: number;
    segmentCount: number;
    fixedLaserWavelengthNm: number;
  };
  return {
    ok: true,
    design: {
      lengthMm: design.lengthMm,
      averageIndex: design.averageIndex,
      indexModulation: design.indexModulation,
      gratingPeriodNm: design.gratingPeriodNm,
      gratingPhaseRadians: design.gratingPhaseRadians,
      couplingProfile: couplingProfile.profile,
      phaseProfile: phaseProfile.profile,
      permanentGratingMode,
      braggSectionCount,
      braggSectionGapMm,
      braggSectionPhaseMode,
      braggSectionPhaseSequenceRadians,
      braggSectionRandomSeed,
      peakStrain: design.peakStrain,
      strainCenterMm: design.strainCenterMm,
      strainWidthMm: design.strainWidthMm,
      strainShape: design.strainShape,
      perturbationEdgeWidthMm,
      perturbationPeriodMm,
      perturbationPhaseRadians,
      perturbationTemporalPhaseRadians,
      perturbationVelocityMps,
      perturbationSecondaryPeriodMm,
      perturbationSecondaryAmplitudeRatio,
      perturbationSecondaryPhaseRadians,
      strainBias,
      actuatorCount,
      actuatorPitchMm,
      activeActuatorIndex,
      actuatorCommandAmplitude,
      actuatorAdjacentCommandAmplitude,
      actuatorPolarity,
      effectivePhotoelasticCoefficient: design.effectivePhotoelasticCoefficient,
      segmentCount: design.segmentCount,
      fixedLaserWavelengthNm: design.fixedLaserWavelengthNm,
      pulseSweepStartMm,
      pulseSweepEndMm,
      pulseSweepPointCount,
    },
  };
}

function parseHybridCouplingProfile(
  value: unknown,
): { ok: true; profile: HybridCouplingProfile } | ImportFailure {
  if (value === undefined) return { ok: true, profile: DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.couplingProfile ?? { family: 'uniform' } };
  if (!isRecord(value)) return { ok: false, message: 'Hybrid coupling profile must be an object.' };
  switch (value.family) {
    case 'uniform':
      return { ok: true, profile: { family: 'uniform' } };
    case 'gaussian':
      if (!isPositiveFiniteNumber(value.widthFraction) || !isFiniteNumber(value.peakMultiplier) || typeof value.normalizeIntegratedCoupling !== 'boolean') {
        return { ok: false, message: 'Hybrid Gaussian coupling profile fields are invalid.' };
      }
      return { ok: true, profile: { family: 'gaussian', widthFraction: value.widthFraction, peakMultiplier: value.peakMultiplier, normalizeIntegratedCoupling: value.normalizeIntegratedCoupling } };
    case 'raised-cosine':
      if (!isFiniteNumber(value.floorMultiplier) || !isFiniteNumber(value.peakMultiplier) || typeof value.normalizeIntegratedCoupling !== 'boolean') {
        return { ok: false, message: 'Hybrid raised-cosine coupling profile fields are invalid.' };
      }
      return { ok: true, profile: { family: 'raised-cosine', floorMultiplier: value.floorMultiplier, peakMultiplier: value.peakMultiplier, normalizeIntegratedCoupling: value.normalizeIntegratedCoupling } };
    case 'tukey':
      if (!isFiniteNumber(value.taperFraction) || !isFiniteNumber(value.floorMultiplier) || !isFiniteNumber(value.peakMultiplier) || typeof value.normalizeIntegratedCoupling !== 'boolean') {
        return { ok: false, message: 'Hybrid Tukey coupling profile fields are invalid.' };
      }
      return { ok: true, profile: { family: 'tukey', taperFraction: value.taperFraction, floorMultiplier: value.floorMultiplier, peakMultiplier: value.peakMultiplier, normalizeIntegratedCoupling: value.normalizeIntegratedCoupling } };
    case 'piecewise':
      if (!Array.isArray(value.zoneMultipliers) || !value.zoneMultipliers.every(isFiniteNumber) || typeof value.normalizeIntegratedCoupling !== 'boolean') {
        return { ok: false, message: 'Hybrid piecewise coupling profile fields are invalid.' };
      }
      return { ok: true, profile: { family: 'piecewise', zoneMultipliers: value.zoneMultipliers, normalizeIntegratedCoupling: value.normalizeIntegratedCoupling } };
    default:
      return { ok: false, message: 'Hybrid coupling profile family must be supported.' };
  }
}

function parseHybridPhaseProfile(
  value: unknown,
): { ok: true; profile: HybridPhaseProfile } | ImportFailure {
  if (value === undefined) return { ok: true, profile: DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS.phaseProfile ?? { family: 'constant' } };
  if (!isRecord(value)) return { ok: false, message: 'Hybrid phase profile must be an object.' };
  switch (value.family) {
    case 'constant':
      return { ok: true, profile: { family: 'constant' } };
    case 'linear-ramp':
      if (!isFiniteNumber(value.totalPhaseRadians)) return { ok: false, message: 'Hybrid linear phase profile fields are invalid.' };
      return { ok: true, profile: { family: 'linear-ramp', totalPhaseRadians: value.totalPhaseRadians } };
    case 'piecewise':
      if (!Array.isArray(value.zonePhaseRadians) || !value.zonePhaseRadians.every(isFiniteNumber)) {
        return { ok: false, message: 'Hybrid piecewise phase profile fields are invalid.' };
      }
      return { ok: true, profile: { family: 'piecewise', zonePhaseRadians: value.zonePhaseRadians } };
    case 'alternating':
      if (!isFiniteNumber(value.zoneCount) || !Number.isInteger(value.zoneCount) || value.zoneCount < 1 || !isFiniteNumber(value.phaseStepRadians)) {
        return { ok: false, message: 'Hybrid alternating phase profile fields are invalid.' };
      }
      return { ok: true, profile: { family: 'alternating', zoneCount: value.zoneCount, phaseStepRadians: value.phaseStepRadians } };
    default:
      return { ok: false, message: 'Hybrid phase profile family must be supported.' };
  }
}

function isHybridSectionPhaseMode(
  value: unknown,
): value is NonNullable<QuarterWaveStackInputs['hybridBraggDesign']>['braggSectionPhaseMode'] {
  return (
    value === 'continuous' ||
    value === 'fixed-reset' ||
    value === 'alternating' ||
    value === 'explicit' ||
    value === 'seeded-random'
  );
}

function isHybridStrainShape(value: unknown): value is NonNullable<QuarterWaveStackInputs['hybridBraggDesign']>['strainShape'] {
  return (
    value === 'rectangular' ||
    value === 'gaussian' ||
    value === 'smooth-top-hat' ||
    value === 'triangular' ||
    value === 'traveling-sinusoid' ||
    value === 'standing-wave' ||
    value === 'carrier-envelope' ||
    value === 'multi-tone' ||
    value === 'piezo-window' ||
    value === 'piezo-trough' ||
    value === 'piezo-array'
  );
}
