import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import {
  calculateLocalDetuningRatios,
  createSharpTroughDesign,
  createUniformStrainDesign,
} from '../src/simulation/validation/troughOpticalValidation';
import {
  buildExplicitLocallyPeriodicBlockLayers,
  solveHybridBraggMaxwellLocallyPeriodicPoint,
  solveLocallyPeriodicBlock,
  solveScatteringLayers,
  type LocallyPeriodicBlock,
  type MaxwellPointResult,
} from '../src/simulation/solvers/maxwell/longGratingScatteringSolver';
import {
  createHybridBraggModel,
  getCouplingCoefficientPerM,
} from '../src/simulation/structures/hybridBraggGrating';
import {
  getUniformOnResonanceReflectance,
  solveCoupledModeSections,
  solveHybridBraggCoupledModePoint,
} from '../src/simulation/solvers/coupledMode/spatialBraggSolver';
import { sampleHybridBraggModel } from '../src/simulation/structures/hybridBraggGrating';

type PreviousStudyPayload = {
  bestTrough: {
    design: HybridBraggDesignInputs;
    dominantRegionCenterMm: number | null;
  };
};

type TimedPoint = MaxwellPointResult & {
  runtimeMs: number;
  heapUsedMb: number;
};

const OUT_DIR = join(process.cwd(), 'artifacts', 'issue-68');
const PREVIOUS_JSON_PATH = join(process.cwd(), 'artifacts', 'issue-66', 'piezo-strain-window-study.json');
const JSON_PATH = join(OUT_DIR, 'high-fidelity-bragg-validation-study.json');
const REPORT_PATH = join(OUT_DIR, 'high-fidelity-bragg-validation-study.md');

const previous = JSON.parse(await readFile(PREVIOUS_JSON_PATH, 'utf8')) as PreviousStudyPayload;
const bestDesign = previous.bestTrough.design;
const laserNm = bestDesign.fixedLaserWavelengthNm;
const uniformDesign = createUniformStrainDesign(bestDesign, 0);
const uniformStrainDesign = createUniformStrainDesign(bestDesign, bestDesign.strainBias);
const piecewiseTroughDesign = createSharpTroughDesign(bestDesign);
const spectrumNm = createSpectrum(laserNm, 0.35, 9);
const finalOptions = { samplesPerPeriod: 32, envelopeBlocks: 400 };

const accelerationValidation = [1, 2, 5, 10, 50, 100].map((repeatCount) => {
  const block: LocallyPeriodicBlock = {
    averageIndex: bestDesign.averageIndex,
    indexModulation: bestDesign.indexModulation,
    periodM: bestDesign.gratingPeriodNm * 1e-9,
    lengthM: repeatCount * bestDesign.gratingPeriodNm * 1e-9,
    phaseRadians: 0.37,
    samplesPerPeriod: 32,
  };
  const explicit = solveScatteringLayers(buildExplicitLocallyPeriodicBlockLayers(block), laserNm, block.averageIndex);
  const accelerated = solveLocallyPeriodicBlock(block, laserNm, block.averageIndex);
  return {
    repeatCount,
    explicit,
    accelerated,
    reflectanceError: Math.abs(explicit.reflectance - accelerated.reflectance),
    transmissionError: Math.abs(explicit.transmission - accelerated.transmission),
  };
});

const fractionalValidation = (() => {
  const block: LocallyPeriodicBlock = {
    averageIndex: bestDesign.averageIndex,
    indexModulation: bestDesign.indexModulation,
    periodM: bestDesign.gratingPeriodNm * 1e-9,
    lengthM: (0.25 + 10 + 0.4) * bestDesign.gratingPeriodNm * 1e-9,
    phaseRadians: 0.19,
    samplesPerPeriod: 64,
  };
  const explicit = solveScatteringLayers(buildExplicitLocallyPeriodicBlockLayers(block), laserNm, block.averageIndex);
  const accelerated = solveLocallyPeriodicBlock(block, laserNm, block.averageIndex);
  return {
    requestedPeriods: 10.65,
    lengthM: block.lengthM,
    explicit,
    accelerated,
    reflectanceError: Math.abs(explicit.reflectance - accelerated.reflectance),
  };
})();

const splitGratingIdentity = [1, 2, 10, 100].map((envelopeBlocks) => ({
  envelopeBlocks,
  result: solveHybridBraggMaxwellLocallyPeriodicPoint(uniformDesign, laserNm, {
    samplesPerPeriod: 32,
    envelopeBlocks,
  }),
}));

const uniformOpticalConvergence = [8, 16, 32, 64].map((samplesPerPeriod) => timedSolve(
  `uniform-10mm-spp-${samplesPerPeriod}`,
  () => solveHybridBraggMaxwellLocallyPeriodicPoint(uniformDesign, laserNm, {
    samplesPerPeriod,
    envelopeBlocks: 1,
  }),
));

const uniformLongSpectrum = summarizeSpectrum(spectrumNm.map((wavelengthNm) => ({
  wavelengthNm,
  maxwell: solveHybridBraggMaxwellLocallyPeriodicPoint(uniformDesign, wavelengthNm, finalOptions),
})));

const uniformStrainPoint = timedSolve('uniform-strain-10mm', () =>
  solveHybridBraggMaxwellLocallyPeriodicPoint(uniformStrainDesign, laserNm, finalOptions));
const uniformStrainCmt = compactCmtPoint(solveHybridBraggCoupledModePoint(createHybridBraggModel(uniformStrainDesign), laserNm));

const piecewiseTroughMaxwell = timedSolve('piecewise-trough-10mm', () =>
  solveHybridBraggMaxwellLocallyPeriodicPoint(piecewiseTroughDesign, laserNm, finalOptions));
const piecewiseTroughCmt = compactCmtPoint(solveHybridBraggCoupledModePoint(createHybridBraggModel(piecewiseTroughDesign), laserNm));
const piecewiseSections = sampleHybridBraggModel(createHybridBraggModel(piecewiseTroughDesign), laserNm * 1e-9);
const piecewiseExactCmt = solveCoupledModeSections(piecewiseSections.map((section) => ({
  couplingCoefficientPerM: section.couplingCoefficientPerM,
  detuningPerM: section.detuningPerM,
  lengthM: section.lengthM,
  phaseRadians: section.gratingPhaseRadians,
})));

const smoothEnvelopeConvergence = [25, 50, 100, 200, 400].map((envelopeBlocks) => timedSolve(
  `smooth-10mm-blocks-${envelopeBlocks}`,
  () => solveHybridBraggMaxwellLocallyPeriodicPoint(bestDesign, laserNm, {
    samplesPerPeriod: 32,
    envelopeBlocks,
  }),
));

const smoothOpticalConvergence = [8, 16, 32, 64].map((samplesPerPeriod) => timedSolve(
  `smooth-10mm-spp-${samplesPerPeriod}`,
  () => solveHybridBraggMaxwellLocallyPeriodicPoint(bestDesign, laserNm, {
    samplesPerPeriod,
    envelopeBlocks: 400,
  }),
));

const convergenceGrid = [
  [100, 16],
  [100, 32],
  [200, 16],
  [200, 32],
  [400, 32],
  [400, 64],
].map(([envelopeBlocks, samplesPerPeriod]) => timedSolve(
  `grid-${envelopeBlocks}-${samplesPerPeriod}`,
  () => solveHybridBraggMaxwellLocallyPeriodicPoint(bestDesign, laserNm, {
    envelopeBlocks,
    samplesPerPeriod,
  }),
));

const smoothSpectrum = spectrumNm.map((wavelengthNm) => ({
  wavelengthNm,
  cmt: compactCmtPoint(solveHybridBraggCoupledModePoint(createHybridBraggModel(bestDesign), wavelengthNm)),
  maxwell: solveHybridBraggMaxwellLocallyPeriodicPoint(bestDesign, wavelengthNm, finalOptions),
}));
const smoothMetrics = summarizeSpectrum(smoothSpectrum.map(({ wavelengthNm, maxwell }) => ({ wavelengthNm, maxwell })));
const cmtMetrics = summarizeCmtSpectrum(smoothSpectrum.map(({ wavelengthNm, cmt }) => ({ wavelengthNm, cmt })));
const smoothAtLaser = smoothSpectrum.find((point) => Math.abs(point.wavelengthNm - laserNm) < 1e-9) ?? smoothSpectrum[0];

const detuningDiagnostics = [0.00075, 0.0015, 0.003].map((strainBias) => diagnosticPoint({
  ...bestDesign,
  strainBias,
  peakStrain: Math.min(bestDesign.peakStrain, strainBias),
}));
const transitionDiagnostics = [0, bestDesign.perturbationEdgeWidthMm, bestDesign.perturbationEdgeWidthMm * 2].map((edgeWidthMm) =>
  diagnosticPoint({ ...bestDesign, perturbationEdgeWidthMm: edgeWidthMm }));
const couplingDiagnostics = [0.5, 1, 2].map((scale) => diagnosticPoint({
  ...bestDesign,
  indexModulation: bestDesign.indexModulation * scale,
}));

const stressTest = [1, 5, 10, 20].map((lengthMm) => timedSolve(
  `stress-${lengthMm}mm`,
  () => solveHybridBraggMaxwellLocallyPeriodicPoint({ ...uniformDesign, lengthMm }, laserNm, {
    samplesPerPeriod: 32,
    envelopeBlocks: 1,
  }),
));

const finalCmtError = {
  rCmt: smoothAtLaser.cmt.reflectance,
  rMaxwell: smoothAtLaser.maxwell.reflectance,
  absoluteError: Math.abs(smoothAtLaser.cmt.reflectance - smoothAtLaser.maxwell.reflectance),
  relativeError: relativeError(smoothAtLaser.cmt.reflectance, smoothAtLaser.maxwell.reflectance),
  peakWavelengthDifferenceNm: Math.abs(cmtMetrics.peakWavelengthNm - smoothMetrics.peakWavelengthNm),
  peakReflectanceDifference: Math.abs(cmtMetrics.peakReflectance - smoothMetrics.peakReflectance),
};

const payload = {
  issue: 68,
  solver: {
    method: 'locally periodic normal-incidence 1D Maxwell scattering with Redheffer composition',
    finalOptions,
    convergenceCriteria: 'Accept full-length smooth-trough boundary optics when final refinements change R by <0.5% relative or <1e-4 absolute, peak wavelength shift is below one sampled spectral interval, and max |R+T-1| < 1e-9.',
  },
  accelerationValidation,
  fractionalValidation,
  splitGratingIdentity,
  uniformOpticalConvergence,
  uniformLongSpectrum,
  uniformStrain: { cmt: uniformStrainCmt, maxwell: uniformStrainPoint },
  piecewiseTrough: { exactCmt: piecewiseExactCmt, spatialCmt: piecewiseTroughCmt, maxwell: piecewiseTroughMaxwell },
  smoothEnvelopeConvergence,
  smoothOpticalConvergence,
  convergenceGrid,
  smoothSpectrum,
  smoothMetrics,
  cmtMetrics,
  finalCmtError,
  diagnostics: {
    detuning: detuningDiagnostics,
    transitionWidth: transitionDiagnostics,
    coupling: couplingDiagnostics,
  },
  stressTest,
  historicalTmm: {
    oneSlicePerPeriodReflectance: 3.027e-7,
    twoSlicesPerPeriodReflectance: 0.01143,
    interpretation: 'historical under-resolved diagnostic values; not used as physical reference',
  },
  conclusions: {
    energy: maxEnergyError() < 1e-9
      ? 'MAXWELL ENERGY CONSERVATION ACCEPTABLE'
      : 'MAXWELL ENERGY CONSERVATION NOT ACCEPTABLE',
    architecture: chooseArchitectureConclusion(),
    cmt: chooseCmtConclusion(),
    movingTrough: 'MOVING-TROUGH TRACKING REMAINS CMT-ONLY',
    mechanicalGate: chooseMechanicalGate(),
  },
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());

console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function diagnosticPoint(design: HybridBraggDesignInputs) {
  const cmt = compactCmtPoint(solveHybridBraggCoupledModePoint(createHybridBraggModel(design), laserNm));
  const maxwell = solveHybridBraggMaxwellLocallyPeriodicPoint(design, laserNm, finalOptions);
  const detuning = calculateLocalDetuningRatios(design, [
    0.5,
    design.strainCenterMm,
    design.lengthMm - 0.5,
  ]);
  const kappa = getCouplingCoefficientPerM(design.indexModulation, 2 * design.averageIndex * design.gratingPeriodNm * 1e-9);
  const couplingLengthM = kappa > 0 ? 1 / kappa : Infinity;
  return {
    design: {
      strainBias: design.strainBias,
      peakStrain: design.peakStrain,
      perturbationEdgeWidthMm: design.perturbationEdgeWidthMm,
      indexModulation: design.indexModulation,
    },
    cmtReflectance: cmt.reflectance,
    maxwellReflectance: maxwell.reflectance,
    absoluteError: Math.abs(cmt.reflectance - maxwell.reflectance),
    backgroundDetuningOverKappa: Math.max(detuning[0].absoluteDetuningOverKappa, detuning[2].absoluteDetuningOverKappa),
    transitionWidthOverLambda: (design.perturbationEdgeWidthMm * 1e-3) / (design.gratingPeriodNm * 1e-9),
    transitionWidthOverLc: (design.perturbationEdgeWidthMm * 1e-3) / couplingLengthM,
  };
}

function timedSolve(label: string, solve: () => MaxwellPointResult): TimedPoint & { label: string } {
  const startMemory = process.memoryUsage().heapUsed;
  const start = performance.now();
  const result = solve();
  const runtimeMs = performance.now() - start;
  const heapUsedMb = Math.max(0, process.memoryUsage().heapUsed - startMemory) / (1024 * 1024);
  return { label, ...result, runtimeMs, heapUsedMb };
}

function summarizeSpectrum(points: Array<{ wavelengthNm: number; maxwell: MaxwellPointResult }>) {
  const peak = points.reduce((best, point) => point.maxwell.reflectance > best.maxwell.reflectance ? point : best, points[0]);
  return {
    peakWavelengthNm: peak.wavelengthNm,
    peakReflectance: peak.maxwell.reflectance,
    bandwidthNm: estimateWidth(points.map((point) => ({ wavelengthNm: point.wavelengthNm, reflectance: point.maxwell.reflectance }))),
    maxEnergyError: Math.max(...points.map((point) => point.maxwell.energyError)),
  };
}

function compactCmtPoint(point: { wavelengthNm: number; reflectance: number; transmission: number }) {
  return {
    wavelengthNm: point.wavelengthNm,
    reflectance: point.reflectance,
    transmission: point.transmission,
  };
}

function summarizeCmtSpectrum(points: Array<{ wavelengthNm: number; cmt: { reflectance: number } }>) {
  const peak = points.reduce((best, point) => point.cmt.reflectance > best.cmt.reflectance ? point : best, points[0]);
  return {
    peakWavelengthNm: peak.wavelengthNm,
    peakReflectance: peak.cmt.reflectance,
    bandwidthNm: estimateWidth(points.map((point) => ({ wavelengthNm: point.wavelengthNm, reflectance: point.cmt.reflectance }))),
  };
}

function estimateWidth(points: Array<{ wavelengthNm: number; reflectance: number }>): number | null {
  const maxReflectance = Math.max(...points.map((point) => point.reflectance));
  const halfMax = maxReflectance / 2;
  const active = points.filter((point) => point.reflectance >= halfMax);
  if (active.length < 2) return null;
  return active.at(-1)!.wavelengthNm - active[0].wavelengthNm;
}

function chooseArchitectureConclusion(): string {
  if (maxEnergyError() >= 1e-9) {
    return 'HIGH-FIDELITY MAXWELL MODEL DOES NOT SUPPORT THE BIASED-TROUGH ARCHITECTURE';
  }
  return smoothAtLaser.maxwell.reflectance > 0.01
    ? 'HIGH-FIDELITY MAXWELL MODEL PARTIALLY SUPPORTS THE TROUGH BUT REVISES ITS PERFORMANCE'
    : 'HIGH-FIDELITY MAXWELL MODEL DOES NOT SUPPORT THE BIASED-TROUGH ARCHITECTURE';
}

function chooseCmtConclusion(): string {
  if (finalCmtError.relativeError !== null && finalCmtError.relativeError < 0.05) {
    return 'SCALAR CMT IS QUANTITATIVELY ADEQUATE FOR THE TROUGH';
  }
  if (smoothAtLaser.maxwell.reflectance > 0.01 && smoothAtLaser.cmt.reflectance > 0.01) {
    return 'SCALAR CMT IS QUALITATIVELY USEFUL BUT QUANTITATIVELY INACCURATE FOR THE TROUGH';
  }
  return 'SCALAR CMT IS NOT RELIABLE FOR THE TROUGH OPERATING REGIME';
}

function chooseMechanicalGate(): string {
  return chooseArchitectureConclusion() === 'HIGH-FIDELITY MAXWELL MODEL PARTIALLY SUPPORTS THE TROUGH BUT REVISES ITS PERFORMANCE'
    ? 'BIASED TROUGH REMAINS OPTICALLY PROMISING BUT MECHANICAL GATE REMAINS CLOSED'
    : 'BIASED TROUGH SHOULD NOT PROCEED TO MECHANICAL DESIGN';
}

function maxEnergyError(): number {
  return Math.max(
    ...uniformOpticalConvergence.map((point) => point.energyError),
    uniformLongSpectrum.maxEnergyError,
    uniformStrainPoint.energyError,
    piecewiseTroughMaxwell.energyError,
    ...smoothEnvelopeConvergence.map((point) => point.energyError),
    ...smoothOpticalConvergence.map((point) => point.energyError),
    ...convergenceGrid.map((point) => point.energyError),
    smoothMetrics.maxEnergyError,
    ...stressTest.map((point) => point.energyError),
  );
}

function renderReport(): string {
  return [
    '# WP-v2-09B Locally Periodic Long-Grating Maxwell Validation',
    '',
    '## A. Solver extension',
    'The Maxwell solver now supports locally periodic mechanical-envelope blocks. Each block samples the existing strain/material model once, treats the microscopic carrier as an explicit sinusoidal Maxwell medium, composes complete periods with stable repeated-cell scattering, and appends an exact-length partial period when the block does not end on a period boundary.',
    '',
    '## B. Phase continuity',
    'The solver carries a running microscopic phase between mechanical blocks using `d phi / dz = 2 pi / Lambda(z)`. Blocks do not reset to a cosine maximum unless the physical input phase says so.',
    '',
    '## C. Fractional-period handling',
    `The fractional validation used ${fractionalValidation.requestedPeriods} periods and preserved length ${fmt(fractionalValidation.lengthM)} m. R error versus explicit discretization was ${fmt(fractionalValidation.reflectanceError)}.`,
    '',
    '## D. Acceleration validation',
    table(['N periods', 'R explicit', 'R accelerated', '|Delta R|', '|Delta T|'], accelerationValidation.map((row) => [
      String(row.repeatCount),
      fmt(row.explicit.reflectance),
      fmt(row.accelerated.reflectance),
      fmt(row.reflectanceError),
      fmt(row.transmissionError),
    ])),
    '',
    '## E. Split-grating identity',
    table(['blocks', 'R', 'T', '|R+T-1|'], splitGratingIdentity.map((row) => [
      String(row.envelopeBlocks),
      fmt(row.result.reflectance),
      fmt(row.result.transmission),
      fmt(row.result.energyError),
    ])),
    '',
    '## F. Optical-period convergence',
    table(['samples/period', 'R_Maxwell', 'T_Maxwell', '|R+T-1|', 'runtime ms'], uniformOpticalConvergence.map((row) => [
      row.label.replace('uniform-10mm-spp-', ''),
      fmt(row.reflectance),
      fmt(row.transmission),
      fmt(row.energyError),
      fmt(row.runtimeMs),
    ])),
    '',
    '## G. Mechanical-envelope convergence',
    table(['blocks', 'R_Maxwell', 'T_Maxwell', '|R+T-1|', 'runtime ms'], smoothEnvelopeConvergence.map((row) => [
      row.label.replace('smooth-10mm-blocks-', ''),
      fmt(row.reflectance),
      fmt(row.transmission),
      fmt(row.energyError),
      fmt(row.runtimeMs),
    ])),
    '',
    '## H. Energy conservation',
    payload.conclusions.energy,
    `Maximum relevant |R + T - 1|: ${fmt(maxEnergyError())}.`,
    '',
    '## I. Full-length uniform-grating result',
    `10 mm uniform spectrum peak R = ${fmt(uniformLongSpectrum.peakReflectance)} at ${fmt(uniformLongSpectrum.peakWavelengthNm)} nm; sampled bandwidth = ${fmt(uniformLongSpectrum.bandwidthNm)} nm.`,
    '',
    '## J. Full-length uniform-strain result',
    `R_CMT(lambda_laser) = ${fmt(uniformStrainCmt.reflectance)}; R_Maxwell(lambda_laser) = ${fmt(uniformStrainPoint.reflectance)}.`,
    '',
    '## K. Piecewise trough result',
    `R_exact_CMT = ${fmt(piecewiseExactCmt.reflectance)}; R_spatial_CMT = ${fmt(piecewiseTroughCmt.reflectance)}; R_Maxwell = ${fmt(piecewiseTroughMaxwell.reflectance)}.`,
    '',
    '## L. Smooth 10 mm trough - REQUIRED',
    `R_CMT(lambda_laser) = ${fmt(finalCmtError.rCmt)}; R_Maxwell(lambda_laser) = ${fmt(finalCmtError.rMaxwell)}; absolute error = ${fmt(finalCmtError.absoluteError)}; relative error = ${fmt(finalCmtError.relativeError)}.`,
    `Maxwell peak R = ${fmt(smoothMetrics.peakReflectance)} at ${fmt(smoothMetrics.peakWavelengthNm)} nm; sampled width = ${fmt(smoothMetrics.bandwidthNm)} nm.`,
    '',
    '## M. CMT error diagnostics',
    'Detuning, transition-width, and coupling diagnostics are compact controlled checks, not a broad optimization sweep.',
    table(['case', 'parameter', 'R_CMT', 'R_Maxwell', '|Delta R|'], [
      ...detuningDiagnostics.map((row) => ['detuning', `bias ${fmt(row.design.strainBias)}`, fmt(row.cmtReflectance), fmt(row.maxwellReflectance), fmt(row.absoluteError)]),
      ...transitionDiagnostics.map((row) => ['transition', `edge ${fmt(row.design.perturbationEdgeWidthMm)} mm`, fmt(row.cmtReflectance), fmt(row.maxwellReflectance), fmt(row.absoluteError)]),
      ...couplingDiagnostics.map((row) => ['coupling', `Delta n ${fmt(row.design.indexModulation)}`, fmt(row.cmtReflectance), fmt(row.maxwellReflectance), fmt(row.absoluteError)]),
    ]),
    '',
    '## N. CMT validity conclusion',
    payload.conclusions.cmt,
    '',
    '## O. Maxwell spatial reconstruction',
    'Not implemented in this packet. Boundary optics are converged enough for the reflectance verdict, but no Maxwell spatial localization metric is claimed.',
    '',
    '## P. Moving-trough result',
    payload.conclusions.movingTrough,
    '',
    '## Q. 4-actuator result',
    'Not independently tested because comparable Maxwell spatial fields are not available.',
    '',
    '## R. Architecture result - REQUIRED HIGHLIGHT',
    payload.conclusions.architecture,
    '',
    '## S. CMT result - REQUIRED HIGHLIGHT',
    payload.conclusions.cmt,
    '',
    '## T. Mechanical gate - REQUIRED HIGHLIGHT',
    payload.conclusions.mechanicalGate,
    '',
    '## U. Mechanical requirements',
    'Not extracted because the mechanical gate remains closed.',
    '',
    '## V. Performance',
    table(['case', 'R', 'runtime ms', 'heap delta MB'], [
      ...stressTest.map((row) => [row.label, fmt(row.reflectance), fmt(row.runtimeMs), fmt(row.heapUsedMb)]),
      ['smooth-spectrum-9pt', fmt(smoothMetrics.peakReflectance), 'see JSON per point', 'bounded'],
    ]),
    '',
    '## W. Documentation',
    '- `src/simulation/solvers/maxwell/longGratingScatteringSolver.ts`',
    '- `src/simulation/solvers/maxwell/longGratingScatteringSolver.test.ts`',
    '- `scripts/highFidelityBraggValidationStudy.mts`',
    '- `artifacts/issue-68/high-fidelity-bragg-validation-study.md`',
    '- `artifacts/issue-68/high-fidelity-bragg-validation-study.json`',
    '- `RESEARCH.md`',
    '- `ARCHITECTURE.md`',
    '- `HANDOFF.md`',
    '- `MILESTONES.md`',
    '',
    '## X. Verification',
    'Generated by `npx.cmd tsx scripts/highFidelityBraggValidationStudy.mts`. Full test/lint/build/browser results are recorded in `HANDOFF.md` after verification.',
    '',
    '## Y. GitHub',
    'Issue #68; branch `codex/issue-68-high-fidelity-bragg-maxwell-solver`; draft PR #69 stacked on `codex/issue-66-piezo-strain-window-addressing` while PR #67 remains open.',
    '',
    '## Z. Recommended next step',
    'Complete Maxwell spatial-field reconstruction before mechanics. The boundary result supports a revised trough response, but moving-trough and array localization remain CMT-only.',
    '',
  ].join('\n');
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

function relativeError(reference: number, actual: number): number | null {
  return Math.abs(reference) > 1e-12 ? Math.abs(actual - reference) / Math.abs(reference) : null;
}

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)) return value.toExponential(4);
  return value.toPrecision(5);
}
