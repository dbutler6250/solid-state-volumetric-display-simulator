# Electro-Optic Discrete-Plane Feasibility Study

Issue: #86

## Executive Summary

WP-v2-18 asks whether the WP-v2-17 switchable-kappa parameter can be tied to a credible electro-optic material/device mechanism. The central result is that a uniform bulk Pockels shift is not enough: if both grating regions see the same EO coefficient and field, the grating contrast is nearly unchanged and the response is mostly common-mode Bragg detuning.

The ideal WP-v2-17 10-plane reference at 600 nm requires grating-contrast modulation from 1.000e-6 to 4.197e-4. In the project convention this is kappa 5.24 1/m to 2.20e+3 1/m, a 420x coupling ratio and Delta kappa 2.19e+3 1/m.

The most relevant physical path is differential EO response: alternating domain orientation, material contrast, field-direction reversal, polarization-selective coupling, or controlled cancellation. Periodic domain engineering is especially attractive because the permanent domain pattern can supply the optical-period spatial harmonic while the electric field controls its amplitude. The barrier is scale: the first-order optical domain period is about 207 nm for the 600.11 nm, n=1.45 reference, and current submicron demonstrations are mostly thin-film or waveguide scale rather than large-aperture bulk display planes.

## Mechanism Definitions

- Direct grating-amplitude modulation changes the periodic index contrast and directly changes kappa.
- Common-mode index shift changes average index and Bragg wavelength; it is not equivalent to switchable kappa.
- Differential EO modulation changes the contrast between grating regions and can realize switchable kappa.
- Polarization-mediated coupling can switch an anisotropic grating if local polarization can be set and reset.
- Phase or symmetry switching cancels or restores net coupling but is sensitive to drift and fabrication mismatch.

## Kappa Requirement

| quantity | value |
| --- | ---: |
| wavelength | 600 nm |
| Delta n OFF | 1.000e-6 |
| Delta n ON | 4.197e-4 |
| kappa OFF | 5.24 1/m |
| kappa ON | 2.20e+3 1/m |
| kappa ratio | 420x |
| Delta kappa | 2.19e+3 1/m |

## Relaxed OFF-State Sweep

| OFF Delta n | minimum useful ON Delta n | ratio | OFF R | ON R | selected fraction | secondary ratio |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000e-6 | 1.750e-4 | 175x | 8.007e-5 | 0.0539 | 0.946 | 3.265e-5 |
| 2.500e-6 | 1.750e-4 | 70.0x | 5.004e-4 | 0.0590 | 0.944 | 2.041e-4 |
| 5.000e-6 | 1.500e-4 | 30.0x | 0.00200 | 0.0529 | 0.919 | 0.00111 |
| 1.000e-5 | 4.197e-4 | 42.0x | 0.00800 | 0.309 | 0.985 | 5.677e-4 |
| 2.500e-5 | 4.197e-4 | 16.8x | 0.0496 | 0.403 | 0.960 | 0.00355 |
| 5.000e-5 | 4.197e-4 | 8.39x | 0.191 | 0.564 | 0.879 | 0.0142 |
| 1.000e-4 | 4.197e-4 | 4.20x | 0.599 | 0.817 | 0.658 | 0.0568 |

Useful performance survives with less than the ideal 420x ratio only if the OFF contrast remains low enough. Once OFF Delta n approaches 1e-4, inactive stack reflectance and neighbor activation risk become central.

## Bulk Pockels Screen

| material | r used | Delta n at demonstrated field | field for ideal ON Delta n | classification |
| --- | ---: | ---: | ---: | --- |
| LiNbO3, favorable r33 orientation | 31.4 pm/V | 8.372e-4 | 2.51 V/um | aggressive but demonstrated |
| LiTaO3, favorable r33 orientation | 30.5 pm/V | 7.900e-4 | 2.66 V/um | aggressive but demonstrated |
| KTP-family crystal | 35.0 pm/V | 4.290e-4 | 3.91 V/um | aggressive but demonstrated |
| High-r33 EO polymer | 100 pm/V | 3.369e-4 | 1.87 V/um | near practical limit |
| BaTiO3 / related ferroelectric | 1.30e+3 pm/V | 0.00449 | 0.0467 V/um | comfortable |

These rows are bulk index-change scales only. They do not prove switchable Bragg coupling unless the device converts the EO response into periodic contrast, phase, polarization, or equivalent kappa change.

## Required Fields And Voltages

| material | Delta n | field | V at 10 um | V at 100 um | V at 1 mm | practicality |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| LiNbO3, favorable r33 orientation | 1.000e-4 | 0.597 V/um | 5.97 V | 59.7 V | 597 V | comfortable |
| LiNbO3, favorable r33 orientation | 4.197e-4 | 2.51 V/um | 25.1 V | 251 V | 2.51e+3 V | aggressive but demonstrated |
| LiNbO3, favorable r33 orientation | 0.00100 | 5.97 V/um | 59.7 V | 597 V | 5.97e+3 V | near practical limit |
| LiTaO3, favorable r33 orientation | 1.000e-4 | 0.633 V/um | 6.33 V | 63.3 V | 633 V | comfortable |
| LiTaO3, favorable r33 orientation | 4.197e-4 | 2.66 V/um | 26.6 V | 266 V | 2.66e+3 V | aggressive but demonstrated |
| LiTaO3, favorable r33 orientation | 0.00100 | 6.33 V/um | 63.3 V | 633 V | 6.33e+3 V | near practical limit |
| KTP-family crystal | 1.000e-4 | 0.932 V/um | 9.32 V | 93.2 V | 932 V | comfortable |
| KTP-family crystal | 4.197e-4 | 3.91 V/um | 39.1 V | 391 V | 3.91e+3 V | aggressive but demonstrated |
| KTP-family crystal | 0.00100 | 9.32 V/um | 93.2 V | 932 V | 9.32e+3 V | near practical limit |
| High-r33 EO polymer | 1.000e-4 | 0.445 V/um | 4.45 V | 44.5 V | 445 V | aggressive but demonstrated |
| High-r33 EO polymer | 4.197e-4 | 1.87 V/um | 18.7 V | 187 V | 1.87e+3 V | near practical limit |
| High-r33 EO polymer | 0.00100 | 4.45 V/um | 44.5 V | 445 V | 4.45e+3 V | implausible |
| BaTiO3 / related ferroelectric | 1.000e-4 | 0.0111 V/um | 0.111 V | 1.11 V | 11.1 V | comfortable |
| BaTiO3 / related ferroelectric | 4.197e-4 | 0.0467 V/um | 0.467 V | 4.67 V | 46.7 V | comfortable |
| BaTiO3 / related ferroelectric | 0.00100 | 0.111 V/um | 1.11 V | 11.1 V | 111 V | comfortable |

## Differential EO Grating

Identical regions under a uniform field give Delta(Delta n_grating) approximately zero. Same-sign material contrast must supply the full differential index shift. Opposite domain orientation halves the required single-domain bulk shift because +r and -r move in opposite directions.

| material | same-sign field for ideal contrast | opposite-domain field |
| --- | ---: | ---: |
| LiNbO3, favorable r33 orientation | 2.51 V/um | 1.25 V/um |
| LiTaO3, favorable r33 orientation | 2.66 V/um | 1.33 V/um |
| KTP-family crystal | 3.91 V/um | 1.96 V/um |
| High-r33 EO polymer | 1.87 V/um | 0.934 V/um |
| BaTiO3 / related ferroelectric | 0.0467 V/um | 0.0234 V/um |

## Periodic-Domain Engineering

A first-order domain-generated Bragg harmonic requires period about 207 nm. Published thin-film/waveguide work has demonstrated submicron periods around 370 nm, 200 nm, and even about 102 nm in research settings, but this is not yet a large-aperture bulk display-plane process.

| harmonic order | period | relative Fourier amplitude | Delta n needed for same kappa |
| ---: | ---: | ---: | ---: |
| 1 | 207 nm | 1.00 | 4.197e-4 |
| 3 | 621 nm | 0.333 | 0.00126 |
| 5 | 1.03e+3 nm | 0.200 | 0.00210 |
| 7 | 1.45e+3 nm | 0.143 | 0.00294 |
| 9 | 1.86e+3 nm | 0.111 | 0.00378 |

Higher-order domain periods are easier to fabricate but lose coupling as 1/order for a square-wave domain pattern, so the required EO contrast rises in proportion to harmonic order.

## Cancellation, Polarization, And Resonance

Cancellation can reduce the required absolute EO shift if two permanent coupling contributions are fabricated with near-equal amplitude and pi phase offset. It is rejected as a leading path because OFF leakage scales directly with amplitude mismatch and phase error, and the target OFF/ON contrast leaves little tolerance for temperature, wavelength, and fabrication drift.

Polarization switching is physically plausible in anisotropic EO materials, but a serial plane stack has a hard systems problem: the selected plane must rotate or select polarization locally without leaving downstream planes in the wrong state, or it must include reset elements that add loss and addressing complexity.

| Q | shift target | equivalent Delta n |
| ---: | ---: | ---: |
| 100 | 1 linewidth | 0.0145 |
| 500 | 1 linewidth | 0.00290 |
| 1000 | 1 linewidth | 0.00145 |
| 5000 | 1 linewidth | 2.900e-4 |
| 10000 | 1 linewidth | 1.450e-4 |

Resonant enhancement materially lowers the EO index shift at high Q, but trades that gain for linewidth, angular sensitivity, thermal drift, and defect-fabrication tolerance.

## Electrode And Addressing Constraints

| geometry | neighbor leakage | neighbor Delta n if selected plane is ideal ON | note |
| --- | ---: | ---: | --- |
| parallel transparent electrodes around plane | 0.0500 | 2.099e-5 | Best reduced-order confinement if guard layers or grounded neighbors are allowed. |
| coplanar edge electrodes | 0.450 | 1.889e-4 | Field fringing is comparable to plane pitch without full FEM optimization. |
| interdigitated electrodes | 0.250 | 1.049e-4 | Can shape lateral field but introduces spatial nonuniformity and optical-metal routing risk. |
| edge-addressed monolithic slab | 0.800 | 3.358e-4 | Low optical insertion loss but poor individual depth selectivity at 1 mm pitch. |

| plane count | two electrodes per plane transmission | shared-electrode transmission |
| ---: | ---: | ---: |
| 10 | 0.818 | 0.895 |
| 20 | 0.669 | 0.810 |
| 50 | 0.366 | 0.599 |
| 100 | 0.134 | 0.362 |

Transparent electrodes are not a harmless implementation detail. Even 99% transmission per electrode leaves only about 13% transmission after 100 planes with two electrodes per plane.

## Switching Speed And Energy

The intrinsic Pockels response is fast, so practical speed is expected to be RC and driver limited. The parallel-plate energy estimate uses 30 relative permittivity and E = 0.5 C V^2.

| area | spacing | voltage | energy |
| ---: | ---: | ---: | ---: |
| 1.00 cm2 | 10.0 um | 12.5 V | 2.086e-7 J |
| 1.00 cm2 | 25.0 um | 31.3 V | 5.216e-7 J |
| 1.00 cm2 | 50.0 um | 62.7 V | 1.043e-6 J |
| 1.00 cm2 | 100 um | 125 V | 2.086e-6 J |
| 1.00 cm2 | 250 um | 313 V | 5.216e-6 J |
| 1.00 cm2 | 500 um | 627 V | 1.043e-5 J |
| 1.00 cm2 | 1.00e+3 um | 1.25e+3 V | 2.086e-5 J |
| 10.0 cm2 | 100 um | 125 V | 2.086e-5 J |
| 100 cm2 | 10.0 um | 12.5 V | 2.086e-5 J |
| 100 cm2 | 25.0 um | 31.3 V | 5.216e-5 J |
| 100 cm2 | 50.0 um | 62.7 V | 1.043e-4 J |
| 100 cm2 | 100 um | 125 V | 2.086e-4 J |

| planes | 30 fps | 60 fps | 120 fps |
| ---: | ---: | ---: | ---: |
| 10 | 300 Hz | 600 Hz | 1.20e+3 Hz |
| 20 | 600 Hz | 1.20e+3 Hz | 2.40e+3 Hz |
| 50 | 1.50e+3 Hz | 3.00e+3 Hz | 6.00e+3 Hz |
| 100 | 3.00e+3 Hz | 6.00e+3 Hz | 1.200e+4 Hz |

## Color, Temperature, Fabrication, And Aperture

A 600 nm Bragg plane is not an RGB reflector. A proof-of-concept should be single-color; RGB would require multiplexed gratings, separate plane structures, or chirped/broadband designs that reopen the OFF-loss and coherence tradeoffs.

Temperature drift is especially dangerous for cancellation and resonant variants. Thermo-optic index changes near 1e-5/K are already comparable to relaxed OFF-state contrast, so active stabilization or a non-cancellation architecture is preferred.

Fabrication feasibility ranks as very high difficulty for periodic-domain EO planes and research-only for BTO/domain-engineered high-r variants at display aperture. Thin-film demonstrations cannot be transferred directly to centimeter-scale free-space bulk planes.

## Material / Device Shortlist

| concept | margin | fabrication class | decision |
| --- | ---: | --- | --- |
| Periodically poled LiNbO3 switchable grating | 3.99 | Research-only | Most physically aligned with switchable kappa, but optical-period domain pitch and aperture scaling are major barriers. |
| EO-polymer differential-index grating | 0.803 | Very High | Field scale is plausible only if a low-loss periodic differential material grating can be fabricated and stabilized. |
| Domain-engineered BaTiO3-like ferroelectric grating | 21.4 | Research-only | Large tensor response is attractive, but bulk/free-space/aperture maturity is the limiting gap. |
| Resonantly enhanced EO defect plane | 2.89 | Very High | Material index shift becomes easier, but spectral, angular, thermal, and fabrication tolerance dominate. |

## Candidate Elimination

- REJECT - uniform common-mode EO tuning as switchable kappa, because identical grating regions do not materially modulate periodic contrast.
- REJECT - simple transparent-electrode-per-plane scaling to 100 planes, because cumulative optical loss becomes a primary limitation.
- REJECT - cancellation as the leading path, because OFF-state suppression depends on unrealistic amplitude, phase, wavelength, and temperature matching.
- REJECT - higher-order periodic-domain coupling as a free fabrication escape, because square-wave Fourier amplitude falls as 1/order.

## Ideal vs Physical Rescore

| case | OFF Delta n | ON Delta n | OFF R | ON R | selected fraction | secondary ratio |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ideal WP-v2-17 | 1.000e-6 | 4.197e-4 | 8.007e-5 | 0.256 | 0.990 | 5.677e-6 |
| physically plausible reduced EO | 2.500e-5 | 2.000e-4 | 0.0496 | 0.184 | 0.844 | 0.0156 |

No high-fidelity Maxwell validation was run for WP-v2-18 because no production solver was changed and the physically credible implementation is still a device-level hypothesis. The appropriate next validation is a narrow device-derived plane model, then selected scattering/Maxwell spot checks if optical performance survives.

## Required Conclusions

- A REDUCED BUT STILL USEFUL FRACTION OF THE WP-v2-17 SWITCHABLE-KAPPA RANGE APPEARS PHYSICALLY ACHIEVABLE
- PERIODIC DOMAIN ENGINEERING IS PHYSICALLY ATTRACTIVE BUT THE REQUIRED OPTICAL-PERIOD DOMAIN SCALE IS A MAJOR BARRIER
- RESONANT ENHANCEMENT MATERIALLY REDUCES THE REQUIRED EO INDEX CHANGE
- ELECTRIC-FIELD CROSS-TALK / ELECTRODE LOSS IS A PRIMARY LIMITATION
- EO-SWITCHED DISCRETE BRAGG PLANES REMAIN PROMISING BUT REQUIRE A DEVICE-LEVEL PROOF OF CONCEPT
- ADVANCE TO A DEVICE-LEVEL ELECTRO-OPTIC PLANE MODEL

## Sources Used For Constants

- liu-2024-ln-review: https://pmc.ncbi.nlm.nih.gov/articles/PMC11636424/ - LiNbO3 linear EO coefficient scale around r33 = 31.45 pm/V and thin-film device context.
- zhou-2023-ktp: https://pmc.ncbi.nlm.nih.gov/articles/PMC9837062/ - Hydrothermal KTP EO coefficient measurements at 632.8 nm consistent with established KTP values.
- castech-ktp: https://www.castech.com/product/KTP---Potassium-Titanyl-Phosphate-186.html - Manufacturer KTP electro-optic coefficient table with r33 about 35-36 pm/V.
- krasnokutska-2021-submicron-ppln: https://arxiv.org/abs/2108.10839 - Submicron LNOI domain engineering with periods down to about 200 nm over mm-scale waveguides.
- opticsexpress-2023-100nm-domain: https://opg.optica.org/oe/abstract.cfm?uri=oe-31-23-37464 - Lithium niobate thin-film domain fabrication down to about 102 nm period in a research setting.
- bi-2023-ultrathin-ito: https://arxiv.org/abs/2310.00984 - 10 nm ITO transparent conductor reported about 91% transmittance at 550 nm; silver grid variant trades about 3% transmittance for lower sheet resistance.
- rp-photonics-pockels: https://www.rp-photonics.com/pockels_effect.html - Pockels effect definition and linear index-change framing.
