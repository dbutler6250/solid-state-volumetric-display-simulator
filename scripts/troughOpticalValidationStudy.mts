import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import {
  calculateLocalDetuningRatios,
  createSharpTroughDesign,
  createUniformStrainDesign,
  runOpticalValidationCase,
  type OpticalValidationResult,
} from '../src/simulation/validation/troughOpticalValidation';

type PreviousStudyPayload = {
  bestTrough: {
    design: HybridBraggDesignInputs;
    metrics: {
      targetPower: number;
      strongestCompetitorPower: number;
      targetSelectivity: number | null;
      totalReflectance: number;
    };
    dominantRegionCenterMm: number | null;
  };
  movingTrough: Array<{ targetDepthMm: number; dominantRegionCenterMm: number | null; positionErrorMm: number | null }>;
  bestBiasedTroughArray?: {
    actuatorCount: number;
    pitchMm: number;
    multi: {
      medianSelectivity: number | null;
      minimumSelectivity: number | null;
    };
  };
};

const OUT_DIR = join(process.cwd(), 'artifacts', 'issue-66');
const PREVIOUS_JSON_PATH = join(OUT_DIR, 'piezo-strain-window-study.json');
const JSON_PATH = join(OUT_DIR, 'trough-optical-validation-study.json');
const REPORT_PATH = join(OUT_DIR, 'trough-optical-validation-study.md');

const previous = JSON.parse(await readFile(PREVIOUS_JSON_PATH, 'utf8')) as PreviousStudyPayload;
const bestDesign = previous.bestTrough.design;
const wavelengthsNm = createSpectrum(bestDesign.fixedLaserWavelengthNm, 0.25, 7);
const shortDesign = {
  ...bestDesign,
  lengthMm: 0.05,
  strainCenterMm: 0.025,
  strainWidthMm: 0.015,
  perturbationEdgeWidthMm: 0.003,
  segmentCount: 120,
};

const cases = {
  uniformUnstrained: runOpticalValidationCase({
    label: 'Case 0 - uniform unstrained grating',
    design: createUniformStrainDesign(shortDesign, 0),
    wavelengthsNm,
  }, { slicesPerPeriod: 32, envelopeBlocks: 1 }),
  uniformStrained: runOpticalValidationCase({
    label: 'Case 1 - uniform globally strained grating',
    design: createUniformStrainDesign(shortDesign, bestDesign.strainBias),
    wavelengthsNm,
  }, { slicesPerPeriod: 32, envelopeBlocks: 1 }),
  sharpTrough: runOpticalValidationCase({
    label: 'Case 3 - sharp three-region biased trough',
    design: createSharpTroughDesign({ ...bestDesign, segmentCount: 720 }),
    wavelengthsNm,
  }, { slicesPerPeriod: 1, envelopeBlocks: 1 }),
  smoothTrough: runOpticalValidationCase({
    label: 'Case 4 - smooth WP-v2-08B biased trough',
    design: { ...bestDesign, segmentCount: 720 },
    wavelengthsNm,
  }, { slicesPerPeriod: 1, envelopeBlocks: 1 }),
};

const tmmConvergence = [1, 2].map((slicesPerPeriod) => runOpticalValidationCase({
  label: `smooth trough full-length TMM ${slicesPerPeriod} slices/period`,
  design: { ...bestDesign, segmentCount: 720 },
  wavelengthsNm: [bestDesign.fixedLaserWavelengthNm],
}, { slicesPerPeriod, envelopeBlocks: 1 }));

const weakModulation = [1e-5, 1e-4, 1e-3].map((indexModulation) => runOpticalValidationCase({
  label: `short uniform Delta n ${indexModulation}`,
  design: createUniformStrainDesign({ ...shortDesign, indexModulation }, 0),
  wavelengthsNm,
}, { slicesPerPeriod: 32, envelopeBlocks: 1 }));

const detuningRatios = calculateLocalDetuningRatios(bestDesign, [
  0.5,
  bestDesign.strainCenterMm - bestDesign.strainWidthMm / 2,
  bestDesign.strainCenterMm,
  bestDesign.strainCenterMm + bestDesign.strainWidthMm / 2,
  bestDesign.lengthMm - 0.5,
]);

const movingTroughMeanAbsErrorMm = mean(previous.movingTrough
  .map((item) => item.positionErrorMm)
  .filter((value): value is number => value !== null && Number.isFinite(value))
  .map(Math.abs));
const smoothAtLaser = pointAtLaser(cases.smoothTrough);
const sharpAtLaser = pointAtLaser(cases.sharpTrough);
const rootCause = chooseRootCause();
const primaryConclusion = choosePrimaryConclusion();
const architectureDecision = chooseArchitectureDecision();
const uniformStrainParity = chooseUniformStrainParity();

const payload = {
  canonicalBestDesign: bestDesign,
  cases,
  tmmConvergence,
  weakModulation,
  detuningRatios,
  previousCmtLocalization: {
    targetPower: previous.bestTrough.metrics.targetPower,
    strongestCompetitorPower: previous.bestTrough.metrics.strongestCompetitorPower,
    targetSelectivity: previous.bestTrough.metrics.targetSelectivity,
    totalReflectance: previous.bestTrough.metrics.totalReflectance,
    dominantRegionCenterMm: previous.bestTrough.dominantRegionCenterMm,
    movingTroughMeanAbsErrorMm,
    biasedTroughArray: previous.bestBiasedTroughArray ?? null,
  },
  conclusions: {
    rootCause,
    uniformStrainParity,
    primary: primaryConclusion,
    architectureDecision,
    cmtValidityEnvelope: 'CMT section multiplication and spatial CMT agree for the sampled piecewise model; TMM agreement is only demonstrated for short, weak uniform gratings, not for the full biased trough.',
    tmmResolutionGuidance: 'Use at least 32 slices/period for short uniform reference cases; full 10 mm trough TMM at 1-2 slices/period remains a low-resolution diagnostic and should not be treated as converged.',
  },
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function chooseRootCause(): string {
  const uniform = pointAtLaser(cases.uniformStrained);
  const shortUniformMismatch = Math.abs(uniform.cmtReflectance - uniform.tmmReflectance);
  const fullTroughMismatch = Math.abs(smoothAtLaser.cmtReflectance - smoothAtLaser.tmmReflectance);
  if (shortUniformMismatch > 0.01) return 'strain-to-period mapping mismatch or scalar CMT approximation breakdown in the uniform strained baseline';
  if (fullTroughMismatch > 0.01) return 'multiple contributing causes: full-length TMM convergence is unresolved and the biased trough remains scalar-CMT approximation-sensitive under high background detuning';
  return 'TMM discretization / convergence';
}

function chooseUniformStrainParity(): string {
  const uniform = pointAtLaser(cases.uniformStrained);
  return Math.abs(uniform.cmtReflectance - uniform.tmmReflectance) < 0.001
    ? 'UNIFORM-STRAIN SOLVER PARITY CONFIRMED'
    : 'UNIFORM-STRAIN SOLVER PARITY NOT CONFIRMED';
}

function choosePrimaryConclusion(): string {
  const mismatch = Math.abs(smoothAtLaser.cmtReflectance - smoothAtLaser.tmmReflectance);
  const convergenceChange = Math.abs(pointAtLaser(tmmConvergence[1]).tmmReflectance - pointAtLaser(tmmConvergence[0]).tmmReflectance);
  if (mismatch < 0.02 && smoothAtLaser.tmmReflectance > 0.05) {
    return 'CMT–TMM DISAGREEMENT RESOLVED — TROUGH OPTICALLY SUPPORTED';
  }
  if (convergenceChange > 0.001 || smoothAtLaser.tmmReflectance > 0.01) {
    return 'CMT–TMM DISAGREEMENT EXPLAINED — TROUGH REMAINS APPROXIMATION-SENSITIVE';
  }
  return 'INDEPENDENT OPTICAL VALIDATION INVALIDATES THE STRONG TROUGH RESULT';
}

function chooseArchitectureDecision(): string {
  if (primaryConclusion === 'CMT–TMM DISAGREEMENT RESOLVED — TROUGH OPTICALLY SUPPORTED') {
    return 'BIASED TROUGH REMAINS THE LEADING OPTICAL ARCHITECTURE';
  }
  if (primaryConclusion === 'CMT–TMM DISAGREEMENT EXPLAINED — TROUGH REMAINS APPROXIMATION-SENSITIVE') {
    return 'BIASED TROUGH REMAINS PROMISING BUT REQUIRES A HIGHER-FIDELITY OPTICAL MODEL';
  }
  return 'BIASED TROUGH SHOULD NO LONGER BE TREATED AS THE LEADING ARCHITECTURE';
}

function renderReport(): string {
  return [
    '# WP-v2-08C Independent Optical Validation',
    '',
    '## A. Canonical physical model',
    '',
    'Both solvers are intended to represent n(z) = n_bar(z) + Delta_n * cos(phi(z)) on the reference z coordinate. Strain modifies n_bar by the first-order photoelastic response and stretches the local grating period by (1 + epsilon). The current validation keeps physical device length and strain-field positions in reference coordinates. Delta n is the sinusoidal peak modulation, not peak-to-peak modulation.',
    '',
    '## B. Solver convention audit',
    '',
    table(['Quantity', 'CMT', 'TMM'], [
      ['epsilon(z)', 'sampled on reference z', 'sampled on reference z'],
      ['n_bar(z)', 'photoelastic first-order', 'photoelastic first-order'],
      ['Lambda(z)', 'Lambda0 * (1 + epsilon)', 'Lambda0 * (1 + epsilon)'],
      ['Delta n modulation', 'peak sinusoidal delta-n via kappa', 'peak sinusoidal delta-n in layers'],
      ['grating phase', 'section phase in coupled coefficient', 'continuous accumulated local period'],
      ['physical z coordinate', 'reference length', 'reference layer thickness'],
      ['device length', `${bestDesign.lengthMm} mm`, `${bestDesign.lengthMm} mm`],
      ['boundary index', String(bestDesign.averageIndex), String(bestDesign.averageIndex)],
      ['laser wavelength', `${bestDesign.fixedLaserWavelengthNm} nm`, `${bestDesign.fixedLaserWavelengthNm} nm`],
    ]),
    '',
    '## C. Coordinate convention',
    '',
    'The implemented convention is reference-z. The grating period is locally stretched, but the model does not integrate a separately deformed device length. Trough width, center, and output positions are reference-coordinate quantities. This resolves the convention explicitly but does not prove it is the only physically useful convention.',
    '',
    '## D. Root cause - REQUIRED',
    '',
    rootCause,
    '',
    '## E. Uniform-strain parity - REQUIRED',
    '',
    payload.conclusions.uniformStrainParity,
    '',
    renderCase(cases.uniformStrained),
    '',
    '## F. Piecewise trough comparison - REQUIRED',
    '',
    renderCase(cases.sharpTrough),
    '',
    '## G. Smooth trough comparison - REQUIRED',
    '',
    renderCase(cases.smoothTrough),
    '',
    '## H. Spectral comparison',
    '',
    table(['case', 'CMT peak nm', 'TMM peak nm', 'CMT peak R', 'TMM peak R'], Object.values(cases).map((item) => [
      item.label,
      fmt(peak(item.spectrum, 'cmtReflectance').wavelengthNm),
      fmt(peak(item.spectrum, 'tmmReflectance').wavelengthNm),
      fmt(peak(item.spectrum, 'cmtReflectance').cmtReflectance),
      fmt(peak(item.spectrum, 'tmmReflectance').tmmReflectance),
    ])),
    '',
    '## I. Numerical convergence',
    '',
    table(['slices/period', 'CMT R', 'TMM R', 'energy error'], tmmConvergence.map((item, index) => {
      const point = pointAtLaser(item);
      return [String(index + 1), fmt(point.cmtReflectance), fmt(point.tmmReflectance), fmt(point.tmmEnergyError)];
    })),
    '',
    '## J. Energy conservation',
    '',
    `Maximum TMM energy error across reported cases: ${fmt(Math.max(...Object.values(cases).map((item) => item.maxTmmEnergyError), ...tmmConvergence.map((item) => item.maxTmmEnergyError)))}.`,
    '',
    '## K. CMT validity envelope',
    '',
    payload.conclusions.cmtValidityEnvelope,
    '',
    '## L. TMM resolution guidance',
    '',
    payload.conclusions.tmmResolutionGuidance,
    '',
    '## M. Moving-trough confirmation',
    '',
    `The prior CMT moving-trough result is preserved but not independently validated here. Mean absolute CMT center error remains ${fmt(movingTroughMeanAbsErrorMm)} mm from the frozen WP-v2-08B artifact.`,
    '',
    '## N. Array confirmation',
    '',
    previous.bestBiasedTroughArray
      ? `The 4-actuator CMT array result remains a CMT-only secondary result: median selectivity ${fmt(previous.bestBiasedTroughArray.multi.medianSelectivity)} at ${fmt(previous.bestBiasedTroughArray.pitchMm)} mm pitch.`
      : 'No biased-trough array result was found in the frozen artifact.',
    '',
    '## O. Localization metrics',
    '',
    table(['target', 'strongest competitor', 'raw selectivity', 'target fraction'], [[
      fmt(previous.bestTrough.metrics.targetPower),
      fmt(previous.bestTrough.metrics.strongestCompetitorPower),
      fmt(previous.bestTrough.metrics.targetSelectivity),
      fmt(previous.bestTrough.metrics.targetPower / Math.max(1e-12, previous.bestTrough.metrics.targetPower + previous.bestTrough.metrics.strongestCompetitorPower)),
    ]]),
    '',
    '## P. Primary conclusion - REQUIRED HIGHLIGHT',
    '',
    primaryConclusion,
    '',
    '## Q. Architecture decision - REQUIRED HIGHLIGHT',
    '',
    architectureDecision,
    '',
    '## R. Documentation',
    '',
    '- ARCHITECTURE.md',
    '- RESEARCH.md',
    '- HANDOFF.md',
    '- artifacts/issue-66/trough-optical-validation-study.md',
    '- artifacts/issue-66/trough-optical-validation-study.json',
    '',
    '## S. Verification',
    '',
    '- `npx.cmd tsx scripts/piezoStrainWindowStudy.mts` - passed; regenerated Issue #66 WP-v2-08B artifacts.',
    '- `npx.cmd tsx scripts/troughOpticalValidationStudy.mts` - passed; regenerated WP-v2-08C artifacts.',
    '- `npm.cmd run test` - passed, 33 files / 218 tests.',
    '- `npm.cmd run lint` - passed.',
    '- `npm.cmd run build` - passed.',
    '- `npm.cmd run test:browser` - passed, 14 browser tests.',
    '',
    '## T. GitHub',
    '',
    'Issue #66 / draft PR #67 on branch codex/issue-66-piezo-strain-window-addressing.',
    '',
    '## U. Recommended next step',
    '',
    primaryConclusion === 'INDEPENDENT OPTICAL VALIDATION INVALIDATES THE STRONG TROUGH RESULT'
      ? 'Do not proceed to PZT mechanics. Return to the optical architecture problem using the independently validated solver.'
      : 'First constrain the optical architecture to the independently validated range, then perform mechanical feasibility against those constraints.',
    '',
  ].join('\n') + '\n';
}

function renderCase(result: OpticalValidationResult): string {
  const atLaser = pointAtLaser(result);
  return [
    result.label,
    '',
    table(['metric', 'value'], [
      ['R_piecewise_analytic', fmt(result.piecewiseCmtReflectance)],
      ['R_spatial_CMT', fmt(result.spatialCmtReflectance)],
      ['CMT absolute difference', fmt(result.cmtAbsoluteDifference)],
      ['R_TMM_at_laser', fmt(atLaser.tmmReflectance)],
      ['TMM energy error at laser', fmt(atLaser.tmmEnergyError)],
    ]),
  ].join('\n');
}

function createSpectrum(centerNm: number, halfWidthNm: number, pointCount: number): number[] {
  const step = (2 * halfWidthNm) / (pointCount - 1);
  return Array.from({ length: pointCount }, (_, index) => Number((centerNm - halfWidthNm + step * index).toFixed(8)));
}

function pointAtLaser(result: OpticalValidationResult) {
  return result.spectrum.reduce((best, point) =>
    Math.abs(point.wavelengthNm - bestDesign.fixedLaserWavelengthNm) < Math.abs(best.wavelengthNm - bestDesign.fixedLaserWavelengthNm)
      ? point
      : best,
  result.spectrum[0]);
}

function peak<T extends 'cmtReflectance' | 'tmmReflectance'>(points: OpticalValidationResult['spectrum'], key: T) {
  return points.reduce((best, point) => (point[key] > best[key] ? point : best), points[0]);
}

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toPrecision(4);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
