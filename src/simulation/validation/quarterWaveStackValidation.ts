import type { QuarterWaveStackInputs } from '../../types/simulation';
import { getAcousticSlicesPerPeriod, isAcousticRepresentationMode } from '../structures/acoustoOpticGrating';
import {
  DEFAULT_WAVELENGTH_POINT_COUNT,
  MAX_AUTOMATIC_ACOUSTIC_LAYERS,
  MAX_DIRECT_SOLVE_WORK,
  MAX_OPTICAL_PERIODS,
  MAX_WAVELENGTH_POINTS,
} from '../simulationLimits';
import { getRefractiveIndexImag, getRefractiveIndexReal, isComplexRefractiveIndex } from '../materials/material';

export type ValidationIssue = {
  field: keyof QuarterWaveStackInputs;
  message: string;
};

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const validateRefractiveIndex = (
  value: QuarterWaveStackInputs['highIndexMaterial']['refractiveIndex'],
  label: 'high-index' | 'low-index',
): ValidationIssue | null => {
  const real = getRefractiveIndexReal(value);
  const imag = getRefractiveIndexImag(value);

  if (!Number.isFinite(real) || real <= 0) {
    return {
      field: label === 'high-index' ? 'highIndexMaterial' : 'lowIndexMaterial',
      message: `${label === 'high-index' ? 'High' : 'Low'}-index material refractive index real part must be greater than 0.`,
    };
  }

  if (!Number.isFinite(imag) || imag < 0) {
    return {
      field: label === 'high-index' ? 'highIndexMaterial' : 'lowIndexMaterial',
      message: `${label === 'high-index' ? 'High' : 'Low'}-index material refractive index imaginary part must be 0 or greater.`,
    };
  }

  if (isComplexRefractiveIndex(value) && (!Number.isFinite(value.real) || !Number.isFinite(value.imag))) {
    return {
      field: label === 'high-index' ? 'highIndexMaterial' : 'lowIndexMaterial',
      message: `${label === 'high-index' ? 'High' : 'Low'}-index material refractive index must be finite.`,
    };
  }

  return null;
};

/** Validates the stack inputs used by the form, importer, and solver. */
export function validateQuarterWaveStackInputs(inputs: QuarterWaveStackInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const thicknessMode = inputs.thicknessMode ?? 'derived';
  const wavelengthStartNm = inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5;
  const wavelengthEndNm = inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5;
  const wavelengthPointCount = inputs.wavelengthPointCount ?? DEFAULT_WAVELENGTH_POINT_COUNT;

  if (
    !isNonEmptyString(inputs.highIndexMaterial.id) ||
    !isNonEmptyString(inputs.highIndexMaterial.name)
  ) {
    issues.push({
      field: 'highIndexMaterial',
      message: 'High-index material must include an id and name.',
    });
  }

  const highIndexIssue = validateRefractiveIndex(inputs.highIndexMaterial.refractiveIndex, 'high-index');
  if (highIndexIssue) issues.push(highIndexIssue);

  if (
    !isNonEmptyString(inputs.lowIndexMaterial.id) ||
    !isNonEmptyString(inputs.lowIndexMaterial.name)
  ) {
    issues.push({
      field: 'lowIndexMaterial',
      message: 'Low-index material must include an id and name.',
    });
  }

  const lowIndexIssue = validateRefractiveIndex(inputs.lowIndexMaterial.refractiveIndex, 'low-index');
  if (lowIndexIssue) issues.push(lowIndexIssue);

  if (!isFiniteNumber(inputs.periodCount) || inputs.periodCount < 1 || !Number.isInteger(inputs.periodCount)) {
    issues.push({
      field: 'periodCount',
      message: 'Period count must be a whole number greater than 0.',
    });
  } else if (thicknessMode !== 'acoustic' && inputs.periodCount > MAX_OPTICAL_PERIODS) {
    issues.push({
      field: 'periodCount',
      message: `Period count must not exceed ${MAX_OPTICAL_PERIODS.toLocaleString()} for direct optical or manual solving.`,
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

  if (thicknessMode !== 'derived' && thicknessMode !== 'manual' && thicknessMode !== 'acoustic') {
    issues.push({
      field: 'thicknessMode',
      message: 'Input mode must be optical, manual, or acoustic.',
    });
  }

  if (thicknessMode === 'manual') {
    const highIndexThicknessNm = inputs.highIndexThicknessNm;
    const lowIndexThicknessNm = inputs.lowIndexThicknessNm;

    if (typeof highIndexThicknessNm !== 'number' || !Number.isFinite(highIndexThicknessNm) || highIndexThicknessNm <= 0) {
      issues.push({
        field: 'highIndexThicknessNm',
        message: 'High-index thickness must be greater than 0 nm in manual mode.',
      });
    }

    if (typeof lowIndexThicknessNm !== 'number' || !Number.isFinite(lowIndexThicknessNm) || lowIndexThicknessNm <= 0) {
      issues.push({
        field: 'lowIndexThicknessNm',
        message: 'Low-index thickness must be greater than 0 nm in manual mode.',
      });
    }
  }

  if (thicknessMode === 'acoustic') {
    const design = inputs.acousticDesign;
    if (!design) {
      issues.push({
        field: 'thicknessMode',
        message: 'Acoustic input mode requires acoustic design inputs.',
      });
    } else {
      const hasValidAcousticRepresentationMode = isAcousticRepresentationMode(design.acousticRepresentationMode);

      if (!hasValidAcousticRepresentationMode) {
        issues.push({
          field: 'thicknessMode',
          message: 'Acoustic representation mode must be binary, fast, accurate, or reference.',
        });
      }
      if (!isFiniteNumber(design.acousticVelocityMps) || design.acousticVelocityMps <= 0) {
        issues.push({
          field: 'thicknessMode',
          message: 'Acoustic velocity must be greater than 0 m/s.',
        });
      }
      if (!isFiniteNumber(design.acousticFrequencyHz) || design.acousticFrequencyHz <= 0) {
        issues.push({
          field: 'thicknessMode',
          message: 'Acoustic frequency must be greater than 0 Hz.',
        });
      }
      if (!isFiniteNumber(design.acousticPeriodCount) || design.acousticPeriodCount < 1 || !Number.isInteger(design.acousticPeriodCount)) {
        issues.push({
          field: 'thicknessMode',
          message: 'Acoustic period count must be a whole number greater than 0.',
        });
      }
      if (
        isFiniteNumber(design.acousticPeriodCount) &&
        Number.isInteger(design.acousticPeriodCount) &&
        hasValidAcousticRepresentationMode &&
        design.acousticPeriodCount * getAcousticSlicesPerPeriod(design.acousticRepresentationMode) >
          MAX_AUTOMATIC_ACOUSTIC_LAYERS
      ) {
        issues.push({
          field: 'thicknessMode',
          message: `Automatic acoustic solving is limited to ${MAX_AUTOMATIC_ACOUSTIC_LAYERS.toLocaleString()} slices. Reduce periods or representation detail.`,
        });
      }
      if (!isFiniteNumber(design.braggOrder) || design.braggOrder < 1 || !Number.isInteger(design.braggOrder)) {
        issues.push({
          field: 'thicknessMode',
          message: 'Bragg order must be a whole number greater than 0.',
        });
      }
      if (!isFiniteNumber(design.acousticIndexModulation) || design.acousticIndexModulation < 0) {
        issues.push({
          field: 'thicknessMode',
          message: 'Acoustic index modulation must be 0 or greater.',
        });
      }
    }
  }

  if (!isFiniteNumber(wavelengthStartNm) || wavelengthStartNm <= 0) {
    issues.push({
      field: 'wavelengthStartNm',
      message: 'Sweep start must be greater than 0 nm.',
    });
  } else if (!Number.isInteger(wavelengthStartNm)) {
    issues.push({
      field: 'wavelengthStartNm',
      message: 'Sweep start must be a whole number of nanometers.',
    });
  }

  if (!isFiniteNumber(wavelengthEndNm) || wavelengthEndNm <= wavelengthStartNm) {
    issues.push({
      field: 'wavelengthEndNm',
      message: 'Sweep end must be greater than sweep start.',
    });
  } else if (!Number.isInteger(wavelengthEndNm)) {
    issues.push({
      field: 'wavelengthEndNm',
      message: 'Sweep end must be a whole number of nanometers.',
    });
  }

  if (!isFiniteNumber(wavelengthPointCount) || wavelengthPointCount < 2 || !Number.isInteger(wavelengthPointCount)) {
    issues.push({
      field: 'wavelengthPointCount',
      message: 'Sweep points must be a whole number of at least 2.',
    });
  } else if (wavelengthPointCount > MAX_WAVELENGTH_POINTS) {
    issues.push({
      field: 'wavelengthPointCount',
      message: `Sweep points must not exceed ${MAX_WAVELENGTH_POINTS.toLocaleString()}.`,
    });
  }

  if (issues.length === 0 && thicknessMode !== 'acoustic') {
    const resolvedLayerCount = inputs.periodCount * 2;
    // The direct solve must bound layer-by-wavelength work before building the full layer stack.
    const directSolveWork = resolvedLayerCount * wavelengthPointCount;
    if (directSolveWork > MAX_DIRECT_SOLVE_WORK) {
      issues.push({
        field: 'periodCount',
        message: `Direct optical solving is limited to about ${MAX_DIRECT_SOLVE_WORK.toLocaleString()} layer-wavelength evaluations. Reduce periods or wavelength samples.`,
      });
    }
  }

  return issues;
}
