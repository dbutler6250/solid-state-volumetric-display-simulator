import type { QuarterWaveStackInputs } from '../../types/simulation';

export type ValidationIssue = {
  field: keyof QuarterWaveStackInputs;
  message: string;
};

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Validates the stack inputs used by the form, importer, and solver. */
export function validateQuarterWaveStackInputs(inputs: QuarterWaveStackInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const wavelengthStartNm = inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5;
  const wavelengthEndNm = inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5;
  const wavelengthPointCount = inputs.wavelengthPointCount ?? 401;

  if (
    !isNonEmptyString(inputs.highIndexMaterial.id) ||
    !isNonEmptyString(inputs.highIndexMaterial.name)
  ) {
    issues.push({
      field: 'highIndexMaterial',
      message: 'High-index material must include an id and name.',
    });
  }

  if (
    !isFiniteNumber(inputs.highIndexMaterial.refractiveIndex) ||
    inputs.highIndexMaterial.refractiveIndex <= 0
  ) {
    issues.push({
      field: 'highIndexMaterial',
      message: 'High-index material refractive index must be greater than 0.',
    });
  }

  if (
    !isNonEmptyString(inputs.lowIndexMaterial.id) ||
    !isNonEmptyString(inputs.lowIndexMaterial.name)
  ) {
    issues.push({
      field: 'lowIndexMaterial',
      message: 'Low-index material must include an id and name.',
    });
  }

  if (
    !isFiniteNumber(inputs.lowIndexMaterial.refractiveIndex) ||
    inputs.lowIndexMaterial.refractiveIndex <= 0
  ) {
    issues.push({
      field: 'lowIndexMaterial',
      message: 'Low-index material refractive index must be greater than 0.',
    });
  }

  if (
    !isFiniteNumber(inputs.periodCount) ||
    inputs.periodCount < 1 ||
    !Number.isInteger(inputs.periodCount)
  ) {
    issues.push({
      field: 'periodCount',
      message: 'Period count must be a whole number greater than 0.',
    });
  }

  if (!isFiniteNumber(inputs.designWavelengthNm) || inputs.designWavelengthNm <= 0) {
    issues.push({
      field: 'designWavelengthNm',
      message: 'Design wavelength must be greater than 0 nm.',
    });
  }

  if (
    !isFiniteNumber(inputs.incidentAngleDegrees) ||
    inputs.incidentAngleDegrees < 0 ||
    inputs.incidentAngleDegrees >= 90
  ) {
    issues.push({
      field: 'incidentAngleDegrees',
      message: 'Incident angle must be at least 0 degrees and less than 90 degrees.',
    });
  }

  if (inputs.polarization !== 'TE' && inputs.polarization !== 'TM') {
    issues.push({
      field: 'polarization',
      message: 'Polarization must be TE or TM.',
    });
  }

  if (!isFiniteNumber(wavelengthStartNm) || wavelengthStartNm <= 0) {
    issues.push({
      field: 'wavelengthStartNm',
      message: 'Sweep start must be greater than 0 nm.',
    });
  }

  if (!isFiniteNumber(wavelengthEndNm) || wavelengthEndNm <= wavelengthStartNm) {
    issues.push({
      field: 'wavelengthEndNm',
      message: 'Sweep end must be greater than sweep start.',
    });
  }

  if (
    !isFiniteNumber(wavelengthPointCount) ||
    wavelengthPointCount < 2 ||
    !Number.isInteger(wavelengthPointCount)
  ) {
    issues.push({
      field: 'wavelengthPointCount',
      message: 'Sweep points must be a whole number of at least 2.',
    });
  }

  return issues;
}
