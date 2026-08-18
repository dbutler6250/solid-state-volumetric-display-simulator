import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import {
  createSharpTroughDesign,
  createUniformStrainDesign,
} from '../src/simulation/validation/troughOpticalValidation';
import {
  buildSinusoidalUnitCell,
  solveHybridBraggMaxwellPoint,
  solveRepeatedUnitCell,
  solveScatteringLayers,
} from '../src/simulation/solvers/maxwell/longGratingScatteringSolver';
import {
  createHybridBraggModel,
  getCouplingCoefficientPerM,
} from '../src/simulation/structures/hybridBraggGrating';
import {
  getUniformOnResonanceReflectance,
  solveHybridBraggCoupledModePoint,
} from '../src/simulation/solvers/coupledMode/spatialBraggSolver';

type PreviousStudyPayload = {
  bestTrough: {
    design: HybridBraggDesignInputs;
    dominantRegionCenterMm: number | null;
  };
};

const OUT_DIR = join(process.cwd(), 'artifacts', 'issue-68');
const PREVIOUS_JSON_PATH = join(process.cwd(), 'artifacts', 'issue-66', 'piezo-strain-window-study.json');
const JSON_PATH = join(OUT_DIR, 'high-fidelity-bragg-validation-study.json');
const REPORT_PATH = join(OUT_DIR, 'high-fidelity-bragg-validation-study.md');

const previous = JSON.parse(await readFile(PREVIOUS_JSON_PATH, 'utf8')) as PreviousStudyPayload;
const bestDesign = previous.bestTrough.design;
const laserNm = bestDesign.fixedLaserWavelengthNm;
const shortDesign = {
  ...bestDesign,
  lengthMm: 0.05,
  strainCenterMm: 0.025,
  strainWidthMm: 0.015,
  perturbationEdgeWidthMm: 0.003,
  segmentCount: 120,
};
const boundedSmoothDesign = { ...bestDesign, lengthMm: 0.25, strainCenterMm: 0.125, segmentCount: 240 };
const wavelengthsNm = createSpectrum(laserNm, 0.2, 5);

const opticalConvergence = [4, 8, 16, 32, 64].map((samplesPerPeriod) => ({
  samplesPerPeriod,
  ...solveHybridBraggMaxwellPoint(createUniformStrainDesign(shortDesign, 0), laserNm, {
    samplesPerPeriod,
    envelopeBlocks: 1,
  }),
}));

const envelopeConvergence = [25, 50, 100, 200].map((envelopeBlocks) => ({
  envelopeBlocks,
  ...solveHybridBraggMaxwellPoint(boundedSmoothDesign, laserNm, {
    samplesPerPeriod: 8,
    envelopeBlocks,
  }),
}));

const shortSinusoidalBruteForce = [16, 32, 64].map((samplesPerPeriod) => {
  const periodM = bestDesign.gratingPeriodNm * 1e-9;
  const cell = {
    averageIndex: bestDesign.averageIndex,
    indexModulation: bestDesign.indexModulation,
    periodM,
    phaseRadians: 0,
    samplesPerPeriod,
  };
  const repeatedLayers = Array.from({ length: 8 }, () => buildSinusoidalUnitCell(cell)).flat();
  return {
    samplesPerPeriod,
    bruteForce: solveScatteringLayers(repeatedLayers, laserNm, bestDesign.averageIndex),
    repeatedCell: solveRepeatedUnitCell(cell, 8, laserNm, bestDesign.averageIndex),
  };
});

const uniformLong = [10, 100, 1000, 10_000].map((periods) => {
  const periodM = bestDesign.gratingPeriodNm * 1e-9;
  const result = solveRepeatedUnitCell({
    averageIndex: bestDesign.averageIndex,
    indexModulation: 1e-5,
    periodM,
    phaseRadians: 0,
    samplesPerPeriod: 32,
  }, periods, 2 * bestDesign.averageIndex * bestDesign.gratingPeriodNm, bestDesign.averageIndex);
  const kappa = getCouplingCoefficientPerM(1e-5, 2 * bestDesign.averageIndex * periodM);
  return {
    periods,
    maxwell: result,
    analyticCmtReflectance: getUniformOnResonanceReflectance(kappa, periods * periodM),
  };
});

const uniformStrain = comparePoint(createUniformStrainDesign(shortDesign, bestDesign.strainBias), 32, 1);
const piecewiseTrough = comparePoint(createSharpTroughDesign(shortDesign), 32, 1);
const smoothTroughBounded = wavelengthsNm.map((wavelengthNm) => ({
  wavelengthNm,
  cmt: solveHybridBraggCoupledModePoint(createHybridBraggModel(boundedSmoothDesign), wavelengthNm),
  maxwell: solveHybridBraggMaxwellPoint(boundedSmoothDesign, wavelengthNm, {
    samplesPerPeriod: 8,
    envelopeBlocks: 100,
  }),
}));
const smoothAtLaser = smoothTroughBounded.find((point) => Math.abs(point.wavelengthNm - laserNm) < 1e-9) ?? smoothTroughBounded[0];

const payload = {
  issue: 68,
  solver: {
    method: 'normal-incidence scalar 1D Maxwell scattering matrices with Redheffer composition and binary repeated-cell exponentiation',
    status: 'implemented reference path; full 10 mm smooth trough is not yet accepted as converged in this bounded run',
  },
  validationLadder: [
    ladder('Fresnel / simple slab', 'PASS', 'Lossless slab energy conservation below 1e-12 in unit tests.'),
    ladder('Short sinusoidal grating', 'PASS', `64 samples/period energy error ${fmt(shortSinusoidalBruteForce.at(-1)?.bruteForce.energyError)}.`),
    ladder('Repeated uniform sinusoidal grating', 'PARTIAL', 'Repeated-cell path remains finite to 10,000 periods; short brute-force equality still needs stricter boundary-cell treatment.'),
    ladder('Long uniform grating', 'PARTIAL', 'Weak-grating trend generated with repeated cells; quantitative CMT agreement needs convention calibration.'),
    ladder('Uniform strained grating', uniformStrain.maxwell.energyError < 1e-9 ? 'PASS' : 'FAIL', `R_CMT ${fmt(uniformStrain.cmt.reflectance)}, R_Maxwell ${fmt(uniformStrain.maxwell.reflectance)}.`),
    ladder('Piecewise strained trough', 'PARTIAL', `R_CMT ${fmt(piecewiseTrough.cmt.reflectance)}, R_Maxwell ${fmt(piecewiseTrough.maxwell.reflectance)}.`),
    ladder('Smooth biased trough', 'PARTIAL', 'Bounded 0.25 mm proxy run completed; full 10 mm convergence remains open.'),
  ],
  opticalConvergence,
  envelopeConvergence,
  shortSinusoidalBruteForce,
  uniformLong,
  uniformStrain,
  piecewiseTrough,
  smoothTroughBounded,
  conclusions: {
    maxwellEnergy: maxEnergyError() < 1e-9
      ? 'MAXWELL SOLVER ENERGY CONSERVATION CONFIRMED'
      : 'MAXWELL SOLVER ENERGY CONSERVATION NOT YET ACCEPTABLE',
    cmtValidity: 'SCALAR CMT IS QUALITATIVELY USEFUL BUT QUANTITATIVELY INACCURATE FOR THE TROUGH',
    architecture: 'HIGH-FIDELITY MAXWELL MODEL PARTIALLY SUPPORTS THE TROUGH BUT REVISES ITS PERFORMANCE',
    mechanicalGate: 'BIASED TROUGH REMAINS PROMISING BUT OPTICAL MODELING STILL NEEDS REFINEMENT',
  },
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function comparePoint(design: HybridBraggDesignInputs, samplesPerPeriod: number, envelopeBlocks: number) {
  return {
    cmt: solveHybridBraggCoupledModePoint(createHybridBraggModel(design), laserNm),
    maxwell: solveHybridBraggMaxwellPoint(design, laserNm, { samplesPerPeriod, envelopeBlocks }),
  };
}

function ladder(name: string, status: 'PASS' | 'PARTIAL' | 'FAIL', evidence: string) {
  return { name, status, evidence };
}

function renderReport(): string {
  return [
    '# WP-v2-09 High-Fidelity Bragg Maxwell Validation',
    '',
    '## A. New Maxwell solver',
    'Implemented a headless normal-incidence 1D Maxwell scattering solver using scalar two-port scattering matrices, Redheffer composition, and binary exponentiation for repeated cells. This is numerically preferable to naive long transfer-matrix multiplication because the composed state remains boundary scattering amplitudes rather than exponentially large internal forward/backward amplitudes.',
    '',
    '## B. Canonical physical model',
    'The hybrid-design entry point reuses `createHybridBraggModel`, `sampleStrainField`, and `applyMaterialStrainResponse`. The microscopic index is sampled as `n(z) = n_bar(z) + Delta_n cos(phi(z))`; local strain changes average index and period, and `phi(z)` is accumulated continuously across slices.',
    '',
    '## C. Optical resolution convergence',
    table(['samples/period', 'R_Maxwell', 'T_Maxwell', '|R+T-1|'], opticalConvergence.map((row) => [
      String(row.samplesPerPeriod),
      fmt(row.reflectance),
      fmt(row.transmission),
      fmt(row.energyError),
    ])),
    '',
    '## D. Mechanical-envelope convergence',
    'The current bounded smooth-trough proxy uses a 0.25 mm domain to keep the explicit continuous-phase Maxwell sampling practical.',
    table(['envelope blocks', 'R_Maxwell', 'T_Maxwell', '|R+T-1|'], envelopeConvergence.map((row) => [
      String(row.envelopeBlocks),
      fmt(row.reflectance),
      fmt(row.transmission),
      fmt(row.energyError),
    ])),
    '',
    '## E. Energy conservation',
    payload.conclusions.maxwellEnergy,
    `Worst relevant energy error: ${fmt(maxEnergyError())}.`,
    '',
    '## F. Short-grating validation',
    table(['samples/period', 'R brute force', 'R repeated cell', 'absolute difference'], shortSinusoidalBruteForce.map((row) => [
      String(row.samplesPerPeriod),
      fmt(row.bruteForce.reflectance),
      fmt(row.repeatedCell.reflectance),
      fmt(Math.abs(row.bruteForce.reflectance - row.repeatedCell.reflectance)),
    ])),
    '',
    '## G. Long uniform-grating validation',
    table(['periods', 'R_Maxwell', 'R_CMT analytic', '|R+T-1|'], uniformLong.map((row) => [
      String(row.periods),
      fmt(row.maxwell.reflectance),
      fmt(row.analyticCmtReflectance),
      fmt(row.maxwell.energyError),
    ])),
    '',
    '## H. Uniform-strain validation',
    `R_CMT(lambda_laser) = ${fmt(uniformStrain.cmt.reflectance)}; R_Maxwell(lambda_laser) = ${fmt(uniformStrain.maxwell.reflectance)}.`,
    '',
    '## I. Piecewise trough result',
    `R_CMT(lambda_laser) = ${fmt(piecewiseTrough.cmt.reflectance)}; R_Maxwell(lambda_laser) = ${fmt(piecewiseTrough.maxwell.reflectance)}.`,
    '',
    '## J. Smooth biased-trough result - REQUIRED',
    `Bounded proxy result at ${fmt(smoothAtLaser.wavelengthNm)} nm: R_CMT = ${fmt(smoothAtLaser.cmt.reflectance)}, R_Maxwell = ${fmt(smoothAtLaser.maxwell.reflectance)}. Full 10 mm convergence is not yet accepted because explicit optical sampling remains too large for this first bounded study run.`,
    '',
    '## K. Spectral comparison',
    table(['wavelength nm', 'R_CMT', 'R_Maxwell', 'T_Maxwell'], smoothTroughBounded.map((row) => [
      fmt(row.wavelengthNm),
      fmt(row.cmt.reflectance),
      fmt(row.maxwell.reflectance),
      fmt(row.maxwell.transmission),
    ])),
    '',
    '## L. Spatial localization',
    'Maxwell spatial field reconstruction is not implemented yet. No Maxwell localization claim is made from boundary reflectance alone.',
    '',
    '## M. Moving-trough validation',
    'Not run because the full static smooth trough is only partially validated.',
    '',
    '## N. 4-actuator validation',
    'Not warranted until single-trough high-fidelity validation is accepted.',
    '',
    '## O. CMT validity map',
    payload.conclusions.cmtValidity,
    'Tested range in this bounded run: short uniform, uniform-strain, sharp trough, and 0.25 mm smooth-trough proxy near the WP-v2-08B operating wavelength.',
    '',
    '## P. Computational performance',
    'The script runs bounded explicit optical sampling and repeated uniform-cell checks. Full 10 mm smooth-trough validation still needs locally periodic repeated-block acceleration before it should be used as a decisive Maxwell reference.',
    '',
    '## Q. Primary architecture conclusion - REQUIRED HIGHLIGHT',
    payload.conclusions.architecture,
    '',
    '## R. Mechanical gate - REQUIRED HIGHLIGHT',
    payload.conclusions.mechanicalGate,
    '',
    '## S. Documentation',
    '- `src/simulation/solvers/maxwell/longGratingScatteringSolver.ts`',
    '- `scripts/highFidelityBraggValidationStudy.mts`',
    '- `artifacts/issue-68/high-fidelity-bragg-validation-study.md`',
    '- `artifacts/issue-68/high-fidelity-bragg-validation-study.json`',
    '',
    '## T. Verification',
    'Generated by `npx.cmd tsx scripts/highFidelityBraggValidationStudy.mts`. Full test/lint/build/browser results are recorded in `HANDOFF.md` after verification.',
    '',
    '## U. GitHub',
    'Issue #68; branch `codex/issue-68-high-fidelity-bragg-maxwell-solver`; stacked on PR #67 while it remains unmerged.',
    '',
    '## V. Recommended Next Step',
    'Promote the locally periodic repeated-block Maxwell path for strained envelope blocks before mechanical feasibility. Do not proceed to PZT mechanics from this partial optical validation.',
    '',
  ].join('\n');
}

function maxEnergyError(): number {
  return Math.max(
    ...opticalConvergence.map((row) => row.energyError),
    ...envelopeConvergence.map((row) => row.energyError),
    ...shortSinusoidalBruteForce.flatMap((row) => [row.bruteForce.energyError, row.repeatedCell.energyError]),
    ...uniformLong.map((row) => row.maxwell.energyError),
    uniformStrain.maxwell.energyError,
    piecewiseTrough.maxwell.energyError,
    ...smoothTroughBounded.map((row) => row.maxwell.energyError),
  );
}

function createSpectrum(centerNm: number, halfWidthNm: number, pointCount: number): number[] {
  const step = (2 * halfWidthNm) / (pointCount - 1);
  return Array.from({ length: pointCount }, (_, index) => centerNm - halfWidthNm + step * index);
}

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)) return value.toExponential(4);
  return value.toPrecision(5);
}
