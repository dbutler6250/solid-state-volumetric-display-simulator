export type HostMechanicalProperties = {
  youngsModulusPa: number;
  crossSectionAreaM2: number;
  densityKgPerM3?: number;
  poissonRatio?: number;
};

export type AxialState = {
  strain: number;
  stressPa: number;
  forceN: number;
  displacementM: number;
  elasticEnergyJ: number;
};

/** Solves the uniform small-strain axial bar relations used by reduced-order studies. */
export function solveUniformAxialStrain(
  lengthM: number,
  strain: number,
  properties: HostMechanicalProperties,
): AxialState {
  const stressPa = properties.youngsModulusPa * strain;
  const forceN = stressPa * properties.crossSectionAreaM2;
  const displacementM = strain * lengthM;
  const elasticEnergyJ = 0.5 * properties.youngsModulusPa * strain ** 2 * properties.crossSectionAreaM2 * lengthM;
  return { strain, stressPa, forceN, displacementM, elasticEnergyJ };
}

/** Converts an imposed end displacement into uniform engineering strain. */
export function strainFromPrescribedDisplacement(displacementM: number, lengthM: number): number {
  return lengthM > 0 ? displacementM / lengthM : 0;
}

/** Returns local strain under a constant axial force and piecewise axial stiffness. */
export function strainFromForceAndStiffness(forceN: number, youngsModulusPa: number, areaM2: number): number {
  const axialStiffness = youngsModulusPa * areaM2;
  return axialStiffness > 0 ? forceN / axialStiffness : 0;
}

/** Superposes a constrained eigenstrain contribution with the global preload strain. */
export function superposeEigenstrain(preloadStrain: number, eigenstrain: number, transfer = 1): number {
  return preloadStrain + eigenstrain * transfer;
}
