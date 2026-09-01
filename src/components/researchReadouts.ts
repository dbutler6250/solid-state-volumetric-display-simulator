import type { HybridBraggDesignInputs } from '../types/simulation';

export type FixedGratingReadouts = {
  staticBraggWavelengthNm: number;
  laserDetuningNm: number;
  backgroundBraggWavelengthNm: number;
  troughStrain: number;
  troughBraggWavelengthNm: number;
  strainRelief: number;
};

/** Derives UI readouts for the fixed-grating research workspace without changing solver inputs. */
export function getFixedGratingReadouts(design: HybridBraggDesignInputs): FixedGratingReadouts {
  const staticBraggWavelengthNm = 2 * design.averageIndex * design.gratingPeriodNm;
  const laserDetuningNm = design.fixedLaserWavelengthNm - staticBraggWavelengthNm;
  const backgroundBraggWavelengthNm =
    staticBraggWavelengthNm * (1 - design.effectivePhotoelasticCoefficient * design.strainBias);
  const troughStrain = design.strainBias + design.peakStrain;
  const troughBraggWavelengthNm =
    staticBraggWavelengthNm * (1 - design.effectivePhotoelasticCoefficient * troughStrain);

  return {
    staticBraggWavelengthNm,
    laserDetuningNm,
    backgroundBraggWavelengthNm,
    troughStrain,
    troughBraggWavelengthNm,
    strainRelief: -design.peakStrain,
  };
}

export const formatNm = (value: number): string => value.toFixed(3);

export const formatSignedNm = (value: number): string => `${value >= 0 ? '+' : ''}${formatNm(value)}`;

export const formatMm = (value: number): string => value.toFixed(3);

export const formatMicrostrain = (value: number): string => `${Math.round(value * 1_000_000).toLocaleString()} microstrain`;

export const formatStrain = (value: number): string => value.toPrecision(4);

/** Summarizes the operating point in language tied to the optical state, not implementation mode. */
export function getOperatingPointInterpretation(design: HybridBraggDesignInputs): string {
  const readouts = getFixedGratingReadouts(design);
  const backgroundOffset = Math.abs(design.fixedLaserWavelengthNm - readouts.backgroundBraggWavelengthNm);
  const troughOffset = Math.abs(design.fixedLaserWavelengthNm - readouts.troughBraggWavelengthNm);

  if (troughOffset < backgroundOffset) {
    return `The background grating is detuned from the laser, while the strain trough shifts the local Bragg condition toward resonance near ${formatMm(design.strainCenterMm)} mm.`;
  }

  if (backgroundOffset <= 0.02 && troughOffset <= 0.02) {
    return 'The current laser is close to resonance in both the background and trough regions; expect competing reflection regions.';
  }

  return 'The current operating point is away from the local trough resonance; spatial reflection may be weak or ambiguous.';
}
