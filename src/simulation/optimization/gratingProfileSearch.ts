import type { HybridBraggDesignInputs, HybridCouplingProfile, HybridPhaseProfile } from '../../types/simulation';
import {
  buildDepthAddressLookup,
  compareObjectiveMetrics,
  evaluateTargetReflectionState,
  type MultiStateObjectiveMetrics,
  type ObjectiveMetrics,
  type TargetReflectionState,
} from './targetReflectionState';

export type GratingProfileCandidate = {
  id: string;
  label: string;
  family: 'uniform' | 'gaussian' | 'raised-cosine' | 'tukey' | 'piecewise-coupling' | 'phase-engineered' | 'segmented';
  couplingProfile?: HybridCouplingProfile;
  phaseProfile?: HybridPhaseProfile;
  design: HybridBraggDesignInputs;
};

export type GratingProfileSearchResult = {
  candidates: Array<GratingProfileCandidate & {
    singleStateMetrics: ObjectiveMetrics;
    multiStateMetrics: MultiStateObjectiveMetrics;
    compositeScore: number;
  }>;
  bestCandidate: GratingProfileSearchResult['candidates'][number] | null;
};

export type GratingProfileSearchSettings = {
  singleTarget: TargetReflectionState;
  multiStateDepthsMm: number[];
  targetWidthMm: number;
};

/** Enumerates bounded, interpretable permanent-grating profiles before any high-dimensional inverse design. */
export function enumerateGratingProfileCandidates(baseDesign: HybridBraggDesignInputs): GratingProfileCandidate[] {
  const normalized = [false, true];
  const candidates: GratingProfileCandidate[] = [{
    id: 'uniform-global',
    label: 'uniform global',
    family: 'uniform',
    couplingProfile: { family: 'uniform' },
    phaseProfile: { family: 'constant' },
    design: { ...baseDesign, permanentGratingMode: 'global', couplingProfile: { family: 'uniform' }, phaseProfile: { family: 'constant' } },
  }];

  for (const normalizeIntegratedCoupling of normalized) {
    for (const widthFraction of [0.2, 0.3, 0.45]) {
      addCandidate(candidates, baseDesign, 'gaussian', `gaussian-w${widthFraction}`, {
        family: 'gaussian',
        widthFraction,
        peakMultiplier: 1,
        normalizeIntegratedCoupling,
      }, { family: 'constant' });
    }
    for (const floorMultiplier of [0, 0.1]) {
      addCandidate(candidates, baseDesign, 'raised-cosine', `raised-cosine-f${floorMultiplier}`, {
        family: 'raised-cosine',
        floorMultiplier,
        peakMultiplier: 1,
        normalizeIntegratedCoupling,
      }, { family: 'constant' });
    }
    for (const taperFraction of [0.25, 0.5, 0.75]) {
      addCandidate(candidates, baseDesign, 'tukey', `tukey-a${taperFraction}`, {
        family: 'tukey',
        taperFraction,
        floorMultiplier: 0,
        peakMultiplier: 1,
        normalizeIntegratedCoupling,
      }, { family: 'constant' });
    }
    for (const zoneMultipliers of [[0.5, 1.2], [1.2, 0.5], [0.5, 1, 1, 0.5], [1, 0.5, 1.2, 0.5], [0.4, 0.8, 1.2, 1.2, 0.8, 0.4, 0.8, 1]]) {
      addCandidate(candidates, baseDesign, 'piecewise-coupling', `piecewise-${zoneMultipliers.length}z-${zoneMultipliers.join('-')}`, {
        family: 'piecewise',
        zoneMultipliers,
        normalizeIntegratedCoupling,
      }, { family: 'constant' });
    }
  }

  for (const phaseProfile of [
    { family: 'linear-ramp', totalPhaseRadians: Math.PI } satisfies HybridPhaseProfile,
    { family: 'linear-ramp', totalPhaseRadians: 2 * Math.PI } satisfies HybridPhaseProfile,
    { family: 'alternating', zoneCount: 4, phaseStepRadians: Math.PI } satisfies HybridPhaseProfile,
    { family: 'piecewise', zonePhaseRadians: [0, Math.PI / 2, Math.PI, Math.PI / 2] } satisfies HybridPhaseProfile,
  ]) {
    addCandidate(candidates, baseDesign, 'phase-engineered', `${phaseProfile.family}-${candidates.length}`, { family: 'uniform' }, phaseProfile);
  }

  candidates.push({
    id: 'segmented-16-fixed-reset',
    label: 'segmented 16 fixed-reset',
    family: 'segmented',
    design: {
      ...baseDesign,
      permanentGratingMode: 'segmented',
      braggSectionCount: 16,
      braggSectionGapMm: 0,
      braggSectionPhaseMode: 'fixed-reset',
      couplingProfile: { family: 'uniform' },
      phaseProfile: { family: 'constant' },
    },
  });

  return candidates.map((candidate, index) => ({ ...candidate, id: `${index.toString().padStart(3, '0')}-${candidate.id}` }));
}

/** Runs a deterministic coarse search and preserves both raw and composite metrics. */
export function searchGratingProfiles(
  baseDesign: HybridBraggDesignInputs,
  settings: GratingProfileSearchSettings,
): GratingProfileSearchResult {
  const candidates = enumerateGratingProfileCandidates(baseDesign).map((candidate) => {
    const singleStateMetrics = evaluateTargetReflectionState(candidate.design, settings.singleTarget);
    const multiStateMetrics = buildDepthAddressLookup(candidate.design, settings.multiStateDepthsMm, settings.targetWidthMm);
    const compositeScore = scoreCandidate(singleStateMetrics, multiStateMetrics);
    return { ...candidate, singleStateMetrics, multiStateMetrics, compositeScore };
  });
  const ranked = [...candidates].sort((left, right) =>
    right.compositeScore - left.compositeScore || compareObjectiveMetrics(right.singleStateMetrics, left.singleStateMetrics),
  );
  return { candidates: ranked, bestCandidate: ranked[0] ?? null };
}

function addCandidate(
  candidates: GratingProfileCandidate[],
  baseDesign: HybridBraggDesignInputs,
  family: GratingProfileCandidate['family'],
  slug: string,
  couplingProfile: HybridCouplingProfile,
  phaseProfile: HybridPhaseProfile,
): void {
  const normalization = 'normalizeIntegratedCoupling' in couplingProfile && couplingProfile.normalizeIntegratedCoupling ? 'same-integrated' : 'same-peak';
  candidates.push({
    id: `${slug}-${normalization}`,
    label: `${slug} / ${normalization}`,
    family,
    couplingProfile,
    phaseProfile,
    design: { ...baseDesign, permanentGratingMode: 'global', couplingProfile, phaseProfile },
  });
}

function scoreCandidate(single: ObjectiveMetrics, multi: MultiStateObjectiveMetrics): number {
  const selectivity = single.targetSelectivity ?? 0;
  const median = multi.medianSelectivity ?? 0;
  const min = multi.minimumSelectivity ?? 0;
  return selectivity + 0.5 * median + 0.5 * min + Math.max(0, single.peakEnhancement) - single.strongestCompetitorPower - 0.25 * single.staticReflectance;
}
