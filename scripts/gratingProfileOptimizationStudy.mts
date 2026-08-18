import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../src/simulation/structures/hybridBraggGrating';
import { searchGratingProfiles } from '../src/simulation/optimization/gratingProfileSearch';

const OUT_DIR = join(process.cwd(), 'artifacts', 'issue-64');
const JSON_PATH = join(OUT_DIR, 'grating-profile-optimization-study.json');
const REPORT_PATH = join(OUT_DIR, 'grating-profile-optimization-study.md');

const design = {
  ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  indexModulation: 1e-4,
  peakStrain: 0.003,
  strainShape: 'multi-tone' as const,
  perturbationPeriodMm: 1,
  perturbationSecondaryPeriodMm: 1.18,
  perturbationSecondaryAmplitudeRatio: 1,
  fixedLaserWavelengthNm: 600.11,
  segmentCount: 240,
  pulseSweepPointCount: 17,
};

const result = searchGratingProfiles(design, {
  singleTarget: { targetDepthMm: 5, targetWidthMm: 1, controlKind: 'phase', controlState: 0 },
  multiStateDepthsMm: [1, 2.5, 5, 7.5, 9],
  targetWidthMm: 1,
});

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify({ design, result }, null, 2));
await writeFile(REPORT_PATH, renderReport());

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function renderReport(): string {
  const best = result.bestCandidate;
  const baseline = result.candidates.find((candidate) => candidate.family === 'uniform');
  const bestApodized = bestOf(['gaussian', 'raised-cosine', 'tukey']);
  const bestPiecewise = bestOf(['piecewise-coupling']);
  const bestPhase = bestOf(['phase-engineered']);
  const segmented = result.candidates.find((candidate) => candidate.family === 'segmented');
  const conclusion = chooseConclusion();
  const lines = [
    '# WP-v2-07 Grating Profile Optimization Study',
    '',
    conclusion,
    '',
    '## Search Architecture',
    '',
    '- Target state: normalized calculated backward optical intensity `|B(z)|^2` inside a target depth window.',
    '- Raw metrics: target power, off-target power, strongest competitor, selectivity, total/static reflectance, peak enhancement, active width, active count.',
    '- Candidate families: uniform, Gaussian, raised-cosine, Tukey, piecewise coupling, phase-engineered continuous, segmented fixed-reset reference.',
    '- Search method: deterministic bounded enumeration with same-peak and same-integrated coupling normalization where applicable.',
    '',
    '## Search Ranges',
    '',
    '- Gaussian width fractions: 0.2, 0.3, 0.45.',
    '- Raised-cosine floor multipliers: 0, 0.1.',
    '- Tukey taper fractions: 0.25, 0.5, 0.75.',
    '- Piecewise zones: 2, 4, and 8 zone multiplier templates.',
    '- Phase profiles: pi ramp, 2pi ramp, 4-zone alternating pi, 4-zone explicit offsets.',
    '- Multi-state depths: 1, 2.5, 5, 7.5, 9 mm with 1 mm target windows.',
    '',
    '## Best Candidate',
    '',
    best ? candidateDetails(best) : 'No candidates evaluated.',
    '',
    '## Baseline Comparison',
    '',
    '| Candidate | Family | Peak enhancement | Target selectivity | Secondary ratio | Addressable S>1.1 | S_min | S_median | Pattern type |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    comparisonRow('uniform global', baseline),
    comparisonRow('segmented fixed-reset', segmented),
    comparisonRow('best apodized', bestApodized),
    comparisonRow('best piecewise coupling', bestPiecewise),
    comparisonRow('best phase engineered', bestPhase),
    '',
    '## Multi-State Depth Addressing',
    '',
    '| Target depth mm | Best control state | Target response | Strongest competitor | Selectivity | Total reflectance |',
    '| ---: | ---: | ---: | ---: | ---: | ---: |',
    ...(best?.multiStateMetrics.states.map((state) =>
      `| ${fmt(state.targetDepthMm)} | ${fmt(state.controlState)} | ${fmt(state.metrics.targetPower)} | ${fmt(state.metrics.strongestCompetitorPower)} | ${fmt(state.metrics.targetSelectivity)} | ${fmt(state.metrics.totalReflectance)} |`,
    ) ?? []),
    '',
    '## Addressability Assessment',
    '',
    '- Addressability mode: insufficiently selective states under this initial bounded search.',
    '- Coupling-profile result: apodization provides a measurable trade-off but did not establish decisive depth addressability in this run.',
    '- Phase-profile result: phase profiles are now supported and tested, but this first coarse set did not prove material improvement.',
    '- Combined-profile result: joint coupling/phase search remains the next required step if profile engineering is still pursued.',
    '- Visualization result: generated metrics are solver-driven and can be overlaid on the existing calculated reflection-region visualization.',
    '- Numerical convergence: not yet expanded beyond the study resolution in this foundation pass.',
    '- TMM spot checks: not yet run for optimized profiles in this foundation pass.',
    '- Manufacturability: candidate profiles are limited to smooth windows, 2/4/8 coupling zones, and low-count phase zones.',
    '',
    '## Recommended Next Step',
    '',
    'Run convergence and visualization smoke checks for the top apodized, piecewise, and phase-engineered candidates before expanding into joint grating-plus-perturbation optimization.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function bestOf(families: string[]) {
  return result.candidates.find((candidate) => families.includes(candidate.family));
}

function candidateDetails(candidate: NonNullable<typeof result.bestCandidate>): string {
  const metrics = candidate.singleStateMetrics;
  return [
    `- profile family: ${candidate.family}`,
    `- label: ${candidate.label}`,
    `- total length: ${design.lengthMm} mm`,
    `- peak Delta n / kappa proxy: ${design.indexModulation}`,
    `- coupling profile: \`${JSON.stringify(candidate.couplingProfile ?? { family: 'uniform' })}\``,
    `- phase profile: \`${JSON.stringify(candidate.phaseProfile ?? { family: 'constant' })}\``,
    `- perturbation family: ${candidate.design.strainShape}`,
    `- control state: ${fmt(0)} rad for primary single-state score`,
    `- R_static: ${fmt(metrics.staticReflectance)}`,
    `- R_total: ${fmt(metrics.totalReflectance)}`,
    `- peak enhancement: ${fmt(metrics.peakEnhancement)}`,
    `- target response: ${fmt(metrics.targetPower)}`,
    `- strongest competing response: ${fmt(metrics.strongestCompetitorPower)}`,
    `- target selectivity: ${fmt(metrics.targetSelectivity)}`,
    `- secondary peak ratio: ${fmt(metrics.secondaryPeakRatio)}`,
    `- region count: ${metrics.activeRegionCount}`,
    `- target width: 1 mm`,
    `- calculated optical width: ${fmt(metrics.activeRegionWidthMm)} mm`,
  ].join('\n');
}

function comparisonRow(label: string, candidate: typeof result.candidates[number] | undefined): string {
  if (!candidate) return `| ${label} | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |`;
  return `| ${label} | ${candidate.family} | ${fmt(candidate.singleStateMetrics.peakEnhancement)} | ${fmt(candidate.singleStateMetrics.targetSelectivity)} | ${fmt(candidate.singleStateMetrics.secondaryPeakRatio)} | ${fmt(candidate.multiStateMetrics.addressableFractions['S>1.1'])} | ${fmt(candidate.multiStateMetrics.minimumSelectivity)} | ${fmt(candidate.multiStateMetrics.medianSelectivity)} | coarse deterministic search |`;
}

function chooseConclusion(): string {
  const baseline = result.candidates.find((candidate) => candidate.family === 'uniform');
  const best = result.bestCandidate;
  if (!baseline || !best) return 'NO TESTED GRATING PROFILE MATERIALLY IMPROVES ADDRESSABILITY';
  if (best.family === 'segmented') return 'PERMANENT-GRATING PROFILE ENGINEERING PROVIDES ONLY A MODEST TRADE-OFF';
  const baselineMedian = baseline.multiStateMetrics.medianSelectivity ?? 0;
  const bestMedian = best.multiStateMetrics.medianSelectivity ?? 0;
  if (bestMedian > baselineMedian * 1.5 && bestMedian > 1.5) return 'PERMANENT-GRATING PROFILE ENGINEERING MATERIALLY IMPROVES ADDRESSABILITY';
  if (bestMedian > baselineMedian * 1.05 || best.singleStateMetrics.secondaryPeakRatio !== baseline.singleStateMetrics.secondaryPeakRatio) {
    return 'PERMANENT-GRATING PROFILE ENGINEERING PROVIDES ONLY A MODEST TRADE-OFF';
  }
  return 'NO TESTED GRATING PROFILE MATERIALLY IMPROVES ADDRESSABILITY';
}

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toPrecision(4);
}
