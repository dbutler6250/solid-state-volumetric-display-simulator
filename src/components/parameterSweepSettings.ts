import type { ParameterSweepSettings, QuarterWaveStackInputs } from '../types/simulation';
import { getAcousticSlicesPerPeriod } from '../simulation/structures/acoustoOpticGrating';
import { MAX_AUTOMATIC_ACOUSTIC_LAYERS } from '../simulation/simulationLimits';

/** Fixed incident-angle sweep exposed by the constrained user interface. */
export const FIXED_INCIDENT_ANGLE_SWEEP: ParameterSweepSettings = {
  parameter: 'incidentAngleDegrees',
  start: 0,
  end: 89,
  pointCount: 89,
};

/** Returns one sample for every inclusive integer period between the normalized bounds. */
export function getInclusivePeriodPointCount(start: number, end: number): number {
  const normalizedStart = Math.max(1, Math.round(start));
  const normalizedEnd = Math.max(normalizedStart + 1, Math.round(end));
  return normalizedEnd - normalizedStart + 1;
}

/** Applies only the parameter-specific bounds that are intentionally derived or fixed. */
export function getEffectiveParameterSweep(
  inputs: QuarterWaveStackInputs,
  settings: ParameterSweepSettings,
): ParameterSweepSettings {
  if (settings.parameter === 'periodCount' || settings.parameter === 'acousticPeriodCount') {
    return {
      ...settings,
      pointCount: getInclusivePeriodPointCount(settings.start, settings.end),
    };
  }
  if (settings.parameter === 'incidentAngleDegrees') return FIXED_INCIDENT_ANGLE_SWEEP;
  if (settings.parameter !== 'designWavelengthNm') return settings;

  return {
    ...settings,
    start: inputs.wavelengthStartNm ?? inputs.designWavelengthNm * 0.5,
    end: inputs.wavelengthEndNm ?? inputs.designWavelengthNm * 1.5,
  };
}

/** Returns the highest acoustic period count allowed by the active representation. */
export function getMaximumAcousticPeriodCount(inputs: QuarterWaveStackInputs): number {
  const mode = inputs.acousticDesign?.acousticRepresentationMode ?? 'accurate';
  return Math.floor(MAX_AUTOMATIC_ACOUSTIC_LAYERS / getAcousticSlicesPerPeriod(mode));
}
