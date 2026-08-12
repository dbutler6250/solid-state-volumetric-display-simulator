import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { HybridBraggDesignInputs, HybridSectionPhaseMode } from '../src/types/simulation';
import {
  solveMovingPulseExperiment,
  solveReflectionRegionEvolution,
} from '../src/simulation/experiments/hybridBraggExperiments';
import {
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  getCouplingCoefficientPerM,
  getHybridDesignBraggWavelengthNm,
} from '../src/simulation/structures/hybridBraggGrating';

type StudyRow = {
  label: string;
  sectionCount: number;
  phaseMode: HybridSectionPhaseMode;
  sectionLengthMm: number;
  sectionLengthToCouplingLength: number;
  staticReflectance: number;
  peakReflectance: number;
  peakEnhancement: number;
  secondaryPeakRatio: number | null;
  activeRegionCount: number;
  activeSectionCount: number;
};

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, 'artifacts', 'issue-62');
const DATA_PATH = join(OUT_DIR, 'segmented-bragg-study.json');
const REPORT_PATH = join(OUT_DIR, 'segmented-bragg-study.md');
const PHASE_MODES: HybridSectionPhaseMode[] = ['continuous', 'fixed-reset', 'alternating', 'seeded-random'];

function referenceDesign(overrides: Partial<HybridBraggDesignInputs> = {}): HybridBraggDesignInputs {
  const braggWavelengthNm = getHybridDesignBraggWavelengthNm(DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS);
  return {
    ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
    lengthMm: 10,
    averageIndex: 1.45,
    indexModulation: 1e-4,
    gratingPeriodNm: 206.9,
    peakStrain: 1e-4,
    strainShape: 'multi-tone',
    perturbationPeriodMm: 1.91,
    perturbationSecondaryPeriodMm: 2.865,
    perturbationSecondaryAmplitudeRatio: 1,
    fixedLaserWavelengthNm: braggWavelengthNm + 0.1,
    segmentCount: 700,
    pulseSweepPointCount: 49,
    ...overrides,
  };
}

function couplingLengthMm(design: HybridBraggDesignInputs): number {
  const kappa = getCouplingCoefficientPerM(design.indexModulation, getHybridDesignBraggWavelengthNm(design) / 1e9);
  return 1e3 / kappa;
}

function runCase(label: string, design: HybridBraggDesignInputs): StudyRow {
  const moving = solveMovingPulseExperiment(design);
  const evolution = solveReflectionRegionEvolution(design, 0.5);
  const bestFrame = evolution.frames.reduce((best, frame) => frame.reflectance > best.reflectance ? frame : best, evolution.frames[0]);
  const totalGapMm = design.permanentGratingMode === 'segmented'
    ? Math.max(0, design.braggSectionCount - 1) * design.braggSectionGapMm
    : 0;
  const sectionLengthMm = design.permanentGratingMode === 'segmented'
    ? (design.lengthMm - totalGapMm) / design.braggSectionCount
    : design.lengthMm;
  const lcMm = couplingLengthMm(design);

  return {
    label,
    sectionCount: design.permanentGratingMode === 'segmented' ? design.braggSectionCount : 1,
    phaseMode: design.braggSectionPhaseMode,
    sectionLengthMm,
    sectionLengthToCouplingLength: sectionLengthMm / lcMm,
    staticReflectance: moving.metrics.staticReflectance,
    peakReflectance: moving.metrics.peakReflectance,
    peakEnhancement: moving.metrics.peakEnhancement,
    secondaryPeakRatio: moving.metrics.localization.secondaryPeakRatio,
    activeRegionCount: bestFrame.regions.length,
    activeSectionCount: bestFrame.activeSectionIds.length,
  };
}

async function main(): Promise<void> {
  const rows: StudyRow[] = [
    runCase('global coherent reference', referenceDesign()),
  ];

  for (const sectionCount of [2, 4, 8, 16]) {
    for (const phaseMode of PHASE_MODES) {
      rows.push(runCase(`${sectionCount} sections / ${phaseMode}`, referenceDesign({
        permanentGratingMode: 'segmented',
        braggSectionCount: sectionCount,
        braggSectionGapMm: 0,
        braggSectionPhaseMode: phaseMode,
        braggSectionRandomSeed: 62,
      })));
    }
  }

  const best = [...rows].sort((left, right) =>
    scoreAddressability(right) - scoreAddressability(left),
  )[0];
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(DATA_PATH, `${JSON.stringify({ rows, best }, null, 2)}\n`, 'utf8');
  await writeFile(REPORT_PATH, renderReport(rows, best), 'utf8');
}

function scoreAddressability(row: StudyRow): number {
  const secondaryPenalty = row.secondaryPeakRatio ?? 1;
  return row.peakEnhancement * 10 - secondaryPenalty - row.activeRegionCount * 0.05 + row.activeSectionCount * 0.02;
}

function renderReport(rows: StudyRow[], best: StudyRow): string {
  const lines = [
    '# WP-v2-06 Segmented Bragg Baseline Study',
    '',
    'This study uses the scalar spatial CMT Hybrid Bragg solver and detects active regions from calculated normalized backward optical intensity `|B(z)|^2 >= 50% max`.',
    '',
    `Best scored case in this initial sweep: ${best.label}.`,
    '',
    '| Case | Sections | Phase | L_section (mm) | L_section / L_c | R_static | R_peak | Enhancement | Secondary ratio | Regions | Active sections |',
    '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map((row) => [
      row.label,
      row.sectionCount,
      row.phaseMode,
      row.sectionLengthMm.toPrecision(4),
      row.sectionLengthToCouplingLength.toPrecision(4),
      row.staticReflectance.toPrecision(5),
      row.peakReflectance.toPrecision(5),
      row.peakEnhancement.toPrecision(5),
      row.secondaryPeakRatio === null ? 'n/a' : row.secondaryPeakRatio.toPrecision(5),
      row.activeRegionCount,
      row.activeSectionCount,
    ].join(' | ')).map((line) => `| ${line} |`),
    '',
    'Interpretation: this is a baseline implementation study, not the final WP-v2-06 conclusion. It verifies that segmented permanent-grating phase relationships and calculated optical-field region detection are now executable and exportable.',
  ];
  return `${lines.join('\n')}\n`;
}

void main();
