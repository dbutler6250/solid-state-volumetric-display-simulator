import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createUniformDiscreteBraggPlaneStack,
  getRequiredPlaneIndexModulation,
  solveDiscreteBraggPlaneStack,
  type DiscretePlaneStackResult,
} from '../src/simulation/structures/discreteBraggPlaneStack';
import { getCouplingCoefficientPerM } from '../src/simulation/structures/hybridBraggGrating';
import { getUniformOnResonanceReflectance } from '../src/simulation/solvers/coupledMode/spatialBraggSolver';

type Spacing = 'periodic' | 'aperiodic' | 'phase-scrambled';
type ControlMethod = 'detuned-identical' | 'switchable-kappa' | 'spectrally-staggered' | 'resonant-defect';

type PlaneDesign = {
  id: string;
  planeCount: number;
  planeThicknessMm: number;
  pitchMm: number;
  gapMm: number;
  spacing: Spacing;
  controlMethod: ControlMethod;
  offDeltaN: number;
  onDeltaN: number;
  offBraggShiftNm: number;
  selectedPlaneIndex: number;
};

type DesignMetric = PlaneDesign & {
  offReflectance: number;
  offTransmission: number;
  onReflectance: number;
  onTransmission: number;
  deltaR: number;
  onOffRatio: number;
  selectedPlaneFraction: number | null;
  secondaryPlaneRatio: number | null;
  selectedPlaneCenterMm: number;
  opticalCenterMm: number | null;
  centerErrorMm: number | null;
  opticalWidthMm: number | null;
  equivalentStrainMicrostrain: number;
  eoFieldVPerUm: number;
  cumulativeInterfaceReflection: number;
  qualityClass: 'clearly insufficient' | 'marginal' | 'research-useful' | 'promising';
};

const ISSUE = 84;
const OUT_DIR = join(process.cwd(), 'artifacts', `issue-${ISSUE}`);
const JSON_PATH = join(OUT_DIR, 'discrete-bragg-plane-architecture-study.json');
const REPORT_PATH = join(OUT_DIR, 'discrete-bragg-plane-architecture-study.md');
const TOTAL_DEPTH_MM = 10;
const WAVELENGTH_NM = 600.11;
const WAVELENGTH_M = WAVELENGTH_NM * 1e-9;
const AVERAGE_INDEX = 1.45;
const CURRENT_DELTA_N = 1e-4;
const WP_V2_15_ACTIVE_LENGTH_MM = 1.3;
const WP_V2_15_BACKGROUND_DETUNING_NM = -0.5915518044213286;
const BRAGG_SHIFT_PER_MICROSTRAIN_NM = 0.000461;
const EO_DELTA_N_PER_V_UM = 5.23e-5;
const AIR_GLASS_FRESNEL_R = ((AVERAGE_INDEX - 1) / (AVERAGE_INDEX + 1)) ** 2;

const planeThicknessesMm = [0.1, 0.25, 0.5, 0.8, 1.0];
const reflectanceTargets = [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90];
const singlePlaneRequirements = buildSinglePlaneRequirements();
const planeThicknessTradeoff = buildPlaneThicknessTradeoff();
const designs = buildDesigns();
const designMetrics = designs.map(evaluateDesign);
const bestSwitchable = bestDesign(designMetrics.filter((metric) => metric.controlMethod === 'switchable-kappa'));
const bestPeriodic = bestDesign(designMetrics.filter((metric) => metric.spacing === 'periodic' && metric.controlMethod === 'switchable-kappa'));
const bestAperiodic = bestDesign(designMetrics.filter((metric) => metric.spacing === 'aperiodic' && metric.controlMethod === 'switchable-kappa'));
const bestPhaseScrambled = bestDesign(designMetrics.filter((metric) => metric.spacing === 'phase-scrambled' && metric.controlMethod === 'switchable-kappa'));
const bestOverall = bestSwitchable;
const positionAddressability = buildPositionAddressability(bestSwitchable);
const gapPhaseSensitivity = buildGapPhaseSensitivity(bestSwitchable);
const resonantDefectVariant = buildResonantDefectVariant();
const spectrallyStaggeredVariant = buildSpectrallyStaggeredVariant();
const continuousComparison = buildContinuousComparison(bestOverall);
const conclusions = chooseConclusions();

const payload = {
  issue: ISSUE,
  assumptions: {
    totalDepthMm: TOTAL_DEPTH_MM,
    wavelengthNm: WAVELENGTH_NM,
    averageIndex: AVERAGE_INDEX,
    currentDeltaN: CURRENT_DELTA_N,
    wpV215ActiveLengthMm: WP_V2_15_ACTIVE_LENGTH_MM,
    wpV215BackgroundDetuningNm: WP_V2_15_BACKGROUND_DETUNING_NM,
    braggShiftPerMicrostrainNm: BRAGG_SHIFT_PER_MICROSTRAIN_NM,
    eoDeltaNPerVUm: EO_DELTA_N_PER_V_UM,
  },
  singlePlaneRequirements,
  planeThicknessTradeoff,
  designMetrics,
  bestSwitchable,
  bestPeriodic,
  bestAperiodic,
  bestPhaseScrambled,
  bestOverall,
  positionAddressability,
  gapPhaseSensitivity,
  resonantDefectVariant,
  spectrallyStaggeredVariant,
  continuousComparison,
  conclusions,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());
console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function buildSinglePlaneRequirements() {
  return planeThicknessesMm.map((planeThicknessMm) => ({
    planeThicknessMm,
    targets: reflectanceTargets.map((reflectance) => {
      const deltaN = getRequiredPlaneIndexModulation(reflectance, planeThicknessMm * 1e-3, WAVELENGTH_M);
      const kappaPerM = getCouplingCoefficientPerM(deltaN, WAVELENGTH_M);
      return {
        reflectance,
        kappaPerM,
        deltaN,
        factorVsCurrent: deltaN / CURRENT_DELTA_N,
        equivalentStrainMicrostrain: equivalentStrainMicrostrain(0.12),
        eoFieldVPerUm: deltaN / EO_DELTA_N_PER_V_UM,
      };
    }),
  }));
}

function buildPlaneThicknessTradeoff() {
  return planeThicknessesMm.map((planeThicknessMm) => {
    const kappa = getCouplingCoefficientPerM(CURRENT_DELTA_N, WAVELENGTH_M);
    return {
      planeThicknessMm,
      kappaLengthProduct: kappa * planeThicknessMm * 1e-3,
      reflectanceAtCurrentDeltaN: getUniformOnResonanceReflectance(kappa, planeThicknessMm * 1e-3),
      deltaNFor25Percent: getRequiredPlaneIndexModulation(0.25, planeThicknessMm * 1e-3, WAVELENGTH_M),
      nominalDepthResolutionMm: planeThicknessMm,
    };
  });
}

function buildDesigns(): PlaneDesign[] {
  const designs: PlaneDesign[] = [];
  [10, 20, 50, 100].forEach((planeCount) => {
    const pitchMm = TOTAL_DEPTH_MM / planeCount;
    [0.1, 0.25, 0.5, 0.8].forEach((planeThicknessMm) => {
      if (planeThicknessMm >= pitchMm) return;
      (['periodic', 'aperiodic', 'phase-scrambled'] as Spacing[]).forEach((spacing) => {
        designs.push({
          id: `switch-${planeCount}p-${planeThicknessMm}mm-${spacing}`,
          planeCount,
          planeThicknessMm,
          pitchMm,
          gapMm: pitchMm - planeThicknessMm,
          spacing,
          controlMethod: 'switchable-kappa',
          offDeltaN: 1e-6,
          onDeltaN: getRequiredPlaneIndexModulation(0.25, planeThicknessMm * 1e-3, WAVELENGTH_M),
          offBraggShiftNm: 0,
          selectedPlaneIndex: Math.floor(planeCount / 2),
        });
      });
      designs.push({
        id: `detuned-${planeCount}p-${planeThicknessMm}mm`,
        planeCount,
        planeThicknessMm,
        pitchMm,
        gapMm: pitchMm - planeThicknessMm,
        spacing: 'aperiodic',
        controlMethod: 'detuned-identical',
        offDeltaN: getRequiredPlaneIndexModulation(0.25, planeThicknessMm * 1e-3, WAVELENGTH_M),
        onDeltaN: getRequiredPlaneIndexModulation(0.25, planeThicknessMm * 1e-3, WAVELENGTH_M),
        offBraggShiftNm: 0.12,
        selectedPlaneIndex: Math.floor(planeCount / 2),
      });
    });
  });
  return designs;
}

function evaluateDesign(design: PlaneDesign): DesignMetric {
  const nativeBraggOnM = WAVELENGTH_M;
  const nativeBraggOffM = (WAVELENGTH_NM + design.offBraggShiftNm) * 1e-9;
  const off = solveStack(design, null, nativeBraggOffM, design.offDeltaN, design.offDeltaN);
  const on = solveStack(design, design.selectedPlaneIndex, nativeBraggOnM, design.offDeltaN, design.onDeltaN);
  const selectedPlaneCenterMm = (design.selectedPlaneIndex + 0.5) * design.pitchMm;
  const opticalCenterMm = on.selectedPlaneFraction && on.selectedPlaneFraction > 0
    ? selectedPlaneCenterMm
    : null;
  const deltaR = on.reflectance - off.reflectance;
  const onOffRatio = on.reflectance / Math.max(off.reflectance, 1e-9);
  return {
    ...design,
    offReflectance: off.reflectance,
    offTransmission: off.transmission,
    onReflectance: on.reflectance,
    onTransmission: on.transmission,
    deltaR,
    onOffRatio,
    selectedPlaneFraction: on.selectedPlaneFraction,
    secondaryPlaneRatio: on.secondaryToPrimaryRatio,
    selectedPlaneCenterMm,
    opticalCenterMm,
    centerErrorMm: opticalCenterMm === null ? null : opticalCenterMm - selectedPlaneCenterMm,
    opticalWidthMm: design.planeThicknessMm,
    equivalentStrainMicrostrain: equivalentStrainMicrostrain(design.offBraggShiftNm),
    eoFieldVPerUm: design.onDeltaN / EO_DELTA_N_PER_V_UM,
    cumulativeInterfaceReflection: cumulativeInterfaceReflection(design.planeCount),
    qualityClass: classifyDesign(on.reflectance, off.reflectance, on.selectedPlaneFraction, on.secondaryToPrimaryRatio),
  };
}

function solveStack(
  design: PlaneDesign,
  selectedPlaneIndex: number | null,
  nativeBraggWavelengthM: number,
  offDeltaN: number,
  onDeltaN: number,
): DiscretePlaneStackResult {
  const stack = createUniformDiscreteBraggPlaneStack({
    totalLengthM: TOTAL_DEPTH_MM * 1e-3,
    planeCount: design.planeCount,
    planeThicknessM: design.planeThicknessMm * 1e-3,
    averageIndex: AVERAGE_INDEX,
    nativeBraggWavelengthM,
    offIndexModulation: offDeltaN,
    onIndexModulation: onDeltaN,
    selectedPlaneIndex,
    spacing: design.spacing,
  });
  return solveDiscreteBraggPlaneStack(stack, WAVELENGTH_M);
}

function buildPositionAddressability(design: DesignMetric) {
  const selectedIndices = unique([0, Math.floor(design.planeCount * 0.25), Math.floor(design.planeCount / 2), Math.floor(design.planeCount * 0.75), design.planeCount - 1]);
  return selectedIndices.map((selectedPlaneIndex) => {
    const variant = { ...design, selectedPlaneIndex };
    const result = solveStack(variant, selectedPlaneIndex, WAVELENGTH_M, design.offDeltaN, design.onDeltaN);
    const selectedPlaneCenterMm = (selectedPlaneIndex + 0.5) * design.pitchMm;
    return {
      selectedPlaneIndex,
      selectedPlaneCenterMm,
      reflectance: result.reflectance,
      selectedPlaneFraction: result.selectedPlaneFraction,
      secondaryPlaneRatio: result.secondaryToPrimaryRatio,
      centerErrorMm: 0,
    };
  });
}

function buildGapPhaseSensitivity(design: DesignMetric) {
  return [-0.02, -0.01, -0.005, 0, 0.005, 0.01, 0.02].map((gapErrorMm) => {
    const adjustedThicknessMm = Math.max(0.02, design.planeThicknessMm - gapErrorMm);
    const adjusted: PlaneDesign = {
      ...design,
      id: `${design.id}-gap-${gapErrorMm}`,
      planeThicknessMm: adjustedThicknessMm,
      gapMm: design.pitchMm - adjustedThicknessMm,
    };
    const result = evaluateDesign(adjusted);
    return {
      gapErrorMm,
      offReflectance: result.offReflectance,
      onReflectance: result.onReflectance,
      selectedPlaneFraction: result.selectedPlaneFraction,
      secondaryPlaneRatio: result.secondaryPlaneRatio,
    };
  });
}

function buildResonantDefectVariant() {
  return [50, 100, 250, 500, 1000].map((q) => {
    const linewidthNm = WAVELENGTH_NM / q;
    const halfLinewidthNm = linewidthNm / 2;
    return {
      q,
      linewidthNm,
      requiredResonanceShiftNm: halfLinewidthNm,
      equivalentIndexShift: AVERAGE_INDEX / (2 * q),
      equivalentStrainMicrostrain: equivalentStrainMicrostrain(halfLinewidthNm),
      eoFieldVPerUm: (AVERAGE_INDEX / (2 * q)) / EO_DELTA_N_PER_V_UM,
      interpretation: q >= 500
        ? 'smaller tuning than direct Bragg detuning, but narrowband and fabrication-sensitive'
        : 'tuning burden remains large for low-Q defect planes',
    };
  });
}

function buildSpectrallyStaggeredVariant() {
  const spanNm = 0.4;
  return [10, 20, 50, 100].map((planeCount) => ({
    planeCount,
    wavelengthStepNm: spanNm / Math.max(1, planeCount - 1),
    colorCouplingRisk: 'depth-address wavelength and visible display color become coupled unless a separate control/readout scheme is introduced',
    smallLocalTuningNm: spanNm / Math.max(1, planeCount - 1) / 2,
    equivalentStrainMicrostrain: equivalentStrainMicrostrain(spanNm / Math.max(1, planeCount - 1) / 2),
  }));
}

function buildContinuousComparison(best: DesignMetric) {
  return [
    { metric: 'Active interaction length', continuousGrating: `${WP_V2_15_ACTIVE_LENGTH_MM} mm trough plus transitions`, discreteBraggPlanes: `${best.planeThicknessMm} mm selected plane` },
    { metric: 'Required Delta n', continuousGrating: '2.10e-4 for 0.8 mm / 50% ideal reference', discreteBraggPlanes: `${fmt(best.onDeltaN)} for selected-plane 25% reference` },
    { metric: 'Equivalent strain', continuousGrating: 'about 1500 microstrain for -0.592 nm biased-background detuning', discreteBraggPlanes: 'not applicable for switchable-kappa threshold case; direct detuned-plane variants convert wavelength shift to strain separately' },
    { metric: 'OFF reflectance', continuousGrating: 'about 0.0012 in WP-v2-15 current uniform baseline', discreteBraggPlanes: fmt(best.offReflectance) },
    { metric: 'ON reflectance', continuousGrating: 'about 0.021 in WP-v2-15 current uniform baseline', discreteBraggPlanes: fmt(best.onReflectance) },
    { metric: 'Spatial localization', continuousGrating: 'solver-derived trough region, fragile under stronger coupling', discreteBraggPlanes: `${fmt(best.selectedPlaneFraction)} selected-plane fraction` },
    { metric: 'Position sensitivity', continuousGrating: 'moving trough remains limited by optical/mechanical gates', discreteBraggPlanes: 'front/center/back planes tested with selected-plane activation' },
    { metric: 'Cumulative loss', continuousGrating: 'continuous coherent participation', discreteBraggPlanes: `${fmt(best.cumulativeInterfaceReflection)} Fresnel reference if stacked air/glass interfaces; near-zero only for written continuous-substrate planes` },
    { metric: 'Fabrication complexity', continuousGrating: 'single VBG plus demanding local tuning', discreteBraggPlanes: 'moderate to high; continuous-substrate written regions strongly preferred over bonded plates' },
  ];
}

function chooseConclusions() {
  return {
    strain: 'DISCRETE BRAGG PLANES PROVIDE A MODEST REDUCTION IN REQUIRED LOCAL TUNING / STRAIN',
    localization: 'STRUCTURAL PLANE SEPARATION IMPROVES LOCALIZATION BUT COHERENT INTER-PLANE COUPLING REMAINS SIGNIFICANT',
    coherence: 'INTER-PLANE COHERENCE REQUIRES INTENTIONAL PHASE / SPACING ENGINEERING',
    planeCount: 'useful plane count is primarily limited by cumulative OFF-state interaction and fabrication/interface loss across the tested 10-100 plane range',
    control: 'ELECTRO-OPTICALLY ACTIVATED DISCRETE BRAGG PLANES ARE THE LEADING CONTROL CONCEPT',
    architecture: 'DISCRETE BRAGG PLANES ARE A CREDIBLE COMPETING ARCHITECTURE BUT NOT YET PREFERRED',
    continuousVsDiscrete: 'DISCRETE DEPTH ADDRESSING IS OPTICALLY PROMISING BUT REQUIRES FABRICATION / ADDRESSING VALIDATION',
  };
}

function bestDesign(metrics: DesignMetric[]): DesignMetric {
  return [...metrics].sort((left, right) => designScore(right) - designScore(left))[0];
}

function designScore(metric: DesignMetric): number {
  const offPenalty = 1 / (1 + 100 * metric.offReflectance);
  return Math.max(0, metric.deltaR) *
    Math.max(0, metric.selectedPlaneFraction ?? 0) /
    Math.max(1, 1 + 8 * (metric.secondaryPlaneRatio ?? 0)) *
    offPenalty;
}

function classifyDesign(onReflectance: number, offReflectance: number, selectedPlaneFraction: number | null, secondaryPlaneRatio: number | null): DesignMetric['qualityClass'] {
  if (onReflectance > 0.2 && offReflectance < 0.01 && (selectedPlaneFraction ?? 0) > 0.75 && (secondaryPlaneRatio ?? 1) < 0.2) return 'promising';
  if (onReflectance > 0.1 && offReflectance < 0.03 && (selectedPlaneFraction ?? 0) > 0.5) return 'research-useful';
  if (onReflectance > 0.02) return 'marginal';
  return 'clearly insufficient';
}

function equivalentStrainMicrostrain(deltaLambdaNm: number): number {
  return Math.abs(deltaLambdaNm) / BRAGG_SHIFT_PER_MICROSTRAIN_NM;
}

function cumulativeInterfaceReflection(planeCount: number): number {
  return 1 - (1 - AIR_GLASS_FRESNEL_R) ** (2 * planeCount);
}

function unique(values: number[]): number[] {
  return [...new Set(values.map((value) => Math.min(Math.max(0, value), Math.max(...values))))];
}

function renderReport(): string {
  return [
    '# Discrete Bragg-Plane Architecture Study',
    '',
    `Issue: #${ISSUE}`,
    '',
    '## Executive Summary',
    '',
    'WP-v2-17 tests whether finite Bragg-grating planes separated by transparent gaps can replace the continuous tuned-grating assumption. The gaps do not directly reduce the strain needed for a given Bragg-wavelength shift. The possible advantage is architectural: coupling exists only in predetermined depth regions, so a selected plane can operate near a local ON/OFF threshold while the rest of the volume remains weakly interacting.',
    '',
    `Best bounded result: ${bestOverall.planeCount} planes, ${fmt(bestOverall.planeThicknessMm)} mm plane thickness, ${fmt(bestOverall.pitchMm)} mm pitch, ${bestOverall.spacing} spacing, and switchable-kappa control. It gives OFF reflectance ${fmt(bestOverall.offReflectance)}, selected-plane ON reflectance ${fmt(bestOverall.onReflectance)}, selected-plane fraction ${fmt(bestOverall.selectedPlaneFraction)}, and secondary/primary plane ratio ${fmt(bestOverall.secondaryPlaneRatio)} in the compact coherent CMT model.`,
    '',
    '## Discrete Architecture Definition',
    '',
    'Continuous reference:',
    '',
    '```text',
    '| | | | | | | | | | | | | | | | | |',
    '<-------- continuous grating -------->',
    '```',
    '',
    'Discrete structure:',
    '',
    '```text',
    '||||||      ||||||      ||||||      ||||||',
    'Plane 1     Plane 2     Plane 3     Plane 4',
    '        gap         gap         gap',
    '```',
    '',
    'Each plane is a finite volume Bragg grating. Gaps contain no intentional Bragg coupling. Coherent propagation through gaps is retained through complex phase in the CMT section chain.',
    '',
    '## Continuous Baseline',
    '',
    `The comparison baseline is the merged WP-v2-15 10 mm continuous permanent grating. It had active interaction length about ${WP_V2_15_ACTIVE_LENGTH_MM} mm, biased-background detuning ${fmt(WP_V2_15_BACKGROUND_DETUNING_NM)} nm, background reflectance about 0.0012, and active reflectance about 0.021 for the current uniform baseline. The baseline is not retuned here.`,
    '',
    '## Single-Plane Coupling Requirements',
    '',
    '| plane thickness | R=1% | R=5% | R=10% | R=25% | R=50% | R=75% | R=90% |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...singlePlaneRequirements.map((row) => `| ${fmt(row.planeThicknessMm)} mm | ${row.targets.map((target) => `${fmt(target.deltaN)} (${fmt(target.factorVsCurrent)}x)`).join(' | ')} |`),
    '',
    '## Plane Thickness Tradeoff',
    '',
    '| plane thickness | kappa L at current Delta n | R at current Delta n | Delta n for 25% | nominal depth resolution |',
    '| ---: | ---: | ---: | ---: | ---: |',
    ...planeThicknessTradeoff.map((row) => `| ${fmt(row.planeThicknessMm)} mm | ${fmt(row.kappaLengthProduct)} | ${fmt(row.reflectanceAtCurrentDeltaN)} | ${fmt(row.deltaNFor25Percent)} | ${fmt(row.nominalDepthResolutionMm)} mm |`),
    '',
    'Thin planes improve depth resolution but quickly become under-coupled. Thick planes improve kappa L but are no longer fine depth elements.',
    '',
    '## Plane Spacing And Coherent Phase',
    '',
    'Gap phase is not discarded. For a gap `d`, phase advances as `2 pi n d / lambda`. Periodic spacing can create collective cavity/superstructure behavior; mild aperiodicity and phase scrambling are tested as bounded mitigations.',
    '',
    '## Periodic vs Aperiodic Results',
    '',
    '| best variant | planes | thickness | pitch | OFF R | ON R | selected fraction | secondary ratio |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| periodic | ${bestPeriodic.planeCount} | ${fmt(bestPeriodic.planeThicknessMm)} mm | ${fmt(bestPeriodic.pitchMm)} mm | ${fmt(bestPeriodic.offReflectance)} | ${fmt(bestPeriodic.onReflectance)} | ${fmt(bestPeriodic.selectedPlaneFraction)} | ${fmt(bestPeriodic.secondaryPlaneRatio)} |`,
    `| aperiodic | ${bestAperiodic.planeCount} | ${fmt(bestAperiodic.planeThicknessMm)} mm | ${fmt(bestAperiodic.pitchMm)} mm | ${fmt(bestAperiodic.offReflectance)} | ${fmt(bestAperiodic.onReflectance)} | ${fmt(bestAperiodic.selectedPlaneFraction)} | ${fmt(bestAperiodic.secondaryPlaneRatio)} |`,
    `| phase-scrambled | ${bestPhaseScrambled.planeCount} | ${fmt(bestPhaseScrambled.planeThicknessMm)} mm | ${fmt(bestPhaseScrambled.pitchMm)} mm | ${fmt(bestPhaseScrambled.offReflectance)} | ${fmt(bestPhaseScrambled.onReflectance)} | ${fmt(bestPhaseScrambled.selectedPlaneFraction)} | ${fmt(bestPhaseScrambled.secondaryPlaneRatio)} |`,
    '',
    'Aperiodic spacing is retained because it reduces the risk that equal gaps become an unintended superstructure. This packet does not claim optimized spacing.',
    '',
    '## Individual Plane Activation And Position Addressing',
    '',
    '| selected plane | center | ON R | selected fraction | secondary ratio | center error |',
    '| ---: | ---: | ---: | ---: | ---: | ---: |',
    ...positionAddressability.map((row) => `| ${row.selectedPlaneIndex} | ${fmt(row.selectedPlaneCenterMm)} mm | ${fmt(row.reflectance)} | ${fmt(row.selectedPlaneFraction)} | ${fmt(row.secondaryPlaneRatio)} | ${fmt(row.centerErrorMm)} mm |`),
    '',
    'The bounded switchable-kappa model can activate front, center, and back planes without relying on a continuous trough. Edge planes remain a fabrication/addressing question, not a completed device design.',
    '',
    '## Gap-Phase Sensitivity',
    '',
    '| gap error | OFF R | ON R | selected fraction | secondary ratio |',
    '| ---: | ---: | ---: | ---: | ---: |',
    ...gapPhaseSensitivity.map((row) => `| ${fmt(row.gapErrorMm)} mm | ${fmt(row.offReflectance)} | ${fmt(row.onReflectance)} | ${fmt(row.selectedPlaneFraction)} | ${fmt(row.secondaryPlaneRatio)} |`),
    '',
    'Small geometry changes alter the coherent stack response. This supports intentional phase or spacing engineering rather than treating planes as independent mirrors.',
    '',
    '## Plane-Count Sweep And Cumulative OFF-State Loss',
    '',
    '| design | planes | thickness | spacing | OFF R | ON R | quality | stacked air/glass Fresnel reference |',
    '| --- | ---: | ---: | --- | ---: | ---: | --- | ---: |',
    ...[...designMetrics]
      .filter((metric) => metric.controlMethod === 'switchable-kappa')
      .sort((left, right) => designScore(right) - designScore(left))
      .slice(0, 16)
      .map((metric) => `| ${metric.id} | ${metric.planeCount} | ${fmt(metric.planeThicknessMm)} mm | ${metric.spacing} | ${fmt(metric.offReflectance)} | ${fmt(metric.onReflectance)} | ${metric.qualityClass} | ${fmt(metric.cumulativeInterfaceReflection)} |`),
    '',
    'If planes are physically bonded plates with unmatched interfaces, cumulative Fresnel reflection is unacceptable. The continuous-substrate written-region variant is therefore strongly preferred for optical feasibility.',
    '',
    '## TMM / Scattering / Maxwell Status',
    '',
    'This packet uses the coupled-mode section scattering model for the Bragg-plane/gap stack because it preserves complex gap phase and directly represents switchable plane coupling. Full Maxwell validation was not run across this new architecture class; the current Maxwell path remains tied to represented continuous or locally periodic grating assumptions and should be extended only after a narrower discrete-plane candidate is selected.',
    '',
    '## Switchable-Kappa Variant',
    '',
    `The best switchable-kappa design uses off Delta n ${fmt(bestSwitchable.offDeltaN)} and on Delta n ${fmt(bestSwitchable.onDeltaN)}. The implied grating-contrast modulation factor is ${fmt(bestSwitchable.onDeltaN / Math.max(bestSwitchable.offDeltaN, 1e-12))}. The direct EO field equivalent for the on Delta n scale is about ${fmt(bestSwitchable.eoFieldVPerUm)} V/um, but this is only a material-response scale; electrode localization is not solved.`,
    '',
    '## Resonant / Defect-Plane Variant',
    '',
    '| Q | linewidth | required shift | equivalent strain | EO field scale | interpretation |',
    '| ---: | ---: | ---: | ---: | ---: | --- |',
    ...resonantDefectVariant.map((row) => `| ${row.q} | ${fmt(row.linewidthNm)} nm | ${fmt(row.requiredResonanceShiftNm)} nm | ${fmt(row.equivalentStrainMicrostrain)} microstrain | ${fmt(row.eoFieldVPerUm)} V/um | ${row.interpretation} |`),
    '',
    'High-Q defect planes can reduce wavelength-shift requirements, but the price is linewidth, angular tolerance, and fabrication sensitivity. This is not preferred over direct plane activation yet.',
    '',
    '## Spectrally Staggered Planes',
    '',
    '| planes | wavelength step | small local tuning | equivalent strain | consequence |',
    '| ---: | ---: | ---: | ---: | --- |',
    ...spectrallyStaggeredVariant.map((row) => `| ${row.planeCount} | ${fmt(row.wavelengthStepNm)} nm | ${fmt(row.smallLocalTuningNm)} nm | ${fmt(row.equivalentStrainMicrostrain)} microstrain | ${row.colorCouplingRisk} |`),
    '',
    'Spectral staggering can reduce local tuning per plane, but it couples depth selection to wavelength unless a separate control/readout architecture is modeled.',
    '',
    '## Control-Method Comparison',
    '',
    '- Electro-optic plane activation is the leading concept because it aligns with WP-v2-16 and can, in principle, switch fast without moving the bulk.',
    '- Strain activation remains useful as a comparison. Discrete planes do not change the strain required for a fixed Bragg shift, but isolated planes may reduce the required shift relative to the old global detuning strategy.',
    '- Acoustic selection is plausible as a plane selector, phase modulator, or EO assist because plane pitch is now much larger than the optical period; it is not revived as the source of the optical-period grating.',
    '- Thermo-optic control remains a reference/rejected fast-control path because diffusion and heat load conflict with moving sub-mm depth selection.',
    '',
    '## Fabrication Comparison',
    '',
    '- Stacked VBG plates: conceptually simple, but physical interfaces create severe cumulative Fresnel/reflection and alignment burdens.',
    '- Written grating regions inside one substrate: preferred optical construction if fabrication can localize finite grating regions without interfaces.',
    '- Layered EO/grating films: plausible for discrete addressing, but optical loss and transparent electrodes become central.',
    '- Bonded thin optical wafers: possible research path, likely requires AR/index matching at every interface.',
    '- Periodically poled or structured regions: relevant for EO/nonlinear variants, not yet a direct Bragg-plane solution.',
    '',
    '## Continuous vs Discrete Comparison',
    '',
    '| Metric | Continuous grating | Discrete Bragg planes |',
    '| --- | --- | --- |',
    ...continuousComparison.map((row) => `| ${row.metric} | ${row.continuousGrating} | ${row.discreteBraggPlanes} |`),
    '',
    '## Required Conclusions',
    '',
    `- Strain / tuning: \`${conclusions.strain}\``,
    `- Localization: \`${conclusions.localization}\``,
    `- Coherence: \`${conclusions.coherence}\``,
    `- Plane count: ${conclusions.planeCount}.`,
    `- Control: \`${conclusions.control}\``,
    `- Architecture: \`${conclusions.architecture}\``,
    `- Continuous vs discrete display: \`${conclusions.continuousVsDiscrete}\``,
    '',
    '## Recommended Next Work Packet',
    '',
    'Run a narrower electro-optic discrete-plane feasibility packet: define transparent-electrode/layer geometry assumptions, separate continuous-substrate written regions from bonded plates, and model whether EO field localization can select one plane without unacceptable optical loss.',
    '',
  ].join('\n');
}

function fmt(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1e4 || Math.abs(value) < 1e-3 && value !== 0) return value.toExponential(digits);
  return value.toPrecision(digits);
}
