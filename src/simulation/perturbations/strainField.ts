import type { HybridStrainShape } from '../../types/simulation';

export type StrainField = {
  peakStrain: number;
  centerM: number;
  widthM: number;
  shape: HybridStrainShape;
};

/** Samples a prescribed dimensionless strain field at one SI position. */
export function sampleStrainField(field: StrainField, zM: number): number {
  if (field.widthM <= 0) return 0;
  const distance = zM - field.centerM;
  if (field.shape === 'rectangular') {
    return Math.abs(distance) <= field.widthM / 2 ? field.peakStrain : 0;
  }

  const sigmaM = field.widthM / 2.355;
  return field.peakStrain * Math.exp(-0.5 * (distance / sigmaM) ** 2);
}

