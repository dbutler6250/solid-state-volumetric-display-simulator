import type { PermanentBraggGrating } from '../structures/hybridBraggGrating';

export type MaterialStrainResponse = {
  effectivePhotoelasticCoefficient: number;
};

/** Applies the first-order strain response for index, grating period, and local Bragg condition. */
export function applyMaterialStrainResponse(
  grating: PermanentBraggGrating,
  response: MaterialStrainResponse,
  strain: number,
) {
  const indexChange = -0.5 * grating.averageIndex ** 3 * response.effectivePhotoelasticCoefficient * strain;
  const averageIndex = grating.averageIndex + indexChange;
  const periodM = grating.periodM * (1 + strain);
  const braggWavelengthM = 2 * averageIndex * periodM;
  return { averageIndex, periodM, braggWavelengthM, indexChange };
}

