# Discrete Bragg-Plane Architecture Study

Issue: #84

## Executive Summary

WP-v2-17 tests whether finite Bragg-grating planes separated by transparent gaps can replace the continuous tuned-grating assumption. The gaps do not directly reduce the strain needed for a given Bragg-wavelength shift. The possible advantage is architectural: coupling exists only in predetermined depth regions, so a selected plane can operate near a local ON/OFF threshold while the rest of the volume remains weakly interacting.

Best bounded result: 10 planes, 0.250 mm plane thickness, 1.00 mm pitch, phase-scrambled spacing, and switchable-kappa control. It gives OFF reflectance 8.007e-5, selected-plane ON reflectance 0.256, selected-plane fraction 0.990, and secondary/primary plane ratio 5.677e-6 in the compact coherent CMT model.

## Discrete Architecture Definition

Continuous reference:

```text
| | | | | | | | | | | | | | | | | |
<-------- continuous grating -------->
```

Discrete structure:

```text
||||||      ||||||      ||||||      ||||||
Plane 1     Plane 2     Plane 3     Plane 4
        gap         gap         gap
```

Each plane is a finite volume Bragg grating. Gaps contain no intentional Bragg coupling. Coherent propagation through gaps is retained through complex phase in the CMT section chain.

## Continuous Baseline

The comparison baseline is the merged WP-v2-15 10 mm continuous permanent grating. It had active interaction length about 1.3 mm, biased-background detuning -0.592 nm, background reflectance about 0.0012, and active reflectance about 0.021 for the current uniform baseline. The baseline is not retuned here.

## Single-Plane Coupling Requirements

| plane thickness | R=1% | R=5% | R=10% | R=25% | R=50% | R=75% | R=90% |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.100 mm | 1.917e-4 (1.92x) | 4.345e-4 (4.34x) | 6.255e-4 (6.25x) | 0.00105 (10.5x) | 0.00168 (16.8x) | 0.00252 (25.2x) | 0.00347 (34.7x) |
| 0.250 mm | 7.666e-5 (0.767x) | 1.738e-4 (1.74x) | 2.502e-4 (2.50x) | 4.197e-4 (4.20x) | 6.734e-4 (6.73x) | 0.00101 (10.1x) | 0.00139 (13.9x) |
| 0.500 mm | 3.833e-5 (0.383x) | 8.690e-5 (0.869x) | 1.251e-4 (1.25x) | 2.099e-4 (2.10x) | 3.367e-4 (3.37x) | 5.031e-4 (5.03x) | 6.947e-4 (6.95x) |
| 0.800 mm | 2.396e-5 (0.240x) | 5.431e-5 (0.543x) | 7.819e-5 (0.782x) | 1.312e-4 (1.31x) | 2.105e-4 (2.10x) | 3.145e-4 (3.14x) | 4.342e-4 (4.34x) |
| 1.00 mm | 1.917e-5 (0.192x) | 4.345e-5 (0.434x) | 6.255e-5 (0.625x) | 1.049e-4 (1.05x) | 1.684e-4 (1.68x) | 2.516e-4 (2.52x) | 3.474e-4 (3.47x) |

## Plane Thickness Tradeoff

| plane thickness | kappa L at current Delta n | R at current Delta n | Delta n for 25% | nominal depth resolution |
| ---: | ---: | ---: | ---: | ---: |
| 0.100 mm | 0.0524 | 0.00274 | 0.00105 | 0.100 mm |
| 0.250 mm | 0.131 | 0.0169 | 4.197e-4 | 0.250 mm |
| 0.500 mm | 0.262 | 0.0655 | 2.099e-4 | 0.500 mm |
| 0.800 mm | 0.419 | 0.157 | 1.312e-4 | 0.800 mm |
| 1.00 mm | 0.524 | 0.231 | 1.049e-4 | 1.00 mm |

Thin planes improve depth resolution but quickly become under-coupled. Thick planes improve kappa L but are no longer fine depth elements.

## Plane Spacing And Coherent Phase

Gap phase is not discarded. For a gap `d`, phase advances as `2 pi n d / lambda`. Periodic spacing can create collective cavity/superstructure behavior; mild aperiodicity and phase scrambling are tested as bounded mitigations.

## Periodic vs Aperiodic Results

| best variant | planes | thickness | pitch | OFF R | ON R | selected fraction | secondary ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| periodic | 20 | 0.250 mm | 0.500 mm | 6.635e-6 | 0.251 | 0.993 | 5.677e-6 |
| aperiodic | 20 | 0.250 mm | 0.500 mm | 4.051e-5 | 0.253 | 0.993 | 5.677e-6 |
| phase-scrambled | 10 | 0.250 mm | 1.00 mm | 8.007e-5 | 0.256 | 0.990 | 5.677e-6 |

Aperiodic spacing is retained because it reduces the risk that equal gaps become an unintended superstructure. This packet does not claim optimized spacing.

## Individual Plane Activation And Position Addressing

| selected plane | center | ON R | selected fraction | secondary ratio | center error |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0.500 mm | 0.251 | 0.990 | 5.677e-6 | 0.00 mm |
| 2 | 2.50 mm | 0.254 | 0.990 | 5.677e-6 | 0.00 mm |
| 5 | 5.50 mm | 0.256 | 0.990 | 5.677e-6 | 0.00 mm |
| 7 | 7.50 mm | 0.254 | 0.990 | 5.677e-6 | 0.00 mm |
| 9 | 9.50 mm | 0.251 | 0.990 | 5.677e-6 | 0.00 mm |

The bounded switchable-kappa model can activate front, center, and back planes without relying on a continuous trough. Edge planes remain a fabrication/addressing question, not a completed device design.

## Gap-Phase Sensitivity

| gap error | OFF R | ON R | selected fraction | secondary ratio |
| ---: | ---: | ---: | ---: | ---: |
| -0.0200 mm | 6.266e-8 | 0.282 | 0.992 | 5.677e-6 |
| -0.0100 mm | 1.377e-6 | 0.265 | 0.991 | 5.677e-6 |
| -0.00500 mm | 3.466e-7 | 0.258 | 0.991 | 5.677e-6 |
| 0.00 mm | 8.007e-5 | 0.256 | 0.990 | 5.677e-6 |
| 0.00500 mm | 2.949e-6 | 0.240 | 0.989 | 5.677e-6 |
| 0.0100 mm | 1.088e-6 | 0.233 | 0.989 | 5.677e-6 |
| 0.0200 mm | 1.008e-8 | 0.217 | 0.987 | 5.677e-6 |

Small geometry changes alter the coherent stack response. This supports intentional phase or spacing engineering rather than treating planes as independent mirrors.

## Plane-Count Sweep And Cumulative OFF-State Loss

| design | planes | thickness | spacing | OFF R | ON R | quality | stacked air/glass Fresnel reference |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: |
| switch-10p-0.25mm-phase-scrambled | 10 | 0.250 mm | phase-scrambled | 8.007e-5 | 0.256 | promising | 0.497 |
| switch-20p-0.25mm-aperiodic | 20 | 0.250 mm | aperiodic | 4.051e-5 | 0.253 | promising | 0.747 |
| switch-20p-0.25mm-periodic | 20 | 0.250 mm | periodic | 6.635e-6 | 0.251 | promising | 0.747 |
| switch-10p-0.25mm-aperiodic | 10 | 0.250 mm | aperiodic | 1.265e-5 | 0.252 | promising | 0.497 |
| switch-10p-0.5mm-periodic | 10 | 0.500 mm | periodic | 7.527e-6 | 0.250 | promising | 0.497 |
| switch-10p-0.5mm-aperiodic | 10 | 0.500 mm | aperiodic | 1.211e-5 | 0.249 | promising | 0.497 |
| switch-20p-0.1mm-periodic | 20 | 0.100 mm | periodic | 5.898e-5 | 0.255 | promising | 0.747 |
| switch-20p-0.25mm-phase-scrambled | 20 | 0.250 mm | phase-scrambled | 2.765e-6 | 0.248 | promising | 0.747 |
| switch-10p-0.8mm-periodic | 10 | 0.800 mm | periodic | 1.850e-6 | 0.247 | promising | 0.497 |
| switch-10p-0.25mm-periodic | 10 | 0.250 mm | periodic | 1.829e-6 | 0.249 | promising | 0.497 |
| switch-50p-0.1mm-phase-scrambled | 50 | 0.100 mm | phase-scrambled | 2.793e-7 | 0.250 | promising | 0.968 |
| switch-50p-0.1mm-periodic | 50 | 0.100 mm | periodic | 2.602e-7 | 0.250 | promising | 0.968 |
| switch-20p-0.1mm-aperiodic | 20 | 0.100 mm | aperiodic | 1.031e-5 | 0.252 | promising | 0.747 |
| switch-10p-0.8mm-phase-scrambled | 10 | 0.800 mm | phase-scrambled | 8.713e-6 | 0.245 | promising | 0.497 |
| switch-50p-0.1mm-aperiodic | 50 | 0.100 mm | aperiodic | 5.880e-6 | 0.248 | promising | 0.968 |
| switch-20p-0.1mm-phase-scrambled | 20 | 0.100 mm | phase-scrambled | 1.066e-8 | 0.250 | promising | 0.747 |

If planes are physically bonded plates with unmatched interfaces, cumulative Fresnel reflection is unacceptable. The continuous-substrate written-region variant is therefore strongly preferred for optical feasibility.

## TMM / Scattering / Maxwell Status

This packet uses the coupled-mode section scattering model for the Bragg-plane/gap stack because it preserves complex gap phase and directly represents switchable plane coupling. Full Maxwell validation was not run across this new architecture class; the current Maxwell path remains tied to represented continuous or locally periodic grating assumptions and should be extended only after a narrower discrete-plane candidate is selected.

## Switchable-Kappa Variant

The best switchable-kappa design uses off Delta n 1.000e-6 and on Delta n 4.197e-4. The implied grating-contrast modulation factor is 420. The direct EO field equivalent for the on Delta n scale is about 8.03 V/um, but this is only a material-response scale; electrode localization is not solved.

## Resonant / Defect-Plane Variant

| Q | linewidth | required shift | equivalent strain | EO field scale | interpretation |
| ---: | ---: | ---: | ---: | ---: | --- |
| 50 | 12.0 nm | 6.00 nm | 1.302e+4 microstrain | 277 V/um | tuning burden remains large for low-Q defect planes |
| 100 | 6.00 nm | 3.00 nm | 6.51e+3 microstrain | 139 V/um | tuning burden remains large for low-Q defect planes |
| 250 | 2.40 nm | 1.20 nm | 2.60e+3 microstrain | 55.4 V/um | tuning burden remains large for low-Q defect planes |
| 500 | 1.20 nm | 0.600 nm | 1.30e+3 microstrain | 27.7 V/um | smaller tuning than direct Bragg detuning, but narrowband and fabrication-sensitive |
| 1000 | 0.600 nm | 0.300 nm | 651 microstrain | 13.9 V/um | smaller tuning than direct Bragg detuning, but narrowband and fabrication-sensitive |

High-Q defect planes can reduce wavelength-shift requirements, but the price is linewidth, angular tolerance, and fabrication sensitivity. This is not preferred over direct plane activation yet.

## Spectrally Staggered Planes

| planes | wavelength step | small local tuning | equivalent strain | consequence |
| ---: | ---: | ---: | ---: | --- |
| 10 | 0.0444 nm | 0.0222 nm | 48.2 microstrain | depth-address wavelength and visible display color become coupled unless a separate control/readout scheme is introduced |
| 20 | 0.0211 nm | 0.0105 nm | 22.8 microstrain | depth-address wavelength and visible display color become coupled unless a separate control/readout scheme is introduced |
| 50 | 0.00816 nm | 0.00408 nm | 8.85 microstrain | depth-address wavelength and visible display color become coupled unless a separate control/readout scheme is introduced |
| 100 | 0.00404 nm | 0.00202 nm | 4.38 microstrain | depth-address wavelength and visible display color become coupled unless a separate control/readout scheme is introduced |

Spectral staggering can reduce local tuning per plane, but it couples depth selection to wavelength unless a separate control/readout architecture is modeled.

## Control-Method Comparison

- Electro-optic plane activation is the leading concept because it aligns with WP-v2-16 and can, in principle, switch fast without moving the bulk.
- Strain activation remains useful as a comparison. Discrete planes do not change the strain required for a fixed Bragg shift, but isolated planes may reduce the required shift relative to the old global detuning strategy.
- Acoustic selection is plausible as a plane selector, phase modulator, or EO assist because plane pitch is now much larger than the optical period; it is not revived as the source of the optical-period grating.
- Thermo-optic control remains a reference/rejected fast-control path because diffusion and heat load conflict with moving sub-mm depth selection.

## Fabrication Comparison

- Stacked VBG plates: conceptually simple, but physical interfaces create severe cumulative Fresnel/reflection and alignment burdens.
- Written grating regions inside one substrate: preferred optical construction if fabrication can localize finite grating regions without interfaces.
- Layered EO/grating films: plausible for discrete addressing, but optical loss and transparent electrodes become central.
- Bonded thin optical wafers: possible research path, likely requires AR/index matching at every interface.
- Periodically poled or structured regions: relevant for EO/nonlinear variants, not yet a direct Bragg-plane solution.

## Continuous vs Discrete Comparison

| Metric | Continuous grating | Discrete Bragg planes |
| --- | --- | --- |
| Active interaction length | 1.3 mm trough plus transitions | 0.25 mm selected plane |
| Required Delta n | 2.10e-4 for 0.8 mm / 50% ideal reference | 4.197e-4 for selected-plane 25% reference |
| Equivalent strain | about 1500 microstrain for -0.592 nm biased-background detuning | not applicable for switchable-kappa threshold case; direct detuned-plane variants convert wavelength shift to strain separately |
| OFF reflectance | about 0.0012 in WP-v2-15 current uniform baseline | 8.007e-5 |
| ON reflectance | about 0.021 in WP-v2-15 current uniform baseline | 0.256 |
| Spatial localization | solver-derived trough region, fragile under stronger coupling | 0.990 selected-plane fraction |
| Position sensitivity | moving trough remains limited by optical/mechanical gates | front/center/back planes tested with selected-plane activation |
| Cumulative loss | continuous coherent participation | 0.497 Fresnel reference if stacked air/glass interfaces; near-zero only for written continuous-substrate planes |
| Fabrication complexity | single VBG plus demanding local tuning | moderate to high; continuous-substrate written regions strongly preferred over bonded plates |

## Required Conclusions

- Strain / tuning: `DISCRETE BRAGG PLANES PROVIDE A MODEST REDUCTION IN REQUIRED LOCAL TUNING / STRAIN`
- Localization: `STRUCTURAL PLANE SEPARATION IMPROVES LOCALIZATION BUT COHERENT INTER-PLANE COUPLING REMAINS SIGNIFICANT`
- Coherence: `INTER-PLANE COHERENCE REQUIRES INTENTIONAL PHASE / SPACING ENGINEERING`
- Plane count: useful plane count is primarily limited by cumulative OFF-state interaction and fabrication/interface loss across the tested 10-100 plane range.
- Control: `ELECTRO-OPTICALLY ACTIVATED DISCRETE BRAGG PLANES ARE THE LEADING CONTROL CONCEPT`
- Architecture: `DISCRETE BRAGG PLANES ARE A CREDIBLE COMPETING ARCHITECTURE BUT NOT YET PREFERRED`
- Continuous vs discrete display: `DISCRETE DEPTH ADDRESSING IS OPTICALLY PROMISING BUT REQUIRES FABRICATION / ADDRESSING VALIDATION`

## Recommended Next Work Packet

Run a narrower electro-optic discrete-plane feasibility packet: define transparent-electrode/layer geometry assumptions, separate continuous-substrate written regions from bonded plates, and model whether EO field localization can select one plane without unacceptable optical loss.
