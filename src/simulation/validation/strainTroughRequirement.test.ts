import { describe, expect, it } from 'vitest';
import {
  calculateUsefulRange,
  classifyUsefulTroughState,
  extractStrainTroughRequirement,
  type RobustnessMetricSample,
  type UsefulStateThresholds,
} from './strainTroughRequirement';

const thresholds: UsefulStateThresholds = {
  minimumReflectance: 0.01,
  maximumCenterErrorMm: 0.25,
  maximumRegionWidthMm: 1,
  maximumOffTargetFraction: 0.7,
  minimumTargetFraction: 0.3,
  maximumRegionCount: 2,
};

describe('strain trough requirement helpers', () => {
  it('classifies useful optical states from raw metric thresholds', () => {
    expect(classifyUsefulTroughState({
      reflectance: 0.02,
      centerErrorMm: 0.1,
      regionWidthMm: 0.6,
      targetFraction: 0.4,
      offTargetFraction: 0.6,
      strongestCompetitor: 0.1,
      regionCount: 1,
    }, thresholds)).toBe(true);

    expect(classifyUsefulTroughState({
      reflectance: 0.02,
      centerErrorMm: 0.3,
      regionWidthMm: 0.6,
      targetFraction: 0.4,
      offTargetFraction: 0.6,
      strongestCompetitor: 0.1,
      regionCount: 1,
    }, thresholds)).toBe(false);
  });

  it('returns the contiguous useful range around the nominal sample', () => {
    const samples: RobustnessMetricSample[] = [-2, -1, 0, 1, 2, 3].map((value) => ({
      value,
      useful: value >= -1 && value <= 1,
      reflectance: 0.02,
      centerErrorMm: 0,
      regionWidthMm: 0.5,
      targetFraction: 0.5,
      offTargetFraction: 0.5,
      strongestCompetitor: 0,
      regionCount: 1,
    }));

    expect(calculateUsefulRange(samples, 0)).toMatchObject({
      lowerTestedUsefulBound: -1,
      upperTestedUsefulBound: 1,
      usefulCount: 3,
      testedCount: 6,
    });
  });

  it('keeps requirement tolerances relative to the nominal value', () => {
    const range = calculateUsefulRange([
      usefulSample(0.001),
      usefulSample(0.002),
      usefulSample(0.003),
    ], 0.002);
    const requirement = extractStrainTroughRequirement({
      backgroundStrain: range,
      troughStrain: range,
      strainExcursion: range,
      widthMm: calculateUsefulRange([usefulSample(0.4), usefulSample(0.5)], 0.5),
      transitionWidthMm: calculateUsefulRange([usefulSample(0.02), usefulSample(0.04)], 0.02),
      positionToleranceMm: 0.1,
      usableDepthStartMm: 2,
      usableDepthEndMm: 8,
      laserWavelengthNm: calculateUsefulRange([usefulSample(600), usefulSample(600.1)], 600),
    });

    expect(requirement.backgroundStrainTolerance).toEqual([-0.001, 0.001]);
    expect(requirement.positionToleranceMm).toBe(0.1);
    expect(requirement.usableDepthStartMm).toBe(2);
  });
});

function usefulSample(value: number): RobustnessMetricSample {
  return {
    value,
    useful: true,
    reflectance: 0.02,
    centerErrorMm: 0,
    regionWidthMm: 0.5,
    targetFraction: 0.5,
    offTargetFraction: 0.5,
    strongestCompetitor: 0,
    regionCount: 1,
  };
}
