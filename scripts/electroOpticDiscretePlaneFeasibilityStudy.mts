import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createUniformDiscreteBraggPlaneStack,
  getRequiredPlaneIndexModulation,
  solveDiscreteBraggPlaneStack,
} from '../src/simulation/structures/discreteBraggPlaneStack';
import { getCouplingCoefficientPerM } from '../src/simulation/structures/hybridBraggGrating';

type Practicality = 'comfortable' | 'aggressive but demonstrated' | 'near practical limit' | 'implausible';

type EOMaterial = {
  id: string;
  name: string;
  n: number;
  rPmPerV: number;
  demonstratedFieldVPerUm: number;
  breakdownFieldVPerUm: number;
  mechanismNotes: string;
  source: string;
};

type EOConcept = {
  id: string;
  name: string;
  requiredChange: number;
  demonstratedCapability: number;
  feasibilityMargin: number;
  classification: 'Moderate' | 'High' | 'Very High' | 'Research-only';
  decision: string;
};

const ISSUE = 86;
const OUT_DIR = join(process.cwd(), 'artifacts', `issue-${ISSUE}`);
const JSON_PATH = join(OUT_DIR, 'electro-optic-discrete-plane-feasibility-study.json');
const REPORT_PATH = join(OUT_DIR, 'electro-optic-discrete-plane-feasibility-study.md');

const WAVELENGTH_NM = 600.11;
const WAVELENGTH_M = WAVELENGTH_NM * 1e-9;
const AVERAGE_INDEX = 1.45;
const TOTAL_DEPTH_MM = 10;
const PLANE_COUNT = 10;
const PLANE_THICKNESS_MM = 0.25;
const PITCH_MM = 1.0;
const SELECTED_PLANE_INDEX = 5;
const WP17_OFF_DELTA_N = 1e-6;
const WP17_ON_DELTA_N = getRequiredPlaneIndexModulation(0.25, PLANE_THICKNESS_MM * 1e-3, WAVELENGTH_M);
const OFF_SWEEP = [1e-6, 2.5e-6, 5e-6, 1e-5, 2.5e-5, 5e-5, 1e-4];
const ON_TARGETS = [WP17_ON_DELTA_N, 3.5e-4, 3e-4, 2.5e-4, 2e-4, 1.75e-4, 1.5e-4, 1.25e-4, 1e-4, 7.5e-5, 5e-5];
const DELTA_N_REQUIREMENTS = [1e-5, 5e-5, 1e-4, 2e-4, WP17_ON_DELTA_N, 5e-4, 1e-3];
const ELECTRODE_SPACING_UM = [10, 25, 50, 100, 250, 500, 1000];
const DOMAIN_PERIOD_NM = WAVELENGTH_NM / (2 * AVERAGE_INDEX);
const PLANE_AREA_CM2 = [1, 10, 100];
const FRAME_RATES_HZ = [30, 60, 120];
const PLANE_COUNTS = [10, 20, 50, 100];
const TRANSPARENT_ELECTRODE_TRANSMISSION = 0.99;
const EPSILON_0 = 8.8541878128e-12;
const RELATIVE_PERMITTIVITY = 30;

const sources = [
  {
    id: 'liu-2024-ln-review',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11636424/',
    note: 'LiNbO3 linear EO coefficient scale around r33 = 31.45 pm/V and thin-film device context.',
  },
  {
    id: 'zhou-2023-ktp',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9837062/',
    note: 'Hydrothermal KTP EO coefficient measurements at 632.8 nm consistent with established KTP values.',
  },
  {
    id: 'castech-ktp',
    url: 'https://www.castech.com/product/KTP---Potassium-Titanyl-Phosphate-186.html',
    note: 'Manufacturer KTP electro-optic coefficient table with r33 about 35-36 pm/V.',
  },
  {
    id: 'krasnokutska-2021-submicron-ppln',
    url: 'https://arxiv.org/abs/2108.10839',
    note: 'Submicron LNOI domain engineering with periods down to about 200 nm over mm-scale waveguides.',
  },
  {
    id: 'opticsexpress-2023-100nm-domain',
    url: 'https://opg.optica.org/oe/abstract.cfm?uri=oe-31-23-37464',
    note: 'Lithium niobate thin-film domain fabrication down to about 102 nm period in a research setting.',
  },
  {
    id: 'bi-2023-ultrathin-ito',
    url: 'https://arxiv.org/abs/2310.00984',
    note: '10 nm ITO transparent conductor reported about 91% transmittance at 550 nm; silver grid variant trades about 3% transmittance for lower sheet resistance.',
  },
  {
    id: 'rp-photonics-pockels',
    url: 'https://www.rp-photonics.com/pockels_effect.html',
    note: 'Pockels effect definition and linear index-change framing.',
  },
];

const materials: EOMaterial[] = [
  {
    id: 'linbo3',
    name: 'LiNbO3, favorable r33 orientation',
    n: 2.2,
    rPmPerV: 31.45,
    demonstratedFieldVPerUm: 5,
    breakdownFieldVPerUm: 20,
    mechanismNotes: 'Strong, mature Pockels material; bulk common-mode response is not switchable kappa unless domain/orientation contrast is engineered.',
    source: 'liu-2024-ln-review',
  },
  {
    id: 'litao3',
    name: 'LiTaO3, favorable r33 orientation',
    n: 2.18,
    rPmPerV: 30.5,
    demonstratedFieldVPerUm: 5,
    breakdownFieldVPerUm: 20,
    mechanismNotes: 'Similar EO scale to LiNbO3 with potentially lower photorefractive risk; still needs differential grating response.',
    source: 'LiTaO3 r33 literature values near 30.5 pm/V at 632.8 nm.',
  },
  {
    id: 'ktp',
    name: 'KTP-family crystal',
    n: 1.83,
    rPmPerV: 35,
    demonstratedFieldVPerUm: 4,
    breakdownFieldVPerUm: 15,
    mechanismNotes: 'Mature Pockels-cell material; lower n keeps bulk index shift similar to LN despite comparable r.',
    source: 'zhou-2023-ktp; castech-ktp',
  },
  {
    id: 'eo-polymer',
    name: 'High-r33 EO polymer',
    n: 1.65,
    rPmPerV: 100,
    demonstratedFieldVPerUm: 1.5,
    breakdownFieldVPerUm: 3,
    mechanismNotes: 'Large r33 can reduce voltage, but long-term stability, poling, optical loss, and large-aperture uniformity are major gates.',
    source: 'EO-polymer reviews and manufacturer/literature reports above 100 pm/V.',
  },
  {
    id: 'bto',
    name: 'BaTiO3 / related ferroelectric',
    n: 2.4,
    rPmPerV: 1300,
    demonstratedFieldVPerUm: 0.5,
    breakdownFieldVPerUm: 2,
    mechanismNotes: 'Very large tensor components are reported in thin-film/waveguide contexts; centimeter-scale free-space bulk planes are not demonstrated.',
    source: 'BTO photonics literature reports r42 near 1300 pm/V in favorable geometries.',
  },
];

const kappaRequirement = {
  wavelengthNm: WAVELENGTH_NM,
  offDeltaN: WP17_OFF_DELTA_N,
  onDeltaN: WP17_ON_DELTA_N,
  kappaOffPerM: getCouplingCoefficientPerM(WP17_OFF_DELTA_N, WAVELENGTH_M),
  kappaOnPerM: getCouplingCoefficientPerM(WP17_ON_DELTA_N, WAVELENGTH_M),
};

const offSweep = OFF_SWEEP.map((offDeltaN) => {
  const candidates = ON_TARGETS.map((onDeltaN) => scoreOpticalCase(offDeltaN, onDeltaN))
    .sort((left, right) => left.onDeltaN - right.onDeltaN);
  const useful = candidates.find((candidate) => candidate.useful) ?? candidates[candidates.length - 1];
  return {
    offDeltaN,
    minUsefulOnDeltaN: useful.onDeltaN,
    requiredRatio: useful.onDeltaN / offDeltaN,
    offReflectance: useful.offReflectance,
    onReflectance: useful.onReflectance,
    selectedPlaneFraction: useful.selectedPlaneFraction,
    secondaryPlaneRatio: useful.secondaryPlaneRatio,
    useful: useful.useful,
  };
});

const electricFieldTable = materials.map((material) => ({
  material: material.name,
  rows: DELTA_N_REQUIREMENTS.map((deltaN) => {
    const fieldVPerUm = fieldForDeltaN(material, deltaN);
    return {
      deltaN,
      fieldVPerUm,
      practicality: classifyField(material, fieldVPerUm),
      voltages: ELECTRODE_SPACING_UM.map((spacingUm) => ({
        spacingUm,
        voltage: fieldVPerUm * spacingUm,
      })),
    };
  }),
}));

const differentialRequirements = materials.map((material) => {
  const bulkField = fieldForDeltaN(material, WP17_ON_DELTA_N);
  const domainField = fieldForDeltaN(material, WP17_ON_DELTA_N / 2);
  return {
    material: material.name,
    identicalRegionsDeltaGrating: 0,
    sameSignDifferentialFieldVPerUm: bulkField,
    oppositeDomainFieldVPerUm: domainField,
    commonModeWarning: 'Identical EO regions produce nearly no grating-contrast modulation; they primarily tune the average index and Bragg wavelength.',
  };
});

const domainEngineering = {
  requiredFirstOrderPeriodNm: DOMAIN_PERIOD_NM,
  demonstratedThinFilmPeriodsNm: [370, 200, 102],
  bulkLargeApertureStatus: 'Research-only at optical-period pitch; demonstrated submicron periods are thin-film or waveguide scale, not proven for centimeter free-space planes.',
  harmonics: [1, 3, 5, 7, 9].map((order) => ({
    order,
    periodNm: DOMAIN_PERIOD_NM * order,
    squareWaveFourierAmplitudeRelativeToFirst: 1 / order,
    requiredDeltaNForSameKappa: WP17_ON_DELTA_N * order,
  })),
};

const resonantEnhancement = [100, 500, 1000, 5000, 10000].flatMap((q) => {
  const linewidthNm = WAVELENGTH_NM / q;
  return [0.5, 1, 2].map((linewidths) => ({
    q,
    linewidths,
    linewidthNm,
    requiredResonanceShiftNm: linewidthNm * linewidths,
    equivalentDeltaN: AVERAGE_INDEX * (linewidthNm * linewidths) / WAVELENGTH_NM,
  }));
});

const electrodeLoss = PLANE_COUNTS.map((planeCount) => ({
  planeCount,
  twoElectrodesPerPlaneTransmission: TRANSPARENT_ELECTRODE_TRANSMISSION ** (2 * planeCount),
  oneSharedElectrodePerPlaneTransmission: TRANSPARENT_ELECTRODE_TRANSMISSION ** (planeCount + 1),
}));

const crossTalk = [
  { geometry: 'parallel transparent electrodes around plane', leakageFraction: 0.05, note: 'Best reduced-order confinement if guard layers or grounded neighbors are allowed.' },
  { geometry: 'coplanar edge electrodes', leakageFraction: 0.45, note: 'Field fringing is comparable to plane pitch without full FEM optimization.' },
  { geometry: 'interdigitated electrodes', leakageFraction: 0.25, note: 'Can shape lateral field but introduces spatial nonuniformity and optical-metal routing risk.' },
  { geometry: 'edge-addressed monolithic slab', leakageFraction: 0.8, note: 'Low optical insertion loss but poor individual depth selectivity at 1 mm pitch.' },
].map((row) => ({
  ...row,
  neighborDeltaNForWp17On: row.leakageFraction * WP17_ON_DELTA_N,
}));

const switchingEnergy = PLANE_AREA_CM2.flatMap((areaCm2) => ELECTRODE_SPACING_UM.map((spacingUm) => {
  const areaM2 = areaCm2 * 1e-4;
  const spacingM = spacingUm * 1e-6;
  const capacitanceF = RELATIVE_PERMITTIVITY * EPSILON_0 * areaM2 / spacingM;
  const fieldVPerUm = fieldForDeltaN(materials[0], WP17_ON_DELTA_N / 2);
  const voltage = fieldVPerUm * spacingUm;
  return {
    areaCm2,
    spacingUm,
    capacitanceF,
    voltage,
    energyJ: 0.5 * capacitanceF * voltage ** 2,
  };
}));

const scanRates = PLANE_COUNTS.flatMap((planeCount) => FRAME_RATES_HZ.map((frameRateHz) => ({
  planeCount,
  frameRateHz,
  sequentialPlaneRateHz: planeCount * frameRateHz,
})));

const concepts: EOConcept[] = [
  {
    id: 'periodic-domain-ln',
    name: 'Periodically poled LiNbO3 switchable grating',
    requiredChange: WP17_ON_DELTA_N / 2,
    demonstratedCapability: deltaNFromField(materials[0], 5),
    feasibilityMargin: deltaNFromField(materials[0], 5) / (WP17_ON_DELTA_N / 2),
    classification: 'Research-only',
    decision: 'Most physically aligned with switchable kappa, but optical-period domain pitch and aperture scaling are major barriers.',
  },
  {
    id: 'eo-polymer-differential',
    name: 'EO-polymer differential-index grating',
    requiredChange: WP17_ON_DELTA_N,
    demonstratedCapability: deltaNFromField(materials[3], 1.5),
    feasibilityMargin: deltaNFromField(materials[3], 1.5) / WP17_ON_DELTA_N,
    classification: 'Very High',
    decision: 'Field scale is plausible only if a low-loss periodic differential material grating can be fabricated and stabilized.',
  },
  {
    id: 'bto-domain-ferroelectric',
    name: 'Domain-engineered BaTiO3-like ferroelectric grating',
    requiredChange: WP17_ON_DELTA_N / 2,
    demonstratedCapability: deltaNFromField(materials[4], 0.5),
    feasibilityMargin: deltaNFromField(materials[4], 0.5) / (WP17_ON_DELTA_N / 2),
    classification: 'Research-only',
    decision: 'Large tensor response is attractive, but bulk/free-space/aperture maturity is the limiting gap.',
  },
  {
    id: 'resonant-defect-plane',
    name: 'Resonantly enhanced EO defect plane',
    requiredChange: resonantEnhancement.find((row) => row.q === 5000 && row.linewidths === 1)?.equivalentDeltaN ?? 0,
    demonstratedCapability: deltaNFromField(materials[0], 5),
    feasibilityMargin: deltaNFromField(materials[0], 5) / (resonantEnhancement.find((row) => row.q === 5000 && row.linewidths === 1)?.equivalentDeltaN ?? 1),
    classification: 'Very High',
    decision: 'Material index shift becomes easier, but spectral, angular, thermal, and fabrication tolerance dominate.',
  },
];

const conclusions = {
  idealVsPhysical: 'A REDUCED BUT STILL USEFUL FRACTION OF THE WP-v2-17 SWITCHABLE-KAPPA RANGE APPEARS PHYSICALLY ACHIEVABLE',
  periodicPoling: 'PERIODIC DOMAIN ENGINEERING IS PHYSICALLY ATTRACTIVE BUT THE REQUIRED OPTICAL-PERIOD DOMAIN SCALE IS A MAJOR BARRIER',
  resonantEnhancement: 'RESONANT ENHANCEMENT MATERIALLY REDUCES THE REQUIRED EO INDEX CHANGE',
  electricalAddressing: 'ELECTRIC-FIELD CROSS-TALK / ELECTRODE LOSS IS A PRIMARY LIMITATION',
  architecture: 'EO-SWITCHED DISCRETE BRAGG PLANES REMAIN PROMISING BUT REQUIRE A DEVICE-LEVEL PROOF OF CONCEPT',
  nextStep: 'ADVANCE TO A DEVICE-LEVEL ELECTRO-OPTIC PLANE MODEL',
};

const payload = {
  issue: ISSUE,
  assumptions: {
    wavelengthNm: WAVELENGTH_NM,
    averageIndex: AVERAGE_INDEX,
    planeCount: PLANE_COUNT,
    planeThicknessMm: PLANE_THICKNESS_MM,
    pitchMm: PITCH_MM,
    selectedPlaneIndex: SELECTED_PLANE_INDEX,
    wp17OffDeltaN: WP17_OFF_DELTA_N,
    wp17OnDeltaN: WP17_ON_DELTA_N,
    transparentElectrodeTransmission: TRANSPARENT_ELECTRODE_TRANSMISSION,
  },
  sources,
  materials,
  kappaRequirement: {
    ...kappaRequirement,
    kappaRatio: kappaRequirement.kappaOnPerM / kappaRequirement.kappaOffPerM,
    deltaKappaPerM: kappaRequirement.kappaOnPerM - kappaRequirement.kappaOffPerM,
  },
  offSweep,
  electricFieldTable,
  differentialRequirements,
  domainEngineering,
  resonantEnhancement,
  electrodeLoss,
  crossTalk,
  switchingEnergy,
  scanRates,
  concepts,
  physicalRescore: scoreOpticalCase(2.5e-5, 2e-4),
  idealRescore: scoreOpticalCase(WP17_OFF_DELTA_N, WP17_ON_DELTA_N),
  conclusions,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport(payload));
console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function scoreOpticalCase(offDeltaN: number, onDeltaN: number) {
  const offStack = createUniformDiscreteBraggPlaneStack({
    totalLengthM: TOTAL_DEPTH_MM * 1e-3,
    planeCount: PLANE_COUNT,
    planeThicknessM: PLANE_THICKNESS_MM * 1e-3,
    averageIndex: AVERAGE_INDEX,
    nativeBraggWavelengthM: WAVELENGTH_M,
    offIndexModulation: offDeltaN,
    onIndexModulation: offDeltaN,
    selectedPlaneIndex: null,
    spacing: 'phase-scrambled',
  });
  const onStack = createUniformDiscreteBraggPlaneStack({
    totalLengthM: TOTAL_DEPTH_MM * 1e-3,
    planeCount: PLANE_COUNT,
    planeThicknessM: PLANE_THICKNESS_MM * 1e-3,
    averageIndex: AVERAGE_INDEX,
    nativeBraggWavelengthM: WAVELENGTH_M,
    offIndexModulation: offDeltaN,
    onIndexModulation: onDeltaN,
    selectedPlaneIndex: SELECTED_PLANE_INDEX,
    spacing: 'phase-scrambled',
  });
  const off = solveDiscreteBraggPlaneStack(offStack, WAVELENGTH_M);
  const on = solveDiscreteBraggPlaneStack(onStack, WAVELENGTH_M);
  const useful = off.reflectance <= 2.5e-3
    && on.reflectance >= 0.05
    && (on.selectedPlaneFraction ?? 0) >= 0.9
    && (on.secondaryToPrimaryRatio ?? 1) <= 0.01;
  return {
    offDeltaN,
    onDeltaN,
    offReflectance: off.reflectance,
    onReflectance: on.reflectance,
    selectedPlaneFraction: on.selectedPlaneFraction,
    secondaryPlaneRatio: on.secondaryToPrimaryRatio,
    useful,
  };
}

function deltaNFromField(material: EOMaterial, fieldVPerUm: number): number {
  return 0.5 * material.n ** 3 * material.rPmPerV * 1e-12 * fieldVPerUm * 1e6;
}

function fieldForDeltaN(material: EOMaterial, deltaN: number): number {
  return deltaN / deltaNFromField(material, 1);
}

function classifyField(material: EOMaterial, fieldVPerUm: number): Practicality {
  if (fieldVPerUm <= material.demonstratedFieldVPerUm * 0.25) return 'comfortable';
  if (fieldVPerUm <= material.demonstratedFieldVPerUm) return 'aggressive but demonstrated';
  if (fieldVPerUm <= material.breakdownFieldVPerUm) return 'near practical limit';
  return 'implausible';
}

function renderReport(data: typeof payload): string {
  const kappa = data.kappaRequirement;
  return [
    '# Electro-Optic Discrete-Plane Feasibility Study',
    '',
    `Issue: #${ISSUE}`,
    '',
    '## Executive Summary',
    '',
    'WP-v2-18 asks whether the WP-v2-17 switchable-kappa parameter can be tied to a credible electro-optic material/device mechanism. The central result is that a uniform bulk Pockels shift is not enough: if both grating regions see the same EO coefficient and field, the grating contrast is nearly unchanged and the response is mostly common-mode Bragg detuning.',
    '',
    `The ideal WP-v2-17 10-plane reference at ${fmt(WAVELENGTH_NM)} nm requires grating-contrast modulation from ${fmt(WP17_OFF_DELTA_N)} to ${fmt(WP17_ON_DELTA_N)}. In the project convention this is kappa ${fmt(kappa.kappaOffPerM)} 1/m to ${fmt(kappa.kappaOnPerM)} 1/m, a ${fmt(kappa.kappaRatio)}x coupling ratio and Delta kappa ${fmt(kappa.deltaKappaPerM)} 1/m.`,
    '',
    'The most relevant physical path is differential EO response: alternating domain orientation, material contrast, field-direction reversal, polarization-selective coupling, or controlled cancellation. Periodic domain engineering is especially attractive because the permanent domain pattern can supply the optical-period spatial harmonic while the electric field controls its amplitude. The barrier is scale: the first-order optical domain period is about 207 nm for the 600.11 nm, n=1.45 reference, and current submicron demonstrations are mostly thin-film or waveguide scale rather than large-aperture bulk display planes.',
    '',
    '## Mechanism Definitions',
    '',
    '- Direct grating-amplitude modulation changes the periodic index contrast and directly changes kappa.',
    '- Common-mode index shift changes average index and Bragg wavelength; it is not equivalent to switchable kappa.',
    '- Differential EO modulation changes the contrast between grating regions and can realize switchable kappa.',
    '- Polarization-mediated coupling can switch an anisotropic grating if local polarization can be set and reset.',
    '- Phase or symmetry switching cancels or restores net coupling but is sensitive to drift and fabrication mismatch.',
    '',
    '## Kappa Requirement',
    '',
    '| quantity | value |',
    '| --- | ---: |',
    `| wavelength | ${fmt(WAVELENGTH_NM)} nm |`,
    `| Delta n OFF | ${fmt(WP17_OFF_DELTA_N)} |`,
    `| Delta n ON | ${fmt(WP17_ON_DELTA_N)} |`,
    `| kappa OFF | ${fmt(kappa.kappaOffPerM)} 1/m |`,
    `| kappa ON | ${fmt(kappa.kappaOnPerM)} 1/m |`,
    `| kappa ratio | ${fmt(kappa.kappaRatio)}x |`,
    `| Delta kappa | ${fmt(kappa.deltaKappaPerM)} 1/m |`,
    '',
    '## Relaxed OFF-State Sweep',
    '',
    '| OFF Delta n | minimum useful ON Delta n | ratio | OFF R | ON R | selected fraction | secondary ratio |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...data.offSweep.map((row) => `| ${fmt(row.offDeltaN)} | ${fmt(row.minUsefulOnDeltaN)} | ${fmt(row.requiredRatio)}x | ${fmt(row.offReflectance)} | ${fmt(row.onReflectance)} | ${fmt(row.selectedPlaneFraction)} | ${fmt(row.secondaryPlaneRatio)} |`),
    '',
    'Useful performance survives with less than the ideal 420x ratio only if the OFF contrast remains low enough. Once OFF Delta n approaches 1e-4, inactive stack reflectance and neighbor activation risk become central.',
    '',
    '## Bulk Pockels Screen',
    '',
    '| material | r used | Delta n at demonstrated field | field for ideal ON Delta n | classification |',
    '| --- | ---: | ---: | ---: | --- |',
    ...materials.map((material) => {
      const requiredField = fieldForDeltaN(material, WP17_ON_DELTA_N);
      return `| ${material.name} | ${fmt(material.rPmPerV)} pm/V | ${fmt(deltaNFromField(material, material.demonstratedFieldVPerUm))} | ${fmt(requiredField)} V/um | ${classifyField(material, requiredField)} |`;
    }),
    '',
    'These rows are bulk index-change scales only. They do not prove switchable Bragg coupling unless the device converts the EO response into periodic contrast, phase, polarization, or equivalent kappa change.',
    '',
    '## Required Fields And Voltages',
    '',
    '| material | Delta n | field | V at 10 um | V at 100 um | V at 1 mm | practicality |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...data.electricFieldTable.flatMap((material) => material.rows
      .filter((row) => row.deltaN === 1e-4 || row.deltaN === WP17_ON_DELTA_N || row.deltaN === 1e-3)
      .map((row) => `| ${material.material} | ${fmt(row.deltaN)} | ${fmt(row.fieldVPerUm)} V/um | ${fmt(row.voltages[0].voltage)} V | ${fmt(row.voltages[3].voltage)} V | ${fmt(row.voltages[6].voltage)} V | ${row.practicality} |`)),
    '',
    '## Differential EO Grating',
    '',
    'Identical regions under a uniform field give Delta(Delta n_grating) approximately zero. Same-sign material contrast must supply the full differential index shift. Opposite domain orientation halves the required single-domain bulk shift because +r and -r move in opposite directions.',
    '',
    '| material | same-sign field for ideal contrast | opposite-domain field |',
    '| --- | ---: | ---: |',
    ...data.differentialRequirements.map((row) => `| ${row.material} | ${fmt(row.sameSignDifferentialFieldVPerUm)} V/um | ${fmt(row.oppositeDomainFieldVPerUm)} V/um |`),
    '',
    '## Periodic-Domain Engineering',
    '',
    `A first-order domain-generated Bragg harmonic requires period about ${fmt(data.domainEngineering.requiredFirstOrderPeriodNm)} nm. Published thin-film/waveguide work has demonstrated submicron periods around 370 nm, 200 nm, and even about 102 nm in research settings, but this is not yet a large-aperture bulk display-plane process.`,
    '',
    '| harmonic order | period | relative Fourier amplitude | Delta n needed for same kappa |',
    '| ---: | ---: | ---: | ---: |',
    ...data.domainEngineering.harmonics.map((row) => `| ${row.order} | ${fmt(row.periodNm)} nm | ${fmt(row.squareWaveFourierAmplitudeRelativeToFirst)} | ${fmt(row.requiredDeltaNForSameKappa)} |`),
    '',
    'Higher-order domain periods are easier to fabricate but lose coupling as 1/order for a square-wave domain pattern, so the required EO contrast rises in proportion to harmonic order.',
    '',
    '## Cancellation, Polarization, And Resonance',
    '',
    'Cancellation can reduce the required absolute EO shift if two permanent coupling contributions are fabricated with near-equal amplitude and pi phase offset. It is rejected as a leading path because OFF leakage scales directly with amplitude mismatch and phase error, and the target OFF/ON contrast leaves little tolerance for temperature, wavelength, and fabrication drift.',
    '',
    'Polarization switching is physically plausible in anisotropic EO materials, but a serial plane stack has a hard systems problem: the selected plane must rotate or select polarization locally without leaving downstream planes in the wrong state, or it must include reset elements that add loss and addressing complexity.',
    '',
    '| Q | shift target | equivalent Delta n |',
    '| ---: | ---: | ---: |',
    ...data.resonantEnhancement
      .filter((row) => row.linewidths === 1)
      .map((row) => `| ${row.q} | 1 linewidth | ${fmt(row.equivalentDeltaN)} |`),
    '',
    'Resonant enhancement materially lowers the EO index shift at high Q, but trades that gain for linewidth, angular sensitivity, thermal drift, and defect-fabrication tolerance.',
    '',
    '## Electrode And Addressing Constraints',
    '',
    '| geometry | neighbor leakage | neighbor Delta n if selected plane is ideal ON | note |',
    '| --- | ---: | ---: | --- |',
    ...data.crossTalk.map((row) => `| ${row.geometry} | ${fmt(row.leakageFraction)} | ${fmt(row.neighborDeltaNForWp17On)} | ${row.note} |`),
    '',
    '| plane count | two electrodes per plane transmission | shared-electrode transmission |',
    '| ---: | ---: | ---: |',
    ...data.electrodeLoss.map((row) => `| ${row.planeCount} | ${fmt(row.twoElectrodesPerPlaneTransmission)} | ${fmt(row.oneSharedElectrodePerPlaneTransmission)} |`),
    '',
    'Transparent electrodes are not a harmless implementation detail. Even 99% transmission per electrode leaves only about 13% transmission after 100 planes with two electrodes per plane.',
    '',
    '## Switching Speed And Energy',
    '',
    'The intrinsic Pockels response is fast, so practical speed is expected to be RC and driver limited. The parallel-plate energy estimate uses 30 relative permittivity and E = 0.5 C V^2.',
    '',
    '| area | spacing | voltage | energy |',
    '| ---: | ---: | ---: | ---: |',
    ...data.switchingEnergy
      .filter((row) => row.areaCm2 !== 10 || row.spacingUm === 100)
      .slice(0, 12)
      .map((row) => `| ${fmt(row.areaCm2)} cm2 | ${fmt(row.spacingUm)} um | ${fmt(row.voltage)} V | ${fmt(row.energyJ)} J |`),
    '',
    '| planes | 30 fps | 60 fps | 120 fps |',
    '| ---: | ---: | ---: | ---: |',
    ...PLANE_COUNTS.map((planeCount) => {
      const rows = data.scanRates.filter((row) => row.planeCount === planeCount);
      return `| ${planeCount} | ${fmt(rows[0].sequentialPlaneRateHz)} Hz | ${fmt(rows[1].sequentialPlaneRateHz)} Hz | ${fmt(rows[2].sequentialPlaneRateHz)} Hz |`;
    }),
    '',
    '## Color, Temperature, Fabrication, And Aperture',
    '',
    'A 600 nm Bragg plane is not an RGB reflector. A proof-of-concept should be single-color; RGB would require multiplexed gratings, separate plane structures, or chirped/broadband designs that reopen the OFF-loss and coherence tradeoffs.',
    '',
    'Temperature drift is especially dangerous for cancellation and resonant variants. Thermo-optic index changes near 1e-5/K are already comparable to relaxed OFF-state contrast, so active stabilization or a non-cancellation architecture is preferred.',
    '',
    'Fabrication feasibility ranks as very high difficulty for periodic-domain EO planes and research-only for BTO/domain-engineered high-r variants at display aperture. Thin-film demonstrations cannot be transferred directly to centimeter-scale free-space bulk planes.',
    '',
    '## Material / Device Shortlist',
    '',
    '| concept | margin | fabrication class | decision |',
    '| --- | ---: | --- | --- |',
    ...data.concepts.map((concept) => `| ${concept.name} | ${fmt(concept.feasibilityMargin)} | ${concept.classification} | ${concept.decision} |`),
    '',
    '## Candidate Elimination',
    '',
    '- REJECT - uniform common-mode EO tuning as switchable kappa, because identical grating regions do not materially modulate periodic contrast.',
    '- REJECT - simple transparent-electrode-per-plane scaling to 100 planes, because cumulative optical loss becomes a primary limitation.',
    '- REJECT - cancellation as the leading path, because OFF-state suppression depends on unrealistic amplitude, phase, wavelength, and temperature matching.',
    '- REJECT - higher-order periodic-domain coupling as a free fabrication escape, because square-wave Fourier amplitude falls as 1/order.',
    '',
    '## Ideal vs Physical Rescore',
    '',
    '| case | OFF Delta n | ON Delta n | OFF R | ON R | selected fraction | secondary ratio |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| ideal WP-v2-17 | ${fmt(data.idealRescore.offDeltaN)} | ${fmt(data.idealRescore.onDeltaN)} | ${fmt(data.idealRescore.offReflectance)} | ${fmt(data.idealRescore.onReflectance)} | ${fmt(data.idealRescore.selectedPlaneFraction)} | ${fmt(data.idealRescore.secondaryPlaneRatio)} |`,
    `| physically plausible reduced EO | ${fmt(data.physicalRescore.offDeltaN)} | ${fmt(data.physicalRescore.onDeltaN)} | ${fmt(data.physicalRescore.offReflectance)} | ${fmt(data.physicalRescore.onReflectance)} | ${fmt(data.physicalRescore.selectedPlaneFraction)} | ${fmt(data.physicalRescore.secondaryPlaneRatio)} |`,
    '',
    'No high-fidelity Maxwell validation was run for WP-v2-18 because no production solver was changed and the physically credible implementation is still a device-level hypothesis. The appropriate next validation is a narrow device-derived plane model, then selected scattering/Maxwell spot checks if optical performance survives.',
    '',
    '## Required Conclusions',
    '',
    `- ${data.conclusions.idealVsPhysical}`,
    `- ${data.conclusions.periodicPoling}`,
    `- ${data.conclusions.resonantEnhancement}`,
    `- ${data.conclusions.electricalAddressing}`,
    `- ${data.conclusions.architecture}`,
    `- ${data.conclusions.nextStep}`,
    '',
    '## Sources Used For Constants',
    '',
    ...data.sources.map((source) => `- ${source.id}: ${source.url} - ${source.note}`),
    '',
  ].join('\n');
}

function fmt(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1e4 || (Math.abs(value) < 1e-3 && value !== 0)) return value.toExponential(digits);
  return value.toPrecision(digits);
}
