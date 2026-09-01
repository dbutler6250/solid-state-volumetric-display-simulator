# Localized Optical Interaction Architecture Study

Issue: #82

## Executive Summary

WP-v2-16 resets the question from improving the biased strain trough to finding a physical mechanism that creates a strong, localized, movable optical event in an otherwise transparent volume. The fixed-grating/trough path remains valuable because it quantified the coupling-length, detuning, localization, and Maxwell-boundary constraints; it is no longer treated as the default forward architecture.

The most useful direction is not a dynamic optical-period grating. It is a hybrid architecture where a static structure supplies momentum, phase matching, resonant enhancement, or plane definition, while a dynamic material response locally switches the optical interaction. Electro-optic control is the leading dynamic mechanism because it is fast and electronically synchronized, but the field-localization/electrode geometry problem is unresolved. Discrete active planes are a credible competing architecture because they trade continuous bulk field localization for manufacturable addressing and measurable inactive loss.

## Prior Architecture Findings

```text
Dynamic acoustic grating
        ->
Hybrid permanent VBG + local tuning
        ->
Biased strain trough
        ->
Maxwell validation
        ->
detuning optimization failure
        ->
permanent-grating engineering failure
        ->
architecture reset
```

WP-v2-14 found no robust detuning-only operating region. WP-v2-15 found that the current active region is under-coupled, but tested permanent-grating engineering did not resolve the active/background tradeoff. Those are negative architecture constraints, not wasted work.

## Display Requirements

| requirement | class | current target | rationale |
| --- | --- | --- | --- |
| inactive-state transparency | Hard physical requirement | TBD; must be high enough that many inactive depths do not haze or attenuate the image | The display volume must remain visibly transparent except at the addressed optical event. |
| active-state optical efficiency | Engineering target | Use 25% redirected/reflected fraction as a useful near-term reference, not a final product requirement | WP-v2-15 showed ratio-only wins are not useful if absolute active response remains weak. |
| active-region thickness | Engineering target | 0.1-2.0 mm screened; thinner is better for depth precision but raises coupling demand | Required interaction strength scales inversely with active thickness. |
| usable display depth | Unknown / requires decision | TBD | The simulator has used 10 mm optical stacks, but product depth has not been fixed. |
| spatial addressability | Hard physical requirement | Must move or select the active optical event through useful depth | A fixed reflector or one-depth resonance is not a volumetric display architecture. |
| switching / movement speed | Engineering target | TBD; likely video-rate or faster for practical display use | Fast optical/electrical mechanisms are preferred, but no frame-rate target is yet specified. |
| viewing geometry | Unknown / requires decision | Separate voxel generation from wide-angle output engineering | Specular or Bragg output can be useful for a projector relay but is not wide-angle scattering by itself. |
| wavelength compatibility | Engineering target | Visible operation around the existing 600.11 nm baseline | The current model and artifacts use 600.11 nm; other colors add dispersion and material constraints. |
| control-energy requirement | Engineering target | TBD; compare required field, acoustic power, optical fluence, or heat load per active plane | A mechanism that works only with damaging or heating control energy is not viable. |
| thermal load | Hard physical requirement | Low; no persistent local heating buildup | Thermal diffusion can erase depth localization and limit refresh. |
| fabrication feasibility | Engineering target | Prefer wafer/layer, volume holographic, or mature EO/AO material paths | Arbitrary 3D nanostructuring through a thick transparent volume is not assumed available. |
| scalability | Engineering target | TBD | Architecture must scale beyond a single demonstration voxel. |
| optical coherence sensitivity | Desirable property | Lower is better | Highly coherent full-volume participation drove several fixed-grating tradeoffs. |
| mechanical complexity | Desirable property | Lower is better | Detailed mechanics remain gated; moving bulk strain fields are no longer assumed. |
| material availability | Engineering target | Prefer documented transparent EO/AO/LC/photonic materials | Speculative material response is not enough for architecture selection. |

## Required Local Interaction Strength

For a short local Bragg-like reflector, the reference relation is `R = tanh^2(kappa L)`. For generic single-pass scattering, the reference relation is `F = 1 - exp(-alpha L)`. These are not forced onto every architecture; they set comparable interaction-strength scales.

| thickness | F/R 1% | 5% | 10% | 25% | 50% | 75% | 90% |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.100 mm | 1.00e+3 | 2.27e+3 | 3.27e+3 | 5.49e+3 | 8.81e+3 | 1.317e+4 | 1.818e+4 |
| 0.250 mm | 401 | 910 | 1.31e+3 | 2.20e+3 | 3.53e+3 | 5.27e+3 | 7.27e+3 |
| 0.500 mm | 201 | 455 | 655 | 1.10e+3 | 1.76e+3 | 2.63e+3 | 3.64e+3 |
| 1.00 mm | 100 | 227 | 327 | 549 | 881 | 1.32e+3 | 1.82e+3 |
| 2.00 mm | 50.2 | 114 | 164 | 275 | 441 | 658 | 909 |

Entries are required Bragg-like `kappa` in 1/m. A 0.8 mm region needs about 687 1/m for 25% and 1102 1/m for 50%, corresponding to `Delta n` near 1.31e-4 and 2.10e-4 at 600 nm.

## Switchable-Coupling Requirement

To keep a 10 mm inactive grating below R = 0.001, the reference off-coupling must be below 3.16 1/m, or Delta n about 6.043e-7.

| active length | kappa_on for 25% | Delta n on | required kappa_on/kappa_off |
| ---: | ---: | ---: | ---: |
| 0.250 mm | 2.20e+3 | 4.197e-4 | 695 |
| 0.500 mm | 1.10e+3 | 2.099e-4 | 347 |
| 0.800 mm | 687 | 1.312e-4 | 217 |
| 1.00 mm | 549 | 1.049e-4 | 174 |
| 2.00 mm | 275 | 5.246e-5 | 86.8 |

This is the central material/device target: the architecture should create a local interaction roughly one to two orders of magnitude stronger than the inactive interaction, depending on active thickness.

## Required Delta n For Localized Bragg Reflection

| active length | R=1% | R=5% | R=10% | R=25% | R=50% | R=75% | R=90% |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.250 mm | 7.666e-5 (0.767x) | 1.738e-4 (1.74x) | 2.502e-4 (2.50x) | 4.197e-4 (4.20x) | 6.734e-4 (6.73x) | 0.00101 (10.1x) | 0.00139 (13.9x) |
| 0.500 mm | 3.833e-5 (0.383x) | 8.690e-5 (0.869x) | 1.251e-4 (1.25x) | 2.099e-4 (2.10x) | 3.367e-4 (3.37x) | 5.031e-4 (5.03x) | 6.947e-4 (6.95x) |
| 0.800 mm | 2.396e-5 (0.240x) | 5.431e-5 (0.543x) | 7.819e-5 (0.782x) | 1.312e-4 (1.31x) | 2.105e-4 (2.10x) | 3.145e-4 (3.14x) | 4.342e-4 (4.34x) |
| 1.00 mm | 1.917e-5 (0.192x) | 4.345e-5 (0.434x) | 6.255e-5 (0.625x) | 1.049e-4 (1.05x) | 1.684e-4 (1.68x) | 2.516e-4 (2.52x) | 3.474e-4 (3.47x) |
| 2.00 mm | 9.583e-6 (0.0958x) | 2.172e-5 (0.217x) | 3.127e-5 (0.313x) | 5.246e-5 (0.525x) | 8.418e-5 (0.842x) | 1.258e-4 (1.26x) | 1.737e-4 (1.74x) |

## Architecture Families Considered

| family | status | viewing geometry | gate |
| --- | --- | --- | --- |
| Locally switchable Bragg coupling | SURVIVES | Directional Bragg reflection | Requires local Delta n or equivalent coupling near 1e-4-1e-3 over sub-mm to mm lengths while keeping off coupling near 1e-5. |
| Locally written / induced backward Bragg grating | REJECT | Directional Bragg reflection | Backward Bragg period is about 200 nm; acoustic waves are typically orders of magnitude too coarse, while optical writing has power/persistence issues. |
| Local phase defect / resonant defect | FOLLOW-UP | Narrowband directional reflection or resonant extraction | Promising optical leverage, but moving the defect requires controlled phase or optical-thickness shifts near pi at selected depth. |
| Local coupling cancellation / restoration | FOLLOW-UP | Directional, polarization-dependent, or symmetry-selected output | Attractive ON/OFF ratio, but fabrication and phase stability are high risk. |
| Local resonant scattering | FOLLOW-UP | Potentially wider-angle scattering or engineered directional output | Index shift for high-Q switching is smaller, but high-Q also increases spectral/angular sensitivity and fabrication burden. |
| Electro-optic local activation | SURVIVES | Depends on structure; usually phase/coupling modulation | Fast and mature in guided devices; unresolved risk is localizing strong fields inside a thick volume. |
| Acousto-optic local activation | FOLLOW-UP | Deflected Bragg output, gated defect, or moving interaction plane | Useful for moving envelopes and lower-frequency gating, but direct backward-grating generation remains rejected. |
| Optically controlled / photorefractive activation | REJECT | Can be Bragg-like, phase-like, or absorptive/scattering | Fast strong writing tends to require high optical fluence, persistence/erase management, or absorption. |
| Thermo-optic activation | REJECT | Usually phase/resonance shift | Required temperature rises for large optical shifts are high, and diffusion destroys fast sub-mm localization. |
| Hybrid static momentum + dynamic strong coupling | SURVIVES | Architecture-dependent; can be directional or scattering | Most plausible way to avoid optical-period dynamic writing while gaining a large local switching ratio. |
| Thin discrete active planes | SURVIVES | Plane-wise scattering, Bragg, or resonant output | Discrete depth may be visually acceptable and manufacturable, but inactive loss per plane must be extremely low. |
| Sparse embedded structures | FOLLOW-UP | Scattering or directional extraction | Transparency and fabrication uniformity are central risks. |
| Scanning a thin active layer | FOLLOW-UP | Architecture-dependent | Can be efficient if the optical interaction is strong; moving-front control and synchronization remain open. |

## Literature Evidence

- hu-2024-tfln-review: Integrated electro-optics on thin-film lithium niobate; Y. Hu et al.; arXiv / review article; 2024; https://arxiv.org/pdf/2404.06398. Reports LiNbO3 as a leading EO platform and r33 near 31 pm/V; useful for field-to-index estimates.
- mercante-2018-tfln: Thin film lithium niobate electro-optic modulator with terahertz operating bandwidth; A. J. Mercante et al.; Optics Express; 2018; DOI 10.1364/OE.26.014810; https://muri2.engr.utexas.edu/sites/default/files/publication/oe-26-11-14810.pdf. Demonstrates very high EO bandwidth while still using guided-wave overlap and mm-scale interaction lengths.
- li-2005-lc-indices: Refractive Indices Of Liquid Crystals And Their Applications In Display And Photonic Devices; J. Li; University of Central Florida dissertation; 2005; https://stars.library.ucf.edu/etd/388/. Documents large LC birefringence scale; supports LC as high-index-change but slower/geometry-constrained control.
- rp-photonics-aom: Acousto-optic Modulators; RP Photonics Encyclopedia; Technical encyclopedia; 2026; https://www.rp-photonics.com/acousto_optic_modulators.html. Summarizes typical AOM acoustic wavelengths of 10-100 micrometers and RF scale, reinforcing the optical-period backreflection mismatch.
- baldry-2004-vph: Volume Phase Holographic Gratings: Polarization Properties and Diffraction Efficiency; I. K. Baldry, J. Bland-Hawthorn, J. G. Robertson; PASP / arXiv; 2004; https://arxiv.org/abs/astro-ph/0402402. Gives volume holographic grating efficiency dependence on Delta n, thickness, period, and polarization.
- tonkaev-2020-mie: High-Q dielectric Mie-resonant nanostructures; P. Tonkaev and Y. Kivshar; arXiv mini-review; 2020; https://arxiv.org/abs/2010.10854. Supports dielectric resonator and high-Q nanophotonic architectures as real optical interaction platforms.
- krasnok-2017-rdn: Spectroscopy and Biosensing with Optically Resonant Dielectric Nanostructures; A. Krasnok, M. Caldarola, N. Bonod, and A. Alu; arXiv review; 2017; https://arxiv.org/abs/1710.10233. Documents resonant dielectric nanoparticle scattering and index-sensitive resonance behavior.
- lange-2026-photorefraction: Photorefraction Management in Lithium Niobate Waveguides; N. A. Lange et al.; arXiv; 2026; https://arxiv.org/abs/2601.15817. Treats photorefraction as a real optically induced index change but also as a stability/power-management concern.
- rego-2024-thermo-optic: Temperature Dependence of the Thermo-Optic Coefficient of Silica-Based Optical Fibers; G. M. Rego et al.; Sensors / PMC; 2024; DOI 10.3390/s24030938; https://pmc.ncbi.nlm.nih.gov/articles/PMC10819995/. Provides silica thermo-optic coefficient scale; useful for temperature-rise and diffusion rejection checks.

## First-Principles Feasibility Checks

| mechanism | required | demonstrated/reference | required / demonstrated | result |
| --- | --- | --- | ---: | --- |
| Localized Bragg reflection over 0.8 mm | Delta n ~= 1.312e-4 for 25% ideal local reflectance | Current permanent Delta n = 0.0001 | 1.31 | Requires about current-scale coupling for 25%, but higher targets require several times current Delta n. |
| Bulk LiNbO3 Pockels index shift | Delta n ~= 1.312e-4 over the active length | At 10 V/um, rough Delta n ~= 5.231e-4 | 0.251 | EO can plausibly tune phase/resonance, but direct full Bragg coupling modulation is field-geometry limited. |
| Liquid-crystal birefringence switching | Delta n scale 1e-4 to 1e-3 for coupling or resonance tuning | Representative birefringence can be ~0.100 | 0.0100 | Large optical anisotropy is attractive; speed, scattering, alignment, and layered geometry dominate feasibility. |
| Acoustic direct backward grating | Acoustic period near 200 nm for first-order backward Bragg momentum | Typical AOM acoustic wavelength is about 10-100 micrometers | 50.0 | REJECT: direct acoustic optical-period grating remains mismatched by tens to hundreds of times even before power/localization. |
| Q=100 resonator half-linewidth tuning | Index shift ~= 0.0075 | 10 V/um LiNbO3 rough Delta n ~= 5.231e-4 | 14.3 | Ordinary EO index shift is too small for low-Q resonators; high-Q or LC/phase leverage is required. |
| Thermo-optic resonator tuning | Index shift ~= 0.0075 for Q=100 half-linewidth | 10 K silica-like thermal shift ~= 1.000e-4 | 75.0 | REJECT for fast bulk voxel switching: temperature rise and diffusion are not compatible with sharp moving depth. |

## Rejected Architectures

- Locally written / induced backward Bragg grating: Backward Bragg period is about 200 nm; acoustic waves are typically orders of magnitude too coarse, while optical writing has power/persistence issues.
- Optically controlled / photorefractive activation: Fast strong writing tends to require high optical fluence, persistence/erase management, or absorption.
- Thermo-optic activation: Required temperature rises for large optical shifts are high, and diffusion destroys fast sub-mm localization.

## Surviving Candidates

### 1. Hybrid static momentum + electro-optic switchable coupling

Why it survives: It preserves a permanent phase-matching structure but makes the ON/OFF optical interaction a local electronic material requirement.

Primary physical advantage: Fast control and a clear switchable-kappa model target.

Primary unresolved risk: Electrode geometry may not localize strong fields through bulk depth without layered construction.

Next experiment/model needed: Implement a switchable-kappa CMT reference with explicit kappa_off, kappa_on, active width, and field-localization assumptions.
### 2. Discrete EO/LC active planes

Why it survives: It relaxes continuous-depth field localization and trades it for manufacturable plane addressing.

Primary physical advantage: Electronic plane selection could be practical while inactive plane loss is directly quantifiable.

Primary unresolved risk: Many planes demand very low per-plane haze/loss and may produce discrete depth artifacts.

Next experiment/model needed: Build a layered loss/efficiency model tied to target depth resolution and acceptable inactive transmission.
### 3. Sparse resonant-scatterer or resonator planes

Why it survives: It can create a stronger localized optical event than weak bulk Bragg reflection and may improve viewing geometry.

Primary physical advantage: Resonant scattering gives optical leverage and can be placed only where needed.

Primary unresolved risk: Inactive transparency, linewidth control, and material tuning response are unresolved.

Next experiment/model needed: Model Q, filling fraction, inactive detuning, switching shift, and cumulative haze for sparse planes.
### 4. Locally gated phase-defect grating

Why it survives: It may create a localized resonant state without tuning the entire grating into resonance.

Primary physical advantage: Uses coherent resonance for high optical interaction from a compact defect.

Primary unresolved risk: Moving or electronically creating the defect may be as hard as the original localization problem.

Next experiment/model needed: Create a transfer-matrix defect-grating reference model only after defining a plausible phase-control mechanism.

## Headless Reference Models

This packet implements compact algebraic reference models rather than production simulator modes:

- Bragg-like local interaction strength: required kappa and Delta n versus active thickness.
- Switchable-kappa reference: required kappa_on/kappa_off for background suppression and 25% active reflection.
- Resonator switching: linewidth and index/temperature shift versus Q.
- Discrete active-plane accumulation: total inactive transmission versus plane count and per-plane loss.

## Resonant-Scatterer Switching

| Q | linewidth | half-linewidth Delta n | EO field for half-linewidth | temperature rise for half-linewidth |
| ---: | ---: | ---: | ---: | ---: |
| 20 | 30.0 nm | 0.0375 | 7.168e+8 V/m | 3.75e+3 K |
| 50 | 12.0 nm | 0.0150 | 2.867e+8 V/m | 1.50e+3 K |
| 100 | 6.00 nm | 0.00750 | 1.434e+8 V/m | 750 K |
| 250 | 2.40 nm | 0.00300 | 5.735e+7 V/m | 300 K |
| 500 | 1.20 nm | 0.00150 | 2.867e+7 V/m | 150 K |
| 1000 | 0.600 nm | 7.500e-4 | 1.434e+7 V/m | 75.0 K |

Low-Q resonators require very large index shifts. High-Q resonators reduce the tuning burden but increase angular, spectral, and fabrication sensitivity.

## Continuous vs Discrete Depth

| planes | T at 1e-4 loss/plane | T at 5e-4 | T at 1e-3 | T at 2e-3 |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 0.995 | 0.975 | 0.951 | 0.905 |
| 100 | 0.990 | 0.951 | 0.905 | 0.819 |
| 200 | 0.980 | 0.905 | 0.819 | 0.670 |
| 500 | 0.951 | 0.779 | 0.606 | 0.368 |

For 200 planes, 0.01% inactive loss per plane still leaves about 98% transmission, while 0.1% loss per plane leaves about 82%. This makes inactive plane loss a first-order architecture requirement, but it does not rule out discrete planes.

## Control Mechanism Comparison

- Electro-optic: leading dynamic mechanism; fast and mature, but bulk field localization is the hard problem.
- Acousto-optic: no longer leading for direct optical-period grating generation; remains plausible as a moving gate, phase shifter, or defect/resonance actuator.
- Optical / photorefractive: useful for slow or written structures, but display-rate erase/persistence/power constraints are severe.
- Thermo-optic: rejected for fast localized switching because heat diffusion and required temperature rise conflict with sub-mm moving regions.
- Liquid crystal: attractive for large index contrast in layered/discrete architectures; less credible as arbitrary fast 3D bulk addressing.

## Candidate Ranking

1. Hybrid static momentum + electro-optic switchable coupling: Fast control and a clear switchable-kappa model target. Risk: Electrode geometry may not localize strong fields through bulk depth without layered construction.
2. Discrete EO/LC active planes: Electronic plane selection could be practical while inactive plane loss is directly quantifiable. Risk: Many planes demand very low per-plane haze/loss and may produce discrete depth artifacts.
3. Sparse resonant-scatterer or resonator planes: Resonant scattering gives optical leverage and can be placed only where needed. Risk: Inactive transparency, linewidth control, and material tuning response are unresolved.
4. Locally gated phase-defect grating: Uses coherent resonance for high optical interaction from a compact defect. Risk: Moving or electronically creating the defect may be as hard as the original localization problem.

## Required Conclusions

- Trough: `THE BIASED STRAIN-TROUGH ARCHITECTURE IS RETAINED AS A VALIDATED RESEARCH REFERENCE BUT IS NO LONGER THE ASSUMED FORWARD ARCHITECTURE`
- Architecture reset: `MULTIPLE ALTERNATIVE ARCHITECTURES REMAIN CREDIBLE AND REQUIRE TARGETED FOLLOW-UP`
- Coupling: `LOCALLY SWITCHING OPTICAL COUPLING IS A CREDIBLE PATH FORWARD`
- Continuous vs discrete: `DISCRETE ACTIVE PLANES ARE A CREDIBLE COMPETING ARCHITECTURE`
- Dynamic control: `ELECTRO-OPTIC CONTROL IS THE LEADING DYNAMIC MECHANISM`. EO control is fastest and most mature for synchronized switching, but field localization may force a discrete or layered architecture.
- Next architecture: `ADVANCE MULTIPLE SURVIVING ARCHITECTURES TO SMALL TARGETED FEASIBILITY STUDIES`

## Recommended Next Work

Create small targeted feasibility studies for the top two directions: a switchable-kappa static-momentum plus EO-control model, and a discrete active-plane loss/efficiency model. Do not resume detailed strain-trough mechanics until one of these architecture gates fails or explicitly requires comparison.
