import { validateQuarterWaveStackInputs } from '../simulation/validation/quarterWaveStackValidation';
import { isAcousticRepresentationMode } from '../simulation/structures/acoustoOpticGrating';
import type { Material, ComplexRefractiveIndex } from '../simulation/materials/material';
import type {
  ParameterSweepSettings,
  Polarization,
  QuarterWaveStackInputs,
  SweepParameter,
  ThicknessMode,
} from '../types/simulation';

const STACK_CONFIG_SCHEMA = 'ssvds-stack-config-v1';
const LEGACY_BRAGG_CONFIG_SCHEMA = 'ssvds-bragg-config-v1';
const STACK_CONFIG_APP = 'solid-state-volumetric-display-simulator';
const STACK_CONFIG_STRUCTURE_TYPE = 'quarter-wave-stack';
const ACOUSTIC_STRUCTURE_TYPE = 'acousto-optic-grating';
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
      : value.parameter === 'acousticIndexModulation'
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
  if (value === 'derived' || value === 'manual' || value === 'acoustic') {
    return { ok: true, mode: value };
  }

  // Legacy Bragg files predate explicit input modes, so omission keeps the historical quarter-wave default.
  if (value === undefined && !isModernStackConfig) {
    return { ok: true, mode: 'derived' };
  }

  if (value === undefined) {
    return { ok: false, message: 'Modern setup files must include an input mode.' };
  }

  return { ok: false, message: 'Input mode must be derived, manual, or acoustic.' };
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

  if (structureType === STACK_CONFIG_STRUCTURE_TYPE && thicknessMode === 'acoustic') {
    return {
      ok: false,
      message: 'Quarter-wave stack setup files cannot use acoustic input mode.',
    };
  }

  if (structureType === LEGACY_BRAGG_STRUCTURE_TYPE && thicknessMode === 'acoustic') {
    return {
      ok: false,
      message: 'Legacy Bragg setup files cannot use acoustic input mode.',
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
    value === 'acousticIndexModulation'
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
