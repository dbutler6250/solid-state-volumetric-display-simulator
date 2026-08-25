import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HybridBraggDesignInputs } from '../src/types/simulation';
import { detectReflectionRegions, type ReflectionRegion } from '../src/simulation/experiments/hybridBraggExperiments';
import { createShearLagCounterStrainField, createSmoothTroughField, type SampledStrainField } from '../src/simulation/mechanics/actuatorStrainTransfer';
import { evaluateMechanicalArchitectures, type MechanicalArchitectureResult } from '../src/simulation/mechanics/mechanicalArchitectures';
import type { MechanicalStrainTarget } from '../src/simulation/mechanics/mechanicalTargetMetrics';
import { reconstructHybridBraggMaxwellFieldsFromStrain, type HybridMaxwellOptions, type MaxwellFieldSample } from '../src/simulation/solvers/maxwell/longGratingScatteringSolver';
import { classifyUsefulTroughState, type UsefulStateThresholds } from '../src/simulation/validation/strainTroughRequirement';

type RegionMetrics = {
  reflectance: number;
  transmission: number;
  energyError: number;
  centerMm: number | null;
  centerErrorMm: number | null;
  widthMm: number | null;
  targetFraction: number | null;
  offTargetFraction: number | null;
  strongestCompetitor: number;
  regionCount: number;
  useful: boolean;
};

type PriorPoint = {
  value: number;
  maxwell: Omit<RegionMetrics, 'useful'>;
  useful: boolean;
};

type PriorPayload = {
  nominal: Record<string, number>;
  thresholds: UsefulStateThresholds;
  maxwellOptions: HybridMaxwellOptions;
  sweeps: Record<string, PriorPoint[]>;
  classifications: Record<string, string>;
};

const ISSUE = 72;
const OUT_DIR = join(process.cwd(), 'artifacts', `issue-${ISSUE}`);
const JSON_PATH = join(OUT_DIR, 'strain-trough-mechanical-feasibility.json');
const REPORT_PATH = join(OUT_DIR, 'strain-trough-mechanical-feasibility.md');
const PRIOR_PATH = join(process.cwd(), 'artifacts', 'issue-70', 'maxwell-trough-robustness-study.json');
const PREVIOUS_DESIGN_PATH = join(process.cwd(), 'artifacts', 'issue-66', 'piezo-strain-window-study.json');
const REGION_THRESHOLD = 0.5;
const EPSILON = 1e-12;
const MAXWELL_OPTIONS: HybridMaxwellOptions = { samplesPerPeriod: 8, envelopeBlocks: 300 };

const prior = JSON.parse(await readFile(PRIOR_PATH, 'utf8')) as PriorPayload;
const previous = JSON.parse(await readFile(PREVIOUS_DESIGN_PATH, 'utf8')) as { bestTrough: { design: HybridBraggDesignInputs; targetWidthMm: number } };
const nominalDesign = previous.bestTrough.design;
const targetWidthMm = previous.bestTrough.targetWidthMm;
const target: MechanicalStrainTarget = {
  lengthM: nominalDesign.lengthMm * 1e-3,
  centerM: nominalDesign.strainCenterMm * 1e-3,
  widthM: nominalDesign.strainWidthMm * 1e-3,
  transitionWidthM: nominalDesign.perturbationEdgeWidthMm * 1e-3,
  backgroundStrain: nominalDesign.strainBias,
  troughStrain: nominalDesign.strainBias - nominalDesign.peakStrain,
};
const host = {
  youngsModulusPa: 2e9,
  crossSectionAreaM2: 1e-6,
  densityKgPerM3: 2200,
  poissonRatio: 0.25,
};
const targetField = createSmoothTroughField(target);
const toleranceAudit = auditPriorTolerances();
const refinedTolerances = refineMechanicalTolerances();
const mechanics = evaluateMechanicalArchitectures({ target, targetField, host });
const shearTransferStudy = runShearTransferStudy();
const architectureResults = mechanics.architectures.map((architecture) => {
  const optical = rescoreMechanicalField(architecture.field);
  return {
    ...architecture,
    optical,
    opticalClassification: classifyOptical(optical),
  };
});
const best = [...architectureResults].sort((left, right) =>
  left.metrics.rmsStrainError - right.metrics.rmsStrainError)[0];
const feasibilityConclusion = classifyFeasibility();
const opticalConclusion = best.optical.useful
  ? 'MECHANICALLY GENERATED STRAIN FIELD PASSES MAXWELL OPTICAL REQUIREMENT'
  : best.optical.reflectance >= prior.thresholds.minimumReflectance
    ? 'MECHANICALLY GENERATED STRAIN FIELD PARTIALLY PASSES MAXWELL OPTICAL REQUIREMENT'
    : 'MECHANICALLY GENERATED STRAIN FIELD FAILS MAXWELL OPTICAL REQUIREMENT';
const payload = {
  issue: ISSUE,
  baseline: {
    pr71: 'merged into main as 7785d8b; no comments, reviews, or review threads returned by GitHub inspection',
    issue70: 'closed by PR #71',
    branch: 'codex/issue-72-strain-trough-mechanical-feasibility',
  },
  nominalTarget: target,
  opticalRequirement: prior.nominal,
  priorClassifications: prior.classifications,
  toleranceAudit,
  refinedTolerances,
  toleranceInterpretation: 'PRIOR TOLERANCE RESULT WAS MIXED',
  shearTransferStudy,
  host,
  uniformPreload: mechanics.preload,
  architectures: architectureResults.map(({ field: _field, ...architecture }) => ({
    ...architecture,
    profileSamples: sampleProfile(_field),
  })),
  bestMechanicalConcept: best.architecture,
  feasibilityConclusion,
  opticalConclusion,
  dominantBottleneck: 'TRANSITION-WIDTH LOCALIZATION AND POSITION PRECISION ARE THE PRIMARY BOTTLENECKS',
  detailedMechanicsGate: 'DETAILED MECHANICAL MODELING IS JUSTIFIED ONLY FOR A NARROW HIGH-RISK CONCEPT',
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());
console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function auditPriorTolerances() {
  return [
    auditSweep('bias strain', 'biasSweep', nominalDesign.strainBias),
    auditSweep('trough excursion', 'troughDepthSweep', nominalDesign.peakStrain),
    auditSweep('trough width mm', 'widthSweep', nominalDesign.strainWidthMm),
    auditSweep('position offset mm', 'positionSweep', 0),
    auditSweep('laser wavelength nm', 'laserSweep', nominalDesign.fixedLaserWavelengthNm),
  ];
}

function auditSweep(label: string, key: string, nominal: number) {
  const points = [...(prior.sweeps[key] ?? [])].sort((left, right) => left.value - right.value);
  const nominalIndex = points.reduce((best, point, index) =>
    Math.abs(point.value - nominal) < Math.abs(points[best].value - nominal) ? index : best, 0);
  const nearestPassing = [...points].filter((point) => point.useful)
    .sort((left, right) => Math.abs(left.value - nominal) - Math.abs(right.value - nominal))[0] ?? null;
  const nearestFailing = [...points].filter((point) => !point.useful)
    .sort((left, right) => Math.abs(left.value - nominal) - Math.abs(right.value - nominal))[0] ?? null;
  const left = points[nominalIndex - 1];
  const right = points[nominalIndex + 1];
  const step = Math.min(
    left ? Math.abs(points[nominalIndex].value - left.value) : Infinity,
    right ? Math.abs(right.value - points[nominalIndex].value) : Infinity,
  );
  return {
    parameter: label,
    nominal,
    sweepStep: Number.isFinite(step) ? step : null,
    nearestTestedPassingPoint: nearestPassing?.value ?? null,
    nearestTestedFailingPoint: nearestFailing?.value ?? null,
  };
}

function refineMechanicalTolerances() {
  const probes = [
    {
      parameter: 'position offset mm',
      values: [-0.025, -0.01, 0, 0.01, 0.025],
      fieldFor: (value: number) => createSmoothTroughField({ ...target, centerM: target.centerM + value * 1e-3 }),
    },
    {
      parameter: 'trough width mm',
      values: [0.76, 0.78, 0.8, 0.82, 0.84],
      fieldFor: (value: number) => createSmoothTroughField({ ...target, widthM: value * 1e-3 }),
    },
    {
      parameter: 'bias strain',
      values: [0.00145, 0.001475, 0.0015, 0.001525, 0.00155],
      fieldFor: (value: number) => createSmoothTroughField({ ...target, backgroundStrain: value }),
    },
    {
      parameter: 'trough excursion',
      values: [0.00145, 0.001475, 0.0015, 0.001525, 0.00155],
      fieldFor: (value: number) => createSmoothTroughField({ ...target, troughStrain: target.backgroundStrain - value }),
    },
    {
      parameter: 'transition width mm',
      values: [0.2, 0.225, 0.25, 0.275, 0.3],
      fieldFor: (value: number) => createSmoothTroughField({ ...target, transitionWidthM: value * 1e-3 }),
    },
  ];
  const fieldProbes = probes.map((probe) => {
    const points = probe.values.map((value) => ({ value, optical: rescoreMechanicalField(probe.fieldFor(value)) }));
    const useful = points.filter((point) => point.optical.useful).map((point) => point.value);
    return {
      parameter: probe.parameter,
      points,
      lowerUseful: useful[0] ?? null,
      upperUseful: useful.length > 0 ? useful[useful.length - 1] : null,
    };
  });
  const laserValues = [600.09, 600.10, 600.11, 600.12, 600.13];
  const laserPoints = laserValues.map((value) => ({ value, optical: rescoreMechanicalField(targetField, value) }));
  const usefulLaser = laserPoints.filter((point) => point.optical.useful).map((point) => point.value);
  return [
    ...fieldProbes,
    {
      parameter: 'laser wavelength nm',
      points: laserPoints,
      lowerUseful: usefulLaser[0] ?? null,
      upperUseful: usefulLaser.length > 0 ? usefulLaser[usefulLaser.length - 1] : null,
    },
  ];
}

function runShearTransferStudy() {
  const transferLengthsM = [0.000025, 0.00005, 0.000075, 0.0001, 0.000125, 0.00015, 0.0002, 0.00025, 0.00032];
  const points = transferLengthsM.map((transferLengthM) => {
    const field = createShearLagCounterStrainField({
      ...target,
      actuatorFreeStrain: -(target.backgroundStrain - target.troughStrain),
      transferLengthM,
    });
    return {
      transferLengthM,
      transferLengthMm: transferLengthM * 1e3,
      optical: rescoreMechanicalField(field),
      sampleCenterStrain: field.sampleStrain(target.centerM),
      sampleEdgeStrain: field.sampleStrain(target.centerM + target.widthM / 2 + target.transitionWidthM / 2),
    };
  });
  const passing = points.filter((point) => point.optical.useful);
  const shortestPassing = passing[0] ?? null;
  return {
    points,
    requiredTransferLengthMm: shortestPassing?.transferLengthMm ?? null,
    plausibility: shortestPassing === null
      ? 'not found in tested range'
      : shortestPassing.transferLengthMm <= 0.075 ? 'aggressive'
        : shortestPassing.transferLengthMm <= 0.15 ? 'plausible but demanding'
          : 'implausibly long or poorly localized',
  };
}

function rescoreMechanicalField(field: SampledStrainField, wavelengthNm = nominalDesign.fixedLaserWavelengthNm): RegionMetrics {
  const result = reconstructHybridBraggMaxwellFieldsFromStrain(nominalDesign, wavelengthNm, MAXWELL_OPTIONS, field);
  const metrics = metricsFromMaxwellSamples(result.samples, result.reflectance, result.transmission, result.energyError, nominalDesign.strainCenterMm, targetWidthMm);
  return {
    ...metrics,
    useful: classifyUsefulTroughState({
      reflectance: metrics.reflectance,
      centerErrorMm: metrics.centerErrorMm,
      regionWidthMm: metrics.widthMm,
      targetFraction: metrics.targetFraction,
      offTargetFraction: metrics.offTargetFraction,
      strongestCompetitor: metrics.strongestCompetitor,
      regionCount: metrics.regionCount,
    }, prior.thresholds),
  };
}

function metricsFromMaxwellSamples(
  samples: MaxwellFieldSample[],
  reflectance: number,
  transmission: number,
  energyError: number,
  targetMm: number,
  widthMm: number,
): Omit<RegionMetrics, 'useful'> {
  const regions = detectReflectionRegions(toRegionField(samples), REGION_THRESHOLD);
  const primaryRegion = regions[0] ?? null;
  const totalResponse = integrate(samples, () => 1);
  const targetStartMm = targetMm - widthMm / 2;
  const targetEndMm = targetMm + widthMm / 2;
  const targetResponse = integrate(samples, (sample) => {
    const zMm = sample.zM * 1e3;
    return zMm >= targetStartMm && zMm <= targetEndMm ? 1 : 0;
  });
  return {
    reflectance,
    transmission,
    energyError,
    centerMm: primaryRegion?.centerMm ?? null,
    centerErrorMm: primaryRegion ? primaryRegion.centerMm - targetMm : null,
    widthMm: primaryRegion ? primaryRegion.endMm - primaryRegion.startMm : null,
    targetFraction: totalResponse > EPSILON ? targetResponse / totalResponse : null,
    offTargetFraction: totalResponse > EPSILON ? Math.max(0, totalResponse - targetResponse) / totalResponse : null,
    strongestCompetitor: regions.reduce((maximum, region) => Math.max(maximum, competitorPower(samples, region, targetStartMm, targetEndMm)), 0),
    regionCount: regions.length,
  };
}

function toRegionField(samples: MaxwellFieldSample[]) {
  return samples.map((sample) => ({
    ...sample,
    startM: sample.zM - sample.lengthM / 2,
    endM: sample.zM + sample.lengthM / 2,
    sectionId: null,
    sectionStartM: null,
    sectionEndM: null,
    gratingPhaseRadians: 0,
    inBraggSection: true,
    strain: 0,
    averageIndex: nominalDesign.averageIndex,
    periodM: nominalDesign.gratingPeriodNm * 1e-9,
    braggWavelengthM: 2 * nominalDesign.averageIndex * nominalDesign.gratingPeriodNm * 1e-9,
    couplingCoefficientPerM: 0,
    detuningPerM: 0,
  }));
}

function integrate(samples: MaxwellFieldSample[], weight: (sample: MaxwellFieldSample) => number): number {
  return samples.reduce((sum, sample) => sum + sample.normalizedBackwardIntensity * sample.lengthM * 1e3 * weight(sample), 0);
}

function competitorPower(samples: MaxwellFieldSample[], region: ReflectionRegion, targetStartMm: number, targetEndMm: number): number {
  return integrate(samples, (sample) => {
    const zMm = sample.zM * 1e3;
    return zMm >= region.startMm && zMm <= region.endMm && (zMm < targetStartMm || zMm > targetEndMm) ? 1 : 0;
  });
}

function classifyOptical(optical: RegionMetrics) {
  if (optical.useful) return 'PASSES MAXWELL OPTICAL TARGET';
  if (optical.reflectance >= prior.thresholds.minimumReflectance) return 'PARTIALLY PASSES / REVISED OPTICAL TARGET';
  return 'FAILS MAXWELL OPTICAL TARGET';
}

function classifyFeasibility() {
  const plausible = architectureResults.filter((item) => item.classification === 'MECHANICALLY PLAUSIBLE AT REDUCED-ORDER LEVEL' && item.optical.useful);
  if (plausible.length > 0) return 'REDUCED-ORDER MECHANICS SUPPORT A PLAUSIBLE STRAIN-TROUGH IMPLEMENTATION';
  const marginal = architectureResults.filter((item) => item.classification !== 'MECHANICALLY IMPLAUSIBLE UNDER TESTED ASSUMPTIONS');
  return marginal.length > 0
    ? 'REDUCED-ORDER MECHANICS SHOW A MARGINAL / HIGH-RISK PATH TO THE STRAIN TROUGH'
    : 'REDUCED-ORDER MECHANICS DO NOT SUPPORT A PRACTICAL STRAIN-TROUGH IMPLEMENTATION';
}

function sampleProfile(field: SampledStrainField) {
  const stride = Math.max(1, Math.floor(field.samples.length / 40));
  return field.samples.filter((_, index) => index % stride === 0).map((sample) => ({
    zMm: sample.zM * 1e3,
    strain: sample.strain,
  }));
}

function renderReport(): string {
  return [
    '# WP-v2-10 Reduced-Order Mechanical Feasibility',
    '',
    '## A. PR #71 / baseline state',
    payload.baseline.pr71,
    '',
    '## B. Issue / branch / PR',
    'Issue #72, branch `codex/issue-72-strain-trough-mechanical-feasibility`; draft PR is opened after verification.',
    '',
    '## C. Optical requirement',
    table(['quantity', 'value'], Object.entries(prior.nominal).map(([key, value]) => [key, fmt(value)])),
    '',
    '## D. Refined tolerance interpretation',
    payload.toleranceInterpretation,
    table(['parameter', 'nominal', 'prior sweep step', 'nearest pass', 'nearest fail'], toleranceAudit.map((row) => [
      row.parameter,
      fmt(row.nominal),
      fmt(row.sweepStep),
      fmt(row.nearestTestedPassingPoint),
      fmt(row.nearestTestedFailingPoint),
    ])),
    table(['refined parameter', 'lower useful', 'upper useful'], refinedTolerances.map((row) => [
      row.parameter,
      fmt(row.lowerUseful),
      fmt(row.upperUseful),
    ])),
    '',
    '## E. Mechanical assumptions',
    `Linear small-strain quasi-static 1D mechanics. Host E=${fmt(host.youngsModulusPa)} Pa, A=${fmt(host.crossSectionAreaM2)} m^2, density=${fmt(host.densityKgPerM3)} kg/m^3. This excludes 3D Poisson effects, bending, edge stress concentrations, adhesive peeling, piezoelectric voltage coupling, modes, fatigue, and thermal effects.`,
    '',
    '## F. Uniform preload',
    `epsilon=${fmt(mechanics.preload.strain)}, sigma=${fmt(mechanics.preload.stressPa)} Pa, F=${fmt(mechanics.preload.forceN)} N, displacement=${fmt(mechanics.preload.displacementM)} m, energy=${fmt(mechanics.preload.elasticEnergyJ)} J.`,
    '',
    '## J. Bonded/shear-lag actuation transfer sweep',
    `Required tested transfer length: ${fmt(shearTransferStudy.requiredTransferLengthMm)} mm; classification: ${shearTransferStudy.plausibility}.`,
    table(['L_transfer mm', 'center strain', 'edge strain', 'R_Maxwell', 'useful'], shearTransferStudy.points.map((point) => [
      fmt(point.transferLengthMm),
      fmt(point.sampleCenterStrain),
      fmt(point.sampleEdgeStrain),
      fmt(point.optical.reflectance),
      String(point.optical.useful),
    ])),
    '',
    '## G-M. Mechanical architecture table',
    table([
      'Architecture',
      'Mechanical abstraction',
      'Bias preserved?',
      'Trough strain achieved',
      'Transition error mm',
      'Localization length mm',
      'Cross-talk',
      'Required free strain',
      'Required displacement um',
      'Required force N',
      'R_Maxwell',
      'Optical result',
      'Reduced-order feasibility',
    ], architectureResults.map((item) => [
      item.architecture,
      item.abstraction,
      Math.abs(item.metrics.biasStrainError) < 1e-5 ? 'yes' : 'partial',
      fmt(target.troughStrain + item.metrics.troughMinimumError),
      fmt(item.metrics.transitionWidthErrorM * 1e3),
      fmt(item.metrics.localizationLengthM * 1e3),
      fmt(item.metrics.crossTalk),
      fmt(item.requiredFreeStrain),
      fmt(item.requiredDisplacementM === null ? null : item.requiredDisplacementM * 1e6),
      fmt(item.requiredForceN),
      fmt(item.optical.reflectance),
      item.opticalClassification,
      item.classification,
    ])),
    '',
    '## O. Target-error table',
    table(['Mechanical quantity', 'Achieved', 'Optical allowed'], [
      ['bias error', fmt(best.metrics.biasStrainError), refinedBound('bias strain')],
      ['trough-depth error', fmt(best.metrics.troughMinimumError), refinedBound('trough excursion')],
      ['center error mm', fmt(best.metrics.centerErrorM * 1e3), refinedBound('position offset mm')],
      ['width error mm', fmt(best.metrics.widthErrorM * 1e3), refinedBound('trough width mm')],
      ['transition error mm', fmt(best.metrics.transitionWidthErrorM * 1e3), refinedBound('transition width mm')],
    ]),
    '',
    '## P. Maxwell optical rescoring',
    `Best actual field: ${best.architecture}. R_Maxwell=${fmt(best.optical.reflectance)}, center=${fmt(best.optical.centerMm)} mm, width=${fmt(best.optical.widthMm)} mm, target fraction=${fmt(best.optical.targetFraction)}, off-target fraction=${fmt(best.optical.offTargetFraction)}, regions=${best.optical.regionCount}.`,
    '',
    '## Q. Main result - REQUIRED HIGHLIGHT',
    feasibilityConclusion,
    '',
    '## R. Best mechanical concept',
    `${best.architecture.toUpperCase()} IS THE LEADING MECHANICAL CONCEPT`,
    '',
    '## S. Mechanical bottleneck - REQUIRED HIGHLIGHT',
    payload.dominantBottleneck,
    '',
    '## T. Optical result - REQUIRED HIGHLIGHT',
    opticalConclusion,
    '',
    '## U. Detailed-mechanics gate - REQUIRED HIGHLIGHT',
    payload.detailedMechanicsGate,
    '',
    '## V. Documentation / W. Verification / X. GitHub / Y. Recommended next step',
    'Filled during task closeout after tests, docs, draft PR, and CI status are complete.',
    '',
  ].join('\n') + '\n';
}

function refinedBound(parameter: string): string {
  const row = refinedTolerances.find((item) => item.parameter === parameter);
  return row ? `${fmt(row.lowerUseful)} to ${fmt(row.upperUseful)}` : 'not refined';
}

function table(headers: string[], rows: string[][]): string {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
}

function fmt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)) return value.toExponential(4);
  return value.toPrecision(5);
}
