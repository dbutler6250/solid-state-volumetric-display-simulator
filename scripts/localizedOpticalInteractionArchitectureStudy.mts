import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type RequirementClass =
  | 'Hard physical requirement'
  | 'Engineering target'
  | 'Desirable property'
  | 'Unknown / requires decision';

type Qualitative = 'Strong' | 'Moderate' | 'Weak' | 'Unknown';
type CandidateStatus = 'REJECT' | 'SURVIVES' | 'FOLLOW-UP';

type DisplayRequirement = {
  requirement: string;
  classification: RequirementClass;
  currentTarget: string;
  rationale: string;
};

type LiteratureReference = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  doi?: string;
  url: string;
  relevance: string;
};

type ArchitectureFamily = {
  id: string;
  name: string;
  mechanism: string;
  viewingGeometry: string;
  evidenceIds: string[];
  status: CandidateStatus;
  gate: string;
  rationale: string;
};

type FeasibilityCheck = {
  id: string;
  mechanism: string;
  requiredChange: string;
  demonstratedChange: string;
  requiredOverDemonstrated: number | null;
  result: string;
};

type Screening = {
  inactiveTransparency: Qualitative;
  activeInteractionStrength: Qualitative;
  onOffRatio: Qualitative;
  activeRegionThickness: Qualitative;
  addressability: Qualitative;
  expectedSwitchingSpeed: Qualitative;
  requiredControlMagnitude: Qualitative;
  viewingGeometry: Qualitative;
  fabricationComplexity: Qualitative;
  scalability: Qualitative;
  thermalBurden: Qualitative;
  mechanicalBurden: Qualitative;
  coherenceSensitivity: Qualitative;
  technologyMaturity: Qualitative;
};

type Candidate = {
  rank: number;
  id: string;
  name: string;
  whyItSurvives: string;
  primaryAdvantage: string;
  primaryRisk: string;
  nextModel: string;
  screening: Screening;
};

const ISSUE = 82;
const OUT_DIR = join(process.cwd(), 'artifacts', `issue-${ISSUE}`);
const JSON_PATH = join(OUT_DIR, 'localized-optical-interaction-architecture-study.json');
const REPORT_PATH = join(OUT_DIR, 'localized-optical-interaction-architecture-study.md');

const WAVELENGTH_NM = 600.11;
const NOMINAL_INDEX = 1.5;
const CURRENT_DELTA_N = 1e-4;
const BACKGROUND_REFLECTANCE_LIMIT = 1e-3;
const USEFUL_ACTIVE_REFLECTANCE = 0.25;
const BRAGG_PERIOD_NM = WAVELENGTH_NM / (2 * NOMINAL_INDEX);

const displayRequirements = buildDisplayRequirements();
const localInteractionRequirements = buildLocalInteractionRequirements();
const braggDeltaNRequirements = buildBraggDeltaNRequirements();
const switchableCouplingRequirement = buildSwitchableCouplingRequirements();
const resonatorShiftRequirements = buildResonatorShiftRequirements();
const discretePlaneModel = buildDiscretePlaneModel();
const literatureReferences = buildLiteratureReferences();
const architectureFamilies = buildArchitectureFamilies();
const feasibilityChecks = buildFeasibilityChecks();
const rejectedArchitectures = architectureFamilies.filter((family) => family.status === 'REJECT');
const survivingCandidates = buildSurvivingCandidates();
const conclusions = {
  trough: 'THE BIASED STRAIN-TROUGH ARCHITECTURE IS RETAINED AS A VALIDATED RESEARCH REFERENCE BUT IS NO LONGER THE ASSUMED FORWARD ARCHITECTURE',
  architectureReset: 'MULTIPLE ALTERNATIVE ARCHITECTURES REMAIN CREDIBLE AND REQUIRE TARGETED FOLLOW-UP',
  coupling: 'LOCALLY SWITCHING OPTICAL COUPLING IS A CREDIBLE PATH FORWARD',
  continuousVsDiscrete: 'DISCRETE ACTIVE PLANES ARE A CREDIBLE COMPETING ARCHITECTURE',
  dynamicControl: 'ELECTRO-OPTIC CONTROL IS THE LEADING DYNAMIC MECHANISM',
  nextArchitecture: 'ADVANCE MULTIPLE SURVIVING ARCHITECTURES TO SMALL TARGETED FEASIBILITY STUDIES',
};

const payload = {
  issue: ISSUE,
  assumptions: {
    wavelengthNm: WAVELENGTH_NM,
    nominalIndex: NOMINAL_INDEX,
    braggPeriodNm: BRAGG_PERIOD_NM,
    currentDeltaN: CURRENT_DELTA_N,
    backgroundReflectanceLimit: BACKGROUND_REFLECTANCE_LIMIT,
    usefulActiveReflectance: USEFUL_ACTIVE_REFLECTANCE,
  },
  displayRequirements,
  localInteractionRequirements,
  braggDeltaNRequirements,
  switchableCouplingRequirement,
  resonatorShiftRequirements,
  discretePlaneModel,
  literatureReferences,
  architectureFamilies,
  feasibilityChecks,
  rejectedArchitectures,
  survivingCandidates,
  conclusions,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(JSON_PATH, JSON.stringify(payload, null, 2));
await writeFile(REPORT_PATH, renderReport());
console.log(`Wrote ${JSON_PATH}`);
console.log(`Wrote ${REPORT_PATH}`);

function buildDisplayRequirements(): DisplayRequirement[] {
  return [
    ['inactive-state transparency', 'Hard physical requirement', 'TBD; must be high enough that many inactive depths do not haze or attenuate the image', 'The display volume must remain visibly transparent except at the addressed optical event.'],
    ['active-state optical efficiency', 'Engineering target', 'Use 25% redirected/reflected fraction as a useful near-term reference, not a final product requirement', 'WP-v2-15 showed ratio-only wins are not useful if absolute active response remains weak.'],
    ['active-region thickness', 'Engineering target', '0.1-2.0 mm screened; thinner is better for depth precision but raises coupling demand', 'Required interaction strength scales inversely with active thickness.'],
    ['usable display depth', 'Unknown / requires decision', 'TBD', 'The simulator has used 10 mm optical stacks, but product depth has not been fixed.'],
    ['spatial addressability', 'Hard physical requirement', 'Must move or select the active optical event through useful depth', 'A fixed reflector or one-depth resonance is not a volumetric display architecture.'],
    ['switching / movement speed', 'Engineering target', 'TBD; likely video-rate or faster for practical display use', 'Fast optical/electrical mechanisms are preferred, but no frame-rate target is yet specified.'],
    ['viewing geometry', 'Unknown / requires decision', 'Separate voxel generation from wide-angle output engineering', 'Specular or Bragg output can be useful for a projector relay but is not wide-angle scattering by itself.'],
    ['wavelength compatibility', 'Engineering target', 'Visible operation around the existing 600.11 nm baseline', 'The current model and artifacts use 600.11 nm; other colors add dispersion and material constraints.'],
    ['control-energy requirement', 'Engineering target', 'TBD; compare required field, acoustic power, optical fluence, or heat load per active plane', 'A mechanism that works only with damaging or heating control energy is not viable.'],
    ['thermal load', 'Hard physical requirement', 'Low; no persistent local heating buildup', 'Thermal diffusion can erase depth localization and limit refresh.'],
    ['fabrication feasibility', 'Engineering target', 'Prefer wafer/layer, volume holographic, or mature EO/AO material paths', 'Arbitrary 3D nanostructuring through a thick transparent volume is not assumed available.'],
    ['scalability', 'Engineering target', 'TBD', 'Architecture must scale beyond a single demonstration voxel.'],
    ['optical coherence sensitivity', 'Desirable property', 'Lower is better', 'Highly coherent full-volume participation drove several fixed-grating tradeoffs.'],
    ['mechanical complexity', 'Desirable property', 'Lower is better', 'Detailed mechanics remain gated; moving bulk strain fields are no longer assumed.'],
    ['material availability', 'Engineering target', 'Prefer documented transparent EO/AO/LC/photonic materials', 'Speculative material response is not enough for architecture selection.'],
  ].map(([requirement, classification, currentTarget, rationale]) => ({
    requirement,
    classification: classification as RequirementClass,
    currentTarget,
    rationale,
  }));
}

function buildLocalInteractionRequirements() {
  const thicknessesMm = [0.1, 0.25, 0.5, 1.0, 2.0];
  const fractions = [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90];
  return thicknessesMm.map((thicknessMm) => ({
    thicknessMm,
    requirements: fractions.map((fraction) => ({
      redirectedFraction: fraction,
      braggKappaPerM: atanh(Math.sqrt(fraction)) / (thicknessMm * 1e-3),
      equivalentDeltaN: deltaNForKappa(atanh(Math.sqrt(fraction)) / (thicknessMm * 1e-3)),
      singlePassScatteringAlphaPerM: -Math.log(1 - fraction) / (thicknessMm * 1e-3),
    })),
  }));
}

function buildBraggDeltaNRequirements() {
  return [0.25, 0.5, 0.8, 1.0, 2.0].map((activeLengthMm) => ({
    activeLengthMm,
    targets: [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90].map((reflectance) => {
      const kappa = atanh(Math.sqrt(reflectance)) / (activeLengthMm * 1e-3);
      const deltaN = deltaNForKappa(kappa);
      return {
        reflectance,
        kappaPerM: kappa,
        deltaN,
        factorVsCurrent: deltaN / CURRENT_DELTA_N,
      };
    }),
  }));
}

function buildSwitchableCouplingRequirements() {
  const offKappaMax = atanh(Math.sqrt(BACKGROUND_REFLECTANCE_LIMIT)) / 0.01;
  return [0.25, 0.5, 0.8, 1.0, 2.0].map((activeLengthMm) => {
    const onKappa = atanh(Math.sqrt(USEFUL_ACTIVE_REFLECTANCE)) / (activeLengthMm * 1e-3);
    return {
      activeLengthMm,
      backgroundLimitReflectance: BACKGROUND_REFLECTANCE_LIMIT,
      activeTargetReflectance: USEFUL_ACTIVE_REFLECTANCE,
      maxOffKappaPerMFor10Mm: offKappaMax,
      requiredOnKappaPerM: onKappa,
      requiredKappaSwitchingRatio: onKappa / offKappaMax,
      offDeltaNEquivalent: deltaNForKappa(offKappaMax),
      onDeltaNEquivalent: deltaNForKappa(onKappa),
    };
  });
}

function buildResonatorShiftRequirements() {
  return [20, 50, 100, 250, 500, 1000].map((q) => {
    const linewidthNm = WAVELENGTH_NM / q;
    const oneLinewidthIndexShift = NOMINAL_INDEX / q;
    return {
      q,
      linewidthNm,
      indexShiftForOneLinewidth: oneLinewidthIndexShift,
      indexShiftForHalfLinewidth: oneLinewidthIndexShift / 2,
      eoFieldForHalfLinewidthVm: eoFieldForDeltaN(oneLinewidthIndexShift / 2),
      temperatureRiseForHalfLinewidthK: (oneLinewidthIndexShift / 2) / 1e-5,
    };
  });
}

function buildDiscretePlaneModel() {
  return [50, 100, 200, 500].map((planeCount) => ({
    planeCount,
    inactiveLossPerPlane: [1e-4, 5e-4, 1e-3, 2e-3].map((loss) => ({
      loss,
      totalInactiveTransmission: (1 - loss) ** planeCount,
    })),
    activePlaneEfficiencies: [0.05, 0.10, 0.25, 0.50].map((efficiency) => ({
      efficiency,
      outputAfterInactivePlanesAtLoss1e4: efficiency * (1 - 1e-4) ** (planeCount - 1),
      outputAfterInactivePlanesAtLoss1e3: efficiency * (1 - 1e-3) ** (planeCount - 1),
    })),
  }));
}

function buildLiteratureReferences(): LiteratureReference[] {
  return [
    {
      id: 'hu-2024-tfln-review',
      title: 'Integrated electro-optics on thin-film lithium niobate',
      authors: 'Y. Hu et al.',
      venue: 'arXiv / review article',
      year: 2024,
      url: 'https://arxiv.org/pdf/2404.06398',
      relevance: 'Reports LiNbO3 as a leading EO platform and r33 near 31 pm/V; useful for field-to-index estimates.',
    },
    {
      id: 'mercante-2018-tfln',
      title: 'Thin film lithium niobate electro-optic modulator with terahertz operating bandwidth',
      authors: 'A. J. Mercante et al.',
      venue: 'Optics Express',
      year: 2018,
      doi: '10.1364/OE.26.014810',
      url: 'https://muri2.engr.utexas.edu/sites/default/files/publication/oe-26-11-14810.pdf',
      relevance: 'Demonstrates very high EO bandwidth while still using guided-wave overlap and mm-scale interaction lengths.',
    },
    {
      id: 'li-2005-lc-indices',
      title: 'Refractive Indices Of Liquid Crystals And Their Applications In Display And Photonic Devices',
      authors: 'J. Li',
      venue: 'University of Central Florida dissertation',
      year: 2005,
      url: 'https://stars.library.ucf.edu/etd/388/',
      relevance: 'Documents large LC birefringence scale; supports LC as high-index-change but slower/geometry-constrained control.',
    },
    {
      id: 'rp-photonics-aom',
      title: 'Acousto-optic Modulators',
      authors: 'RP Photonics Encyclopedia',
      venue: 'Technical encyclopedia',
      year: 2026,
      url: 'https://www.rp-photonics.com/acousto_optic_modulators.html',
      relevance: 'Summarizes typical AOM acoustic wavelengths of 10-100 micrometers and RF scale, reinforcing the optical-period backreflection mismatch.',
    },
    {
      id: 'baldry-2004-vph',
      title: 'Volume Phase Holographic Gratings: Polarization Properties and Diffraction Efficiency',
      authors: 'I. K. Baldry, J. Bland-Hawthorn, J. G. Robertson',
      venue: 'PASP / arXiv',
      year: 2004,
      url: 'https://arxiv.org/abs/astro-ph/0402402',
      relevance: 'Gives volume holographic grating efficiency dependence on Delta n, thickness, period, and polarization.',
    },
    {
      id: 'tonkaev-2020-mie',
      title: 'High-Q dielectric Mie-resonant nanostructures',
      authors: 'P. Tonkaev and Y. Kivshar',
      venue: 'arXiv mini-review',
      year: 2020,
      url: 'https://arxiv.org/abs/2010.10854',
      relevance: 'Supports dielectric resonator and high-Q nanophotonic architectures as real optical interaction platforms.',
    },
    {
      id: 'krasnok-2017-rdn',
      title: 'Spectroscopy and Biosensing with Optically Resonant Dielectric Nanostructures',
      authors: 'A. Krasnok, M. Caldarola, N. Bonod, and A. Alu',
      venue: 'arXiv review',
      year: 2017,
      url: 'https://arxiv.org/abs/1710.10233',
      relevance: 'Documents resonant dielectric nanoparticle scattering and index-sensitive resonance behavior.',
    },
    {
      id: 'lange-2026-photorefraction',
      title: 'Photorefraction Management in Lithium Niobate Waveguides',
      authors: 'N. A. Lange et al.',
      venue: 'arXiv',
      year: 2026,
      url: 'https://arxiv.org/abs/2601.15817',
      relevance: 'Treats photorefraction as a real optically induced index change but also as a stability/power-management concern.',
    },
    {
      id: 'rego-2024-thermo-optic',
      title: 'Temperature Dependence of the Thermo-Optic Coefficient of Silica-Based Optical Fibers',
      authors: 'G. M. Rego et al.',
      venue: 'Sensors / PMC',
      year: 2024,
      doi: '10.3390/s24030938',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10819995/',
      relevance: 'Provides silica thermo-optic coefficient scale; useful for temperature-rise and diffusion rejection checks.',
    },
  ];
}

function buildArchitectureFamilies(): ArchitectureFamily[] {
  return [
    family('switchable-bragg', 'Locally switchable Bragg coupling', 'Permanent momentum structure plus locally increased coupling amplitude or polarization overlap.', 'Directional Bragg reflection', ['hu-2024-tfln-review', 'baldry-2004-vph'], 'SURVIVES', 'Requires local Delta n or equivalent coupling near 1e-4-1e-3 over sub-mm to mm lengths while keeping off coupling near 1e-5.', 'Directly addresses WP-v2-15 by separating kappa_on from kappa_inactive.'),
    family('induced-optical-period-grating', 'Locally written / induced backward Bragg grating', 'Dynamic grating exists only at the active region.', 'Directional Bragg reflection', ['rp-photonics-aom', 'lange-2026-photorefraction'], 'REJECT', `Backward Bragg period is about ${fmt(BRAGG_PERIOD_NM)} nm; acoustic waves are typically orders of magnitude too coarse, while optical writing has power/persistence issues.`, 'Does not reliably avoid the optical-period momentum problem unless counterpropagating optical writing or a static assist supplies the period.'),
    family('phase-defect', 'Local phase defect / resonant defect', 'A mostly detuned or weakly reflective periodic structure is locally converted into a defect resonance.', 'Narrowband directional reflection or resonant extraction', ['baldry-2004-vph'], 'FOLLOW-UP', 'Promising optical leverage, but moving the defect requires controlled phase or optical-thickness shifts near pi at selected depth.', 'Could reduce full-grating participation, but addressable defect creation is not yet demonstrated in the bulk geometry.'),
    family('coupling-cancellation', 'Local coupling cancellation / restoration', 'Two coupling contributions cancel in the inactive state; local control breaks cancellation.', 'Directional, polarization-dependent, or symmetry-selected output', ['hu-2024-tfln-review'], 'FOLLOW-UP', 'Attractive ON/OFF ratio, but fabrication and phase stability are high risk.', 'Could produce low inactive coupling without requiring tiny absolute fabrication errors if a robust symmetry mechanism exists.'),
    family('resonant-scattering', 'Local resonant scattering', 'Embedded resonators or resonant planes are shifted into resonance locally.', 'Potentially wider-angle scattering or engineered directional output', ['tonkaev-2020-mie', 'krasnok-2017-rdn'], 'FOLLOW-UP', 'Index shift for high-Q switching is smaller, but high-Q also increases spectral/angular sensitivity and fabrication burden.', 'Broadens beyond Bragg reflection and may provide better viewing geometry if loss/transparency can be controlled.'),
    family('electro-optic-activation', 'Electro-optic local activation', 'Electric field changes index, phase, coupling, polarization, or a resonant condition.', 'Depends on structure; usually phase/coupling modulation', ['hu-2024-tfln-review', 'mercante-2018-tfln'], 'SURVIVES', 'Fast and mature in guided devices; unresolved risk is localizing strong fields inside a thick volume.', 'Best dynamic-control family for follow-up because the response is fast and electronically synchronized.'),
    family('acousto-optic-gating', 'Acousto-optic local activation', 'Acoustic field modulates phase, coupling, resonance, or a defect instead of directly writing the optical-period grating.', 'Deflected Bragg output, gated defect, or moving interaction plane', ['rp-photonics-aom'], 'FOLLOW-UP', 'Useful for moving envelopes and lower-frequency gating, but direct backward-grating generation remains rejected.', 'Acoustics should be reconsidered only as a gate for another optical structure.'),
    family('photorefractive-optical', 'Optically controlled / photorefractive activation', 'Control light changes local index, carriers, or a holographic grating.', 'Can be Bragg-like, phase-like, or absorptive/scattering', ['lange-2026-photorefraction'], 'REJECT', 'Fast strong writing tends to require high optical fluence, persistence/erase management, or absorption.', 'Potentially useful for slow reconfigurable calibration, not the leading display-rate voxel switch.'),
    family('thermo-optic', 'Thermo-optic activation', 'Temperature changes refractive index or resonance.', 'Usually phase/resonance shift', ['rego-2024-thermo-optic'], 'REJECT', 'Required temperature rises for large optical shifts are high, and diffusion destroys fast sub-mm localization.', 'Good reference mechanism but not a leading display switch.'),
    family('hybrid-static-dynamic', 'Hybrid static momentum + dynamic strong coupling', 'Static structure supplies momentum/phase matching; EO/LC/AO/resonant control supplies local ON/OFF interaction.', 'Architecture-dependent; can be directional or scattering', ['hu-2024-tfln-review', 'tonkaev-2020-mie', 'li-2005-lc-indices'], 'SURVIVES', 'Most plausible way to avoid optical-period dynamic writing while gaining a large local switching ratio.', 'This is the strongest architectural direction to model next.'),
    family('discrete-active-planes', 'Thin discrete active planes', 'Many transparent addressable planes replace continuous homogeneous depth.', 'Plane-wise scattering, Bragg, or resonant output', ['hu-2024-tfln-review', 'li-2005-lc-indices'], 'SURVIVES', 'Discrete depth may be visually acceptable and manufacturable, but inactive loss per plane must be extremely low.', 'Challenges the continuous-depth assumption and gives a practical electronic-addressing route.'),
    family('sparse-embedded-structures', 'Sparse embedded structures', 'Sparse scattering/resonator/grating sheets reduce volume-wide optical burden.', 'Scattering or directional extraction', ['krasnok-2017-rdn'], 'FOLLOW-UP', 'Transparency and fabrication uniformity are central risks.', 'May be a manufacturable compromise between bulk and layered architectures.'),
    family('scanned-thin-layer', 'Scanning a thin active layer', 'A moving excitation front or boundary creates one thin active optical layer.', 'Architecture-dependent', ['rp-photonics-aom'], 'FOLLOW-UP', 'Can be efficient if the optical interaction is strong; moving-front control and synchronization remain open.', 'Worth keeping if the active layer is optical/electrical/acoustic, not merely the old strain trough renamed.'),
  ];
}

function buildFeasibilityChecks(): FeasibilityCheck[] {
  const deltaNFor25PctAt08 = braggDeltaNRequirements
    .find((row) => row.activeLengthMm === 0.8)!
    .targets.find((target) => target.reflectance === 0.25)!.deltaN;
  const lithiumNiobateDeltaNAt10Vum = eoDeltaN(1e7);
  const lcRepresentativeDeltaN = 0.1;
  const thermoDeltaNAt10K = 1e-5 * 10;
  return [
    check('bragg-local-dn', 'Localized Bragg reflection over 0.8 mm', `Delta n ~= ${fmt(deltaNFor25PctAt08)} for 25% ideal local reflectance`, `Current permanent Delta n = ${CURRENT_DELTA_N}`, deltaNFor25PctAt08 / CURRENT_DELTA_N, 'Requires about current-scale coupling for 25%, but higher targets require several times current Delta n.'),
    check('eo-bulk-ln', 'Bulk LiNbO3 Pockels index shift', `Delta n ~= ${fmt(deltaNFor25PctAt08)} over the active length`, `At 10 V/um, rough Delta n ~= ${fmt(lithiumNiobateDeltaNAt10Vum)}`, deltaNFor25PctAt08 / lithiumNiobateDeltaNAt10Vum, 'EO can plausibly tune phase/resonance, but direct full Bragg coupling modulation is field-geometry limited.'),
    check('lc-index', 'Liquid-crystal birefringence switching', `Delta n scale 1e-4 to 1e-3 for coupling or resonance tuning`, `Representative birefringence can be ~${fmt(lcRepresentativeDeltaN, 3)}`, 1e-3 / lcRepresentativeDeltaN, 'Large optical anisotropy is attractive; speed, scattering, alignment, and layered geometry dominate feasibility.'),
    check('ao-backward-period', 'Acoustic direct backward grating', `Acoustic period near ${fmt(BRAGG_PERIOD_NM)} nm for first-order backward Bragg momentum`, 'Typical AOM acoustic wavelength is about 10-100 micrometers', 10_000 / BRAGG_PERIOD_NM, 'REJECT: direct acoustic optical-period grating remains mismatched by tens to hundreds of times even before power/localization.'),
    check('resonator-q100', 'Q=100 resonator half-linewidth tuning', 'Index shift ~= 0.0075', `10 V/um LiNbO3 rough Delta n ~= ${fmt(lithiumNiobateDeltaNAt10Vum)}`, 0.0075 / lithiumNiobateDeltaNAt10Vum, 'Ordinary EO index shift is too small for low-Q resonators; high-Q or LC/phase leverage is required.'),
    check('thermo-q100', 'Thermo-optic resonator tuning', 'Index shift ~= 0.0075 for Q=100 half-linewidth', `10 K silica-like thermal shift ~= ${fmt(thermoDeltaNAt10K)}`, 0.0075 / thermoDeltaNAt10K, 'REJECT for fast bulk voxel switching: temperature rise and diffusion are not compatible with sharp moving depth.'),
  ];
}

function buildSurvivingCandidates(): Candidate[] {
  return [
    candidate(1, 'hybrid-static-eo-switchable-coupling', 'Hybrid static momentum + electro-optic switchable coupling', 'It preserves a permanent phase-matching structure but makes the ON/OFF optical interaction a local electronic material requirement.', 'Fast control and a clear switchable-kappa model target.', 'Electrode geometry may not localize strong fields through bulk depth without layered construction.', 'Implement a switchable-kappa CMT reference with explicit kappa_off, kappa_on, active width, and field-localization assumptions.', {
      inactiveTransparency: 'Moderate',
      activeInteractionStrength: 'Moderate',
      onOffRatio: 'Strong',
      activeRegionThickness: 'Moderate',
      addressability: 'Moderate',
      expectedSwitchingSpeed: 'Strong',
      requiredControlMagnitude: 'Moderate',
      viewingGeometry: 'Moderate',
      fabricationComplexity: 'Weak',
      scalability: 'Unknown',
      thermalBurden: 'Strong',
      mechanicalBurden: 'Strong',
      coherenceSensitivity: 'Moderate',
      technologyMaturity: 'Moderate',
    }),
    candidate(2, 'discrete-eo-lc-active-planes', 'Discrete EO/LC active planes', 'It relaxes continuous-depth field localization and trades it for manufacturable plane addressing.', 'Electronic plane selection could be practical while inactive plane loss is directly quantifiable.', 'Many planes demand very low per-plane haze/loss and may produce discrete depth artifacts.', 'Build a layered loss/efficiency model tied to target depth resolution and acceptable inactive transmission.', {
      inactiveTransparency: 'Moderate',
      activeInteractionStrength: 'Strong',
      onOffRatio: 'Moderate',
      activeRegionThickness: 'Strong',
      addressability: 'Strong',
      expectedSwitchingSpeed: 'Moderate',
      requiredControlMagnitude: 'Moderate',
      viewingGeometry: 'Moderate',
      fabricationComplexity: 'Moderate',
      scalability: 'Moderate',
      thermalBurden: 'Strong',
      mechanicalBurden: 'Strong',
      coherenceSensitivity: 'Strong',
      technologyMaturity: 'Moderate',
    }),
    candidate(3, 'resonant-scatterer-planes', 'Sparse resonant-scatterer or resonator planes', 'It can create a stronger localized optical event than weak bulk Bragg reflection and may improve viewing geometry.', 'Resonant scattering gives optical leverage and can be placed only where needed.', 'Inactive transparency, linewidth control, and material tuning response are unresolved.', 'Model Q, filling fraction, inactive detuning, switching shift, and cumulative haze for sparse planes.', {
      inactiveTransparency: 'Unknown',
      activeInteractionStrength: 'Strong',
      onOffRatio: 'Moderate',
      activeRegionThickness: 'Strong',
      addressability: 'Moderate',
      expectedSwitchingSpeed: 'Moderate',
      requiredControlMagnitude: 'Weak',
      viewingGeometry: 'Strong',
      fabricationComplexity: 'Weak',
      scalability: 'Unknown',
      thermalBurden: 'Moderate',
      mechanicalBurden: 'Strong',
      coherenceSensitivity: 'Moderate',
      technologyMaturity: 'Weak',
    }),
    candidate(4, 'phase-defect-gated-grating', 'Locally gated phase-defect grating', 'It may create a localized resonant state without tuning the entire grating into resonance.', 'Uses coherent resonance for high optical interaction from a compact defect.', 'Moving or electronically creating the defect may be as hard as the original localization problem.', 'Create a transfer-matrix defect-grating reference model only after defining a plausible phase-control mechanism.', {
      inactiveTransparency: 'Moderate',
      activeInteractionStrength: 'Strong',
      onOffRatio: 'Moderate',
      activeRegionThickness: 'Moderate',
      addressability: 'Weak',
      expectedSwitchingSpeed: 'Moderate',
      requiredControlMagnitude: 'Weak',
      viewingGeometry: 'Moderate',
      fabricationComplexity: 'Weak',
      scalability: 'Unknown',
      thermalBurden: 'Strong',
      mechanicalBurden: 'Moderate',
      coherenceSensitivity: 'Weak',
      technologyMaturity: 'Weak',
    }),
  ];
}

function family(
  id: string,
  name: string,
  mechanism: string,
  viewingGeometry: string,
  evidenceIds: string[],
  status: CandidateStatus,
  gate: string,
  rationale: string,
): ArchitectureFamily {
  return { id, name, mechanism, viewingGeometry, evidenceIds, status, gate, rationale };
}

function check(
  id: string,
  mechanism: string,
  requiredChange: string,
  demonstratedChange: string,
  requiredOverDemonstrated: number | null,
  result: string,
): FeasibilityCheck {
  return { id, mechanism, requiredChange, demonstratedChange, requiredOverDemonstrated, result };
}

function candidate(rank: number, id: string, name: string, whyItSurvives: string, primaryAdvantage: string, primaryRisk: string, nextModel: string, screening: Screening): Candidate {
  return { rank, id, name, whyItSurvives, primaryAdvantage, primaryRisk, nextModel, screening };
}

function renderReport(): string {
  return [
    '# Localized Optical Interaction Architecture Study',
    '',
    `Issue: #${ISSUE}`,
    '',
    '## Executive Summary',
    '',
    'WP-v2-16 resets the question from improving the biased strain trough to finding a physical mechanism that creates a strong, localized, movable optical event in an otherwise transparent volume. The fixed-grating/trough path remains valuable because it quantified the coupling-length, detuning, localization, and Maxwell-boundary constraints; it is no longer treated as the default forward architecture.',
    '',
    'The most useful direction is not a dynamic optical-period grating. It is a hybrid architecture where a static structure supplies momentum, phase matching, resonant enhancement, or plane definition, while a dynamic material response locally switches the optical interaction. Electro-optic control is the leading dynamic mechanism because it is fast and electronically synchronized, but the field-localization/electrode geometry problem is unresolved. Discrete active planes are a credible competing architecture because they trade continuous bulk field localization for manufacturable addressing and measurable inactive loss.',
    '',
    '## Prior Architecture Findings',
    '',
    '```text',
    'Dynamic acoustic grating',
    '        ->',
    'Hybrid permanent VBG + local tuning',
    '        ->',
    'Biased strain trough',
    '        ->',
    'Maxwell validation',
    '        ->',
    'detuning optimization failure',
    '        ->',
    'permanent-grating engineering failure',
    '        ->',
    'architecture reset',
    '```',
    '',
    'WP-v2-14 found no robust detuning-only operating region. WP-v2-15 found that the current active region is under-coupled, but tested permanent-grating engineering did not resolve the active/background tradeoff. Those are negative architecture constraints, not wasted work.',
    '',
    '## Display Requirements',
    '',
    '| requirement | class | current target | rationale |',
    '| --- | --- | --- | --- |',
    ...displayRequirements.map((row) => `| ${row.requirement} | ${row.classification} | ${row.currentTarget} | ${row.rationale} |`),
    '',
    '## Required Local Interaction Strength',
    '',
    'For a short local Bragg-like reflector, the reference relation is `R = tanh^2(kappa L)`. For generic single-pass scattering, the reference relation is `F = 1 - exp(-alpha L)`. These are not forced onto every architecture; they set comparable interaction-strength scales.',
    '',
    '| thickness | F/R 1% | 5% | 10% | 25% | 50% | 75% | 90% |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...localInteractionRequirements.map((row) => `| ${fmt(row.thicknessMm)} mm | ${row.requirements.map((item) => fmt(item.braggKappaPerM)).join(' | ')} |`),
    '',
    'Entries are required Bragg-like `kappa` in 1/m. A 0.8 mm region needs about 687 1/m for 25% and 1102 1/m for 50%, corresponding to `Delta n` near 1.31e-4 and 2.10e-4 at 600 nm.',
    '',
    '## Switchable-Coupling Requirement',
    '',
    `To keep a 10 mm inactive grating below R = ${BACKGROUND_REFLECTANCE_LIMIT}, the reference off-coupling must be below ${fmt(switchableCouplingRequirement[0].maxOffKappaPerMFor10Mm)} 1/m, or Delta n about ${fmt(switchableCouplingRequirement[0].offDeltaNEquivalent)}.`,
    '',
    '| active length | kappa_on for 25% | Delta n on | required kappa_on/kappa_off |',
    '| ---: | ---: | ---: | ---: |',
    ...switchableCouplingRequirement.map((row) => `| ${fmt(row.activeLengthMm)} mm | ${fmt(row.requiredOnKappaPerM)} | ${fmt(row.onDeltaNEquivalent)} | ${fmt(row.requiredKappaSwitchingRatio)} |`),
    '',
    'This is the central material/device target: the architecture should create a local interaction roughly one to two orders of magnitude stronger than the inactive interaction, depending on active thickness.',
    '',
    '## Required Delta n For Localized Bragg Reflection',
    '',
    '| active length | R=1% | R=5% | R=10% | R=25% | R=50% | R=75% | R=90% |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...braggDeltaNRequirements.map((row) => `| ${fmt(row.activeLengthMm)} mm | ${row.targets.map((item) => `${fmt(item.deltaN)} (${fmt(item.factorVsCurrent)}x)`).join(' | ')} |`),
    '',
    '## Architecture Families Considered',
    '',
    '| family | status | viewing geometry | gate |',
    '| --- | --- | --- | --- |',
    ...architectureFamilies.map((row) => `| ${row.name} | ${row.status} | ${row.viewingGeometry} | ${row.gate} |`),
    '',
    '## Literature Evidence',
    '',
    ...literatureReferences.map((ref) => `- ${ref.id}: ${ref.title}; ${ref.authors}; ${ref.venue}; ${ref.year}${ref.doi ? `; DOI ${ref.doi}` : ''}; ${ref.url}. ${ref.relevance}`),
    '',
    '## First-Principles Feasibility Checks',
    '',
    '| mechanism | required | demonstrated/reference | required / demonstrated | result |',
    '| --- | --- | --- | ---: | --- |',
    ...feasibilityChecks.map((row) => `| ${row.mechanism} | ${row.requiredChange} | ${row.demonstratedChange} | ${fmt(row.requiredOverDemonstrated)} | ${row.result} |`),
    '',
    '## Rejected Architectures',
    '',
    ...rejectedArchitectures.map((row) => `- ${row.name}: ${row.gate}`),
    '',
    '## Surviving Candidates',
    '',
    ...survivingCandidates.map((row) => [
      `### ${row.rank}. ${row.name}`,
      '',
      `Why it survives: ${row.whyItSurvives}`,
      '',
      `Primary physical advantage: ${row.primaryAdvantage}`,
      '',
      `Primary unresolved risk: ${row.primaryRisk}`,
      '',
      `Next experiment/model needed: ${row.nextModel}`,
    ].join('\n')),
    '',
    '## Headless Reference Models',
    '',
    'This packet implements compact algebraic reference models rather than production simulator modes:',
    '',
    '- Bragg-like local interaction strength: required kappa and Delta n versus active thickness.',
    '- Switchable-kappa reference: required kappa_on/kappa_off for background suppression and 25% active reflection.',
    '- Resonator switching: linewidth and index/temperature shift versus Q.',
    '- Discrete active-plane accumulation: total inactive transmission versus plane count and per-plane loss.',
    '',
    '## Resonant-Scatterer Switching',
    '',
    '| Q | linewidth | half-linewidth Delta n | EO field for half-linewidth | temperature rise for half-linewidth |',
    '| ---: | ---: | ---: | ---: | ---: |',
    ...resonatorShiftRequirements.map((row) => `| ${row.q} | ${fmt(row.linewidthNm)} nm | ${fmt(row.indexShiftForHalfLinewidth)} | ${fmt(row.eoFieldForHalfLinewidthVm)} V/m | ${fmt(row.temperatureRiseForHalfLinewidthK)} K |`),
    '',
    'Low-Q resonators require very large index shifts. High-Q resonators reduce the tuning burden but increase angular, spectral, and fabrication sensitivity.',
    '',
    '## Continuous vs Discrete Depth',
    '',
    '| planes | T at 1e-4 loss/plane | T at 5e-4 | T at 1e-3 | T at 2e-3 |',
    '| ---: | ---: | ---: | ---: | ---: |',
    ...discretePlaneModel.map((row) => `| ${row.planeCount} | ${row.inactiveLossPerPlane.map((item) => fmt(item.totalInactiveTransmission)).join(' | ')} |`),
    '',
    'For 200 planes, 0.01% inactive loss per plane still leaves about 98% transmission, while 0.1% loss per plane leaves about 82%. This makes inactive plane loss a first-order architecture requirement, but it does not rule out discrete planes.',
    '',
    '## Control Mechanism Comparison',
    '',
    '- Electro-optic: leading dynamic mechanism; fast and mature, but bulk field localization is the hard problem.',
    '- Acousto-optic: no longer leading for direct optical-period grating generation; remains plausible as a moving gate, phase shifter, or defect/resonance actuator.',
    '- Optical / photorefractive: useful for slow or written structures, but display-rate erase/persistence/power constraints are severe.',
    '- Thermo-optic: rejected for fast localized switching because heat diffusion and required temperature rise conflict with sub-mm moving regions.',
    '- Liquid crystal: attractive for large index contrast in layered/discrete architectures; less credible as arbitrary fast 3D bulk addressing.',
    '',
    '## Candidate Ranking',
    '',
    ...survivingCandidates.map((row) => `${row.rank}. ${row.name}: ${row.primaryAdvantage} Risk: ${row.primaryRisk}`),
    '',
    '## Required Conclusions',
    '',
    `- Trough: \`${conclusions.trough}\``,
    `- Architecture reset: \`${conclusions.architectureReset}\``,
    `- Coupling: \`${conclusions.coupling}\``,
    `- Continuous vs discrete: \`${conclusions.continuousVsDiscrete}\``,
    `- Dynamic control: \`${conclusions.dynamicControl}\`. EO control is fastest and most mature for synchronized switching, but field localization may force a discrete or layered architecture.`,
    `- Next architecture: \`${conclusions.nextArchitecture}\``,
    '',
    '## Recommended Next Work',
    '',
    'Create small targeted feasibility studies for the top two directions: a switchable-kappa static-momentum plus EO-control model, and a discrete active-plane loss/efficiency model. Do not resume detailed strain-trough mechanics until one of these architecture gates fails or explicitly requires comparison.',
    '',
  ].join('\n');
}

function atanh(value: number): number {
  return 0.5 * Math.log((1 + value) / (1 - value));
}

function deltaNForKappa(kappaPerM: number): number {
  return kappaPerM * WAVELENGTH_NM * 1e-9 / Math.PI;
}

function eoDeltaN(electricFieldVm: number): number {
  const r33MetersPerVolt = 31e-12;
  return 0.5 * NOMINAL_INDEX ** 3 * r33MetersPerVolt * electricFieldVm;
}

function eoFieldForDeltaN(deltaN: number): number {
  const r33MetersPerVolt = 31e-12;
  return deltaN / (0.5 * NOMINAL_INDEX ** 3 * r33MetersPerVolt);
}

function fmt(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  if (Math.abs(value) >= 1e4 || Math.abs(value) < 1e-3 && value !== 0) return value.toExponential(digits);
  return value.toPrecision(digits);
}
