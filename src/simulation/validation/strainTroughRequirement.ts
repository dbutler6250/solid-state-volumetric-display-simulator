export type UsefulStateThresholds = {
  minimumReflectance: number;
  maximumCenterErrorMm: number;
  maximumRegionWidthMm: number;
  maximumOffTargetFraction: number;
  minimumTargetFraction: number;
  maximumRegionCount: number;
};

export type RobustnessMetricSample = {
  value: number;
  useful: boolean;
  reflectance: number;
  centerErrorMm: number | null;
  regionWidthMm: number | null;
  targetFraction: number | null;
  offTargetFraction: number | null;
  strongestCompetitor: number;
  regionCount: number;
};

export type UsefulRange = {
  nominal: number;
  lowerTestedUsefulBound: number | null;
  upperTestedUsefulBound: number | null;
  usefulCount: number;
  testedCount: number;
};

export type StrainTroughRequirement = {
  backgroundStrain: number;
  backgroundStrainTolerance: [number, number] | null;
  troughStrain: number;
  troughStrainTolerance: [number, number] | null;
  strainExcursion: number;
  strainExcursionTolerance: [number, number] | null;
  nominalWidthMm: number;
  widthToleranceMm: [number, number] | null;
  transitionWidthMm: number;
  transitionToleranceMm: [number, number] | null;
  positionToleranceMm: number | null;
  usableDepthStartMm: number | null;
  usableDepthEndMm: number | null;
  laserWavelengthNm: number;
  laserToleranceNm: [number, number] | null;
};

export type MechanicalTargetTableRow = {
  parameter: string;
  nominalValue: number | string;
  lowerTestedUsefulBound: number | string | null;
  upperTestedUsefulBound: number | string | null;
  sensitivity: string;
  notes: string;
};

/** Applies the research-only useful-state thresholds without hiding raw metrics. */
export function classifyUsefulTroughState(
  metrics: Omit<RobustnessMetricSample, 'value' | 'useful'>,
  thresholds: UsefulStateThresholds,
): boolean {
  return metrics.reflectance >= thresholds.minimumReflectance &&
    Math.abs(metrics.centerErrorMm ?? Infinity) <= thresholds.maximumCenterErrorMm &&
    (metrics.regionWidthMm ?? Infinity) <= thresholds.maximumRegionWidthMm &&
    (metrics.offTargetFraction ?? Infinity) <= thresholds.maximumOffTargetFraction &&
    (metrics.targetFraction ?? 0) >= thresholds.minimumTargetFraction &&
    metrics.regionCount <= thresholds.maximumRegionCount;
}

/** Extracts the contiguous tested useful range that contains the nominal value when possible. */
export function calculateUsefulRange(samples: RobustnessMetricSample[], nominal: number): UsefulRange {
  const sorted = [...samples].sort((left, right) => left.value - right.value);
  const usefulCount = sorted.filter((sample) => sample.useful).length;
  const nominalIndex = sorted.reduce((bestIndex, sample, index) =>
    Math.abs(sample.value - nominal) < Math.abs(sorted[bestIndex].value - nominal) ? index : bestIndex, 0);
  if (!sorted[nominalIndex]?.useful) {
    return {
      nominal,
      lowerTestedUsefulBound: null,
      upperTestedUsefulBound: null,
      usefulCount,
      testedCount: sorted.length,
    };
  }

  let lowerIndex = nominalIndex;
  let upperIndex = nominalIndex;
  while (lowerIndex > 0 && sorted[lowerIndex - 1].useful) lowerIndex -= 1;
  while (upperIndex < sorted.length - 1 && sorted[upperIndex + 1].useful) upperIndex += 1;

  return {
    nominal,
    lowerTestedUsefulBound: sorted[lowerIndex].value,
    upperTestedUsefulBound: sorted[upperIndex].value,
    usefulCount,
    testedCount: sorted.length,
  };
}

/** Converts validated useful ranges into a solver-independent strain trough requirement. */
export function extractStrainTroughRequirement(input: {
  backgroundStrain: UsefulRange;
  troughStrain: UsefulRange;
  strainExcursion: UsefulRange;
  widthMm: UsefulRange;
  transitionWidthMm: UsefulRange;
  positionToleranceMm: number | null;
  usableDepthStartMm: number | null;
  usableDepthEndMm: number | null;
  laserWavelengthNm: UsefulRange;
}): StrainTroughRequirement {
  return {
    backgroundStrain: input.backgroundStrain.nominal,
    backgroundStrainTolerance: toTolerance(input.backgroundStrain),
    troughStrain: input.troughStrain.nominal,
    troughStrainTolerance: toTolerance(input.troughStrain),
    strainExcursion: input.strainExcursion.nominal,
    strainExcursionTolerance: toTolerance(input.strainExcursion),
    nominalWidthMm: input.widthMm.nominal,
    widthToleranceMm: toTolerance(input.widthMm),
    transitionWidthMm: input.transitionWidthMm.nominal,
    transitionToleranceMm: toTolerance(input.transitionWidthMm),
    positionToleranceMm: input.positionToleranceMm,
    usableDepthStartMm: input.usableDepthStartMm,
    usableDepthEndMm: input.usableDepthEndMm,
    laserWavelengthNm: input.laserWavelengthNm.nominal,
    laserToleranceNm: toTolerance(input.laserWavelengthNm),
  };
}

function toTolerance(range: UsefulRange): [number, number] | null {
  return range.lowerTestedUsefulBound === null || range.upperTestedUsefulBound === null
    ? null
    : [range.lowerTestedUsefulBound - range.nominal, range.upperTestedUsefulBound - range.nominal];
}
