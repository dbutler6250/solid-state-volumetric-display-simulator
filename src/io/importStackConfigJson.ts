import { validateQuarterWaveStackInputs } from '../simulation/validation/quarterWaveStackValidation';
import type { Material } from '../simulation/materials/material';
import type { ParameterSweepSettings, Polarization, QuarterWaveStackInputs } from '../types/simulation';

const STACK_CONFIG_SCHEMA = 'ssvds-stack-config-v1';
const LEGACY_BRAGG_CONFIG_SCHEMA = 'ssvds-bragg-config-v1';
const STACK_CONFIG_APP = 'solid-state-volumetric-display-simulator';
const STACK_CONFIG_STRUCTURE_TYPE = 'quarter-wave-stack';
const LEGACY_BRAGG_STRUCTURE_TYPE = 'quarter-wave-bragg-reflector';

type ImportSuccess = {
  ok: true;
  inputs: QuarterWaveStackInputs;
  parameterSweep?: ParameterSweepSettings;
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
    parsed.structureType !== LEGACY_BRAGG_STRUCTURE_TYPE
  ) {
    return { ok: false, message: 'This setup file is not a quarter-wave stack configuration.' };
  }

  if (!isRecord(parsed.inputs)) {
    return { ok: false, message: 'The setup file is missing its inputs payload.' };
  }

  const rawInputs = parsed.inputs;

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
    wavelengthStartNm: rawInputs.wavelengthStartNm as number | undefined,
    wavelengthEndNm: rawInputs.wavelengthEndNm as number | undefined,
    wavelengthPointCount: rawInputs.wavelengthPointCount as number | undefined,
  };

  const issues = validateQuarterWaveStackInputs(inputs);
  if (issues.length > 0) {
    return { ok: false, message: issues[0].message };
  }

  const parameterSweep = parseParameterSweep(parsed.parameterSweep);
  if (!parameterSweep.ok) return parameterSweep;

  return {
    ok: true,
    inputs,
    parameterSweep: parameterSweep.settings,
  };
}

function parseParameterSweep(
  value: unknown,
): { ok: true; settings?: ParameterSweepSettings } | ImportFailure {
  if (value === undefined) return { ok: true };
  if (!isRecord(value)) return { ok: false, message: 'The parameter sweep setup is invalid.' };
  if (value.parameter !== 'designWavelengthNm' && value.parameter !== 'periodCount') {
    return { ok: false, message: 'Parameter sweep must target design wavelength or periods.' };
  }
  if (
    !isPositiveFiniteNumber(value.start) ||
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
      start: value.start,
      end: value.end,
      pointCount: value.pointCount,
    },
  };
}

function parseMaterial(
  value: unknown,
  label: 'high-index' | 'low-index',
): { ok: true; material: Material } | ImportFailure {
  if (!isRecord(value)) return { ok: false, message: `The ${label} material is missing or invalid.` };
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) {
    return { ok: false, message: `The ${label} material must include a string id and name.` };
  }
  if (!isPositiveFiniteNumber(value.refractiveIndex)) {
    return {
      ok: false,
      message: `The ${label} material refractive index must be a finite number greater than 0.`,
    };
  }
  return {
    ok: true,
    material: { id: value.id, name: value.name, refractiveIndex: value.refractiveIndex },
  };
}

/** Narrows unknown values to plain JSON objects. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
/** Checks for a non-empty string field. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
/** Checks for a positive finite numeric field. */
function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
