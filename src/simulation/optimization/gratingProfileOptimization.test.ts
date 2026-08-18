import { describe, expect, it } from 'vitest';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS, getCouplingProfileMultiplier, getPhaseProfileOffset } from '../structures/hybridBraggGrating';
import { buildDepthAddressLookup, classifyUsefulResponse, compareObjectiveMetrics, evaluateMultiStateObjective, evaluateTargetReflectionState } from './targetReflectionState';
import { enumerateGratingProfileCandidates, searchGratingProfiles } from './gratingProfileSearch';

const design = {
  ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  indexModulation: 1e-4,
  peakStrain: 0.003,
  strainShape: 'multi-tone' as const,
  perturbationPeriodMm: 1,
  perturbationSecondaryPeriodMm: 1.18,
  perturbationSecondaryAmplitudeRatio: 1,
  fixedLaserWavelengthNm: 600.11,
  segmentCount: 60,
  pulseSweepPointCount: 5,
};

describe('parameterized grating profiles', () => {
  it('samples uniform, gaussian, tukey, raised-cosine, and piecewise coupling profiles', () => {
    expect(getCouplingProfileMultiplier({ family: 'uniform' }, 0.2, 1)).toBe(1);
    expect(getCouplingProfileMultiplier({ family: 'gaussian', widthFraction: 0.2, peakMultiplier: 1, normalizeIntegratedCoupling: false }, 0.5, 1)).toBeCloseTo(1);
    expect(getCouplingProfileMultiplier({ family: 'raised-cosine', floorMultiplier: 0, peakMultiplier: 1, normalizeIntegratedCoupling: false }, 0, 1)).toBeCloseTo(0);
    expect(getCouplingProfileMultiplier({ family: 'tukey', taperFraction: 0.5, floorMultiplier: 0, peakMultiplier: 1, normalizeIntegratedCoupling: false }, 0.5, 1)).toBeCloseTo(1);
    expect(getCouplingProfileMultiplier({ family: 'piecewise', zoneMultipliers: [0.5, 1.5], normalizeIntegratedCoupling: false }, 0.75, 1)).toBeCloseTo(1.5);
  });

  it('samples constant, ramp, piecewise, and alternating phase profiles', () => {
    expect(getPhaseProfileOffset({ family: 'constant' }, 0.8, 1)).toBe(0);
    expect(getPhaseProfileOffset({ family: 'linear-ramp', totalPhaseRadians: Math.PI }, 0.5, 1)).toBeCloseTo(Math.PI / 2);
    expect(getPhaseProfileOffset({ family: 'piecewise', zonePhaseRadians: [0, Math.PI] }, 0.75, 1)).toBeCloseTo(Math.PI);
    expect(getPhaseProfileOffset({ family: 'alternating', zoneCount: 4, phaseStepRadians: Math.PI }, 0.3, 1)).toBeCloseTo(Math.PI);
  });
});

describe('target reflection objective metrics', () => {
  it('calculates target, off-target, competitor, selectivity, and reflectance metrics', () => {
    const metrics = evaluateTargetReflectionState(design, {
      targetDepthMm: 5,
      targetWidthMm: 1,
      controlKind: 'phase',
      controlState: 0,
    });
    expect(metrics.totalReflectance).toBeGreaterThanOrEqual(0);
    expect(metrics.staticReflectance).toBeGreaterThanOrEqual(0);
    expect(metrics.targetPower).toBeGreaterThanOrEqual(0);
    expect(metrics.offTargetPower).toBeGreaterThanOrEqual(0);
    expect(metrics.strongestCompetitorPower).toBeGreaterThanOrEqual(0);
    expect(metrics.activeRegionCount).toBeGreaterThanOrEqual(0);
  });

  it('aggregates multi-state selectivity and addressable fractions', () => {
    const multi = evaluateMultiStateObjective(design, [
      { targetDepthMm: 2, targetWidthMm: 1, controlKind: 'phase', controlState: 0 },
      { targetDepthMm: 5, targetWidthMm: 1, controlKind: 'phase', controlState: Math.PI },
    ]);
    expect(multi.states).toHaveLength(2);
    expect(multi.addressableFractions['S>1.1']).toBeGreaterThanOrEqual(0);
    expect(multi.addressableFractions['S>2']).toBeLessThanOrEqual(1);
  });

  it('builds deterministic depth-address lookup rows from control-state search', () => {
    const first = buildDepthAddressLookup(design, [1, 5, 9], 1);
    const second = buildDepthAddressLookup(design, [1, 5, 9], 1);
    expect(first.states.map((state) => state.controlState)).toEqual(second.states.map((state) => state.controlState));
  });

  it('does not rank no-competitor states as infinite selectivity', () => {
    const noCompetitor = {
      targetPower: 1,
      offTargetPower: 0,
      strongestCompetitorPower: 0,
      targetSelectivity: null,
      totalReflectance: 0.1,
      staticReflectance: 0.01,
      peakEnhancement: 0.09,
      activeRegionWidthMm: 1,
      activeRegionCount: 1,
      secondaryPeakRatio: null,
    };
    const selective = {
      ...noCompetitor,
      strongestCompetitorPower: 0.5,
      targetSelectivity: 2,
      peakEnhancement: 0,
    };

    expect(compareObjectiveMetrics(selective, noCompetitor)).toBeGreaterThan(0);
  });

  it('flags high-selectivity metrics with weak target response separately', () => {
    const weakSelective = {
      targetPower: 0.001,
      offTargetPower: 0.01,
      strongestCompetitorPower: 0.0001,
      targetSelectivity: 10,
      totalReflectance: 0.002,
      staticReflectance: 0,
      peakEnhancement: 0.002,
      activeRegionWidthMm: 0.1,
      activeRegionCount: 1,
      secondaryPeakRatio: 0.1,
    };

    expect(classifyUsefulResponse(weakSelective)).toBe('high-selectivity / weak-response');
    expect(classifyUsefulResponse({ ...weakSelective, targetPower: 0.1 })).toBe('high-selectivity / meaningful-response');
    expect(classifyUsefulResponse({ ...weakSelective, targetSelectivity: 1 })).toBe('low-selectivity');
  });

  it('uses actuator-index control states for biased trough arrays', () => {
    const arrayDesign = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      strainShape: 'piezo-array' as const,
      actuatorPolarity: 'trough' as const,
      peakStrain: 0.0015,
      strainBias: 0.0015,
      actuatorCount: 3,
      actuatorPitchMm: 2,
      strainCenterMm: 5,
      strainWidthMm: 1,
      perturbationEdgeWidthMm: 0.25,
      segmentCount: 80,
      fixedLaserWavelengthNm: 600.11,
    };
    const first = evaluateTargetReflectionState(arrayDesign, {
      targetDepthMm: 3,
      targetWidthMm: 1,
      controlKind: 'actuator-index',
      controlState: 0,
    });
    const second = evaluateTargetReflectionState(arrayDesign, {
      targetDepthMm: 5,
      targetWidthMm: 1,
      controlKind: 'actuator-index',
      controlState: 1,
    });

    expect(Number.isFinite(first.targetPower)).toBe(true);
    expect(Number.isFinite(second.targetPower)).toBe(true);
  });

  it('counts off-target power inside broad target-overlapping regions as a competitor', () => {
    const metrics = evaluateTargetReflectionState({
      ...design,
      peakStrain: 0,
      couplingProfile: { family: 'uniform' },
      phaseProfile: { family: 'constant' },
    }, {
      targetDepthMm: 5,
      targetWidthMm: 0.2,
      controlKind: 'phase',
      controlState: 0,
    });

    expect(metrics.offTargetPower).toBeGreaterThan(0);
    expect(metrics.strongestCompetitorPower).toBeGreaterThan(0);
  });
});

describe('grating profile search', () => {
  it('enumerates candidates in deterministic order', () => {
    const first = enumerateGratingProfileCandidates(design).map((candidate) => candidate.id);
    const second = enumerateGratingProfileCandidates(design).map((candidate) => candidate.id);
    expect(first).toEqual(second);
    expect(first[0]).toContain('uniform-global');
  });

  it('ranks candidates without stale cross-candidate metrics', () => {
    const result = searchGratingProfiles(design, {
      singleTarget: { targetDepthMm: 5, targetWidthMm: 1, controlKind: 'phase', controlState: 0 },
      multiStateDepthsMm: [1, 5, 9],
      targetWidthMm: 1,
    });
    expect(result.candidates.length).toBeGreaterThan(5);
    expect(result.bestCandidate?.singleStateMetrics).toBeDefined();
  });
});
