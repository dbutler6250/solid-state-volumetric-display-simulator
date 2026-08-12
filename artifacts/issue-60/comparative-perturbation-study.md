# WP-v2-05A Comparative Perturbation-Field Study

All results are simulation results under the current scalar, lossless, prescribed-strain spatial CMT model. Periodic-field active-region counts use a local Bragg-alignment proxy because the current solver reports whole-grating reflectance, not reflected-power density versus depth.

## A. Common simulation configuration

- lambda_B: 600.0100 nm
- lambda_laser primary baseline: 600.1100 nm
- Delta lambda_laser: 0.1000 nm
- n_bar: 1.45
- Delta n: 0.0001
- kappa: 523.590 1/m
- grating length: 10 mm
- kappa L: 5.236
- segment count: 700
- peak strain baseline: 0.0001
- L_c = 1/kappa: 1.910 mm

## B. Normalization methods

- Equal peak strain keeps `max |epsilon(z)| = 1e-4`.
- Equal strain-energy proxy rescales peak strain so `integral epsilon(z)^2 dz` matches the rectangular localized baseline.

## C. Comparative field table

| Perturbation | Normalization | Peak enhancement | Secondary ratio | Response width | Active regions | Activation spacing mm | Classification |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| rectangular | peak-strain | 0.135 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| gaussian | peak-strain | 0.105 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| smooth-top-hat | peak-strain | 0.137 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| triangular | peak-strain | 0.065 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| carrier-envelope | peak-strain | 0.029 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| traveling-sinusoid | peak-strain | 4.30e-3 | 0.00e+0 | 1.675 rad | 11 | 1.000 | single-dominant |
| standing-wave | peak-strain | 4.91e-3 | 1.000 | n/a rad | 11 | 1.000 | multi-peak |
| multi-tone | peak-strain | 0.408 | 0.999 | n/a rad | 7 | 1.350 | multi-peak |
| rectangular | strain-energy-proxy | 0.135 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| gaussian | strain-energy-proxy | 0.126 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| smooth-top-hat | strain-energy-proxy | 0.121 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| triangular | strain-energy-proxy | 0.140 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| carrier-envelope | strain-energy-proxy | 0.057 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| traveling-sinusoid | strain-energy-proxy | 3.80e-3 | 0.00e+0 | 1.986 rad | 11 | 1.000 | single-dominant |
| standing-wave | strain-energy-proxy | 3.80e-3 | 1.000 | n/a rad | 11 | 1.000 | multi-peak |
| multi-tone | strain-energy-proxy | 0.058 | 0.571 | 6.231 rad | 7 | 1.350 | multi-peak |

## D. MOST PROMISING PERTURBATION FIELD

MOST PROMISING PERTURBATION FIELD: multi-tone

Best scored case: two-tone-Lc-beat; peak enhancement 0.219, secondary ratio 0.436, phase response width 1.762 rad, activation proxy width 1.100 mm, active regions 2.

## E. Localized field conclusion

LOCALIZED MOVING-FIELD LIMITATION REMAINS

| Perturbation | Normalization | Peak enhancement | Secondary ratio | Response width | Active regions | Activation spacing mm | Classification |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| rectangular | peak-strain | 0.135 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| gaussian | strain-energy-proxy | 0.126 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| smooth-top-hat | peak-strain | 0.104 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| triangular | strain-energy-proxy | 0.140 | 1.000 | n/a mm | 1 | n/a | multi-peak |
| carrier-envelope | peak-strain | 0.080 | 0.656 | 3.180 mm | 1 | n/a | multi-peak |

Smooth and shaped localized fields changed the interference pattern, but none produced a clean, robust single moving plane across the baseline and matched-energy comparisons. The best smooth top-hat edge cases reduced some secondary structure only by trading away activation compactness or peak response.

## F. Continuous traveling-wave conclusion

CONTINUOUS TRAVELING ULTRASOUND PRODUCES PERIODIC MULTI-PLANE RESPONSE

| Perturbation | Normalization | Peak enhancement | Secondary ratio | Response width | Active regions | Activation spacing mm | Classification |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| traveling-sinusoid | peak-strain | 0.018 | 1.000 | n/a rad | 11 | 0.955 | multi-peak |
| traveling-sinusoid | peak-strain | 0.055 | 1.000 | n/a rad | 6 | 1.910 | multi-peak |
| traveling-sinusoid | peak-strain | 0.227 | 1.000 | n/a rad | 3 | 3.825 | multi-peak |
| traveling-sinusoid | peak-strain | 0.088 | 0.997 | n/a rad | 2 | 7.650 | multi-peak |
| traveling-sinusoid | peak-strain | 0.073 | 0.993 | n/a rad | 1 | n/a | multi-peak |

## G. Standing-wave conclusion

| Perturbation | Normalization | Peak enhancement | Secondary ratio | Response width | Active regions | Activation spacing mm | Classification |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| standing-wave | peak-strain | 3.42e-4 | 1.000 | n/a rad | 22 | 0.476 | multi-peak |
| standing-wave | peak-strain | 0.014 | 0.852 | n/a rad | 11 | 0.955 | multi-peak |
| standing-wave | peak-strain | 0.055 | 0.998 | n/a rad | 6 | 1.910 | multi-peak |
| standing-wave | peak-strain | 0.192 | 0.459 | 1.277 rad | 3 | 3.825 | multi-peak |
| standing-wave | peak-strain | 0.086 | 0.998 | n/a rad | 2 | 7.650 | multi-peak |

Standing-wave excitation preserves a periodic strain/alignment pattern in the local diagnostic. Whole-grating reflectance remains a coherent integral over that pattern, so the visible optical response is partly rearranged by Bragg interference rather than a direct picture of strain antinodes.

## H. Two-tone conclusion

| Perturbation | Normalization | Peak enhancement | Secondary ratio | Response width | Active regions | Activation spacing mm | Classification |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| multi-tone | peak-strain | 0.408 | 0.999 | n/a rad | 7 | 1.350 | multi-peak |
| multi-tone | peak-strain | 0.056 | 0.746 | 6.231 rad | 7 | 1.600 | multi-peak |
| multi-tone | peak-strain | 0.219 | 0.436 | 1.762 rad | 2 | 5.725 | multi-peak |
| multi-tone | peak-strain | 0.058 | 0.654 | 6.231 rad | 6 | 1.975 | multi-peak |

Two-tone interference creates a stronger spatial envelope than a single sinusoid in the local alignment proxy. Under the whole-grating CMT metric it remains conditional: it is more promising as a phase-addressable or periodic-plane architecture than as a clean single localized moving plane.

## I. Phase-controlled translation conclusion

Relative phase control translated the inferred activation maximum over 10.000 mm in the sampled two-tone case. Whole-grating reflectance variation across the sampled phases was 0.048.

| Relative phase rad | Predicted envelope mm | Measured activation mm | Reflectance |
| ---: | ---: | ---: | ---: |
| 0.00e+0 | 0.00e+0 | 0.00e+0 | 0.413 |
| 0.393 | 7.000 | 7.000 | 0.409 |
| 0.785 | 7.500 | 1.025 | 0.393 |
| 1.178 | 8.025 | 8.025 | 0.375 |
| 1.571 | 1.500 | 7.975 | 0.366 |
| 1.963 | 2.000 | 2.000 | 0.370 |
| 2.356 | 9.000 | 9.000 | 0.386 |
| 2.749 | 9.500 | 3.000 | 0.403 |
| 3.142 | 10.000 | 10.000 | 0.413 |
| 3.534 | 3.475 | 9.975 | 0.410 |
| 3.927 | 4.000 | 4.000 | 0.397 |
| 4.320 | 4.500 | 5.025 | 0.382 |
| 4.712 | 5.000 | 5.000 | 0.373 |
| 5.105 | 5.525 | 4.975 | 0.377 |
| 5.498 | 5.475 | 6.025 | 0.391 |
| 5.890 | 6.000 | 6.000 | 0.406 |

## J. Important dimensionless length-scale relationships

- Localized widths near `0.5 L_c` to `1 L_c` gave the strongest responses but still showed comparable secondary peaks.
- Carrier-envelope packets with many carrier cycles tended toward multi-region behavior; sub-cycle packets behaved more like broad Gaussian-localized strain.
- Traveling and standing periods near or above `L_c` preserved clearer periodic activation than periods far below `L_c`.
- Two-tone beat lengths of several `L_c` produced the clearest inferred envelope translation, but whole-grating reflectance did not isolate one plane cleanly.

## K. Robustness / numerical convergence

The study runner used 700 CMT segments for the main pass and reran the best multi-tone and standing-wave candidates at 1400 and 2100 segments.

| Case | Segments | Peak enhancement | Secondary ratio | Phase response width | Activation proxy width mm | Active regions | Activation spacing mm | Classification |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| multi-tone-Lc-beat | 700 | 0.219 | 0.436 | 1.762 rad | 1.100 | 2 | 5.725 | multi-peak |
| multi-tone-Lc-beat | 1400 | 0.219 | 0.436 | 1.762 rad | 1.100 | 2 | 5.725 | multi-peak |
| multi-tone-Lc-beat | 2100 | 0.219 | 0.436 | 1.762 rad | 1.100 | 2 | 5.725 | multi-peak |
| standing-Lambda-2Lc | 700 | 0.192 | 0.459 | 1.277 rad | 3.125 | 3 | 3.825 | multi-peak |
| standing-Lambda-2Lc | 1400 | 0.192 | 0.459 | 1.277 rad | 3.125 | 3 | 3.825 | multi-peak |
| standing-Lambda-2Lc | 2100 | 0.192 | 0.459 | 1.277 rad | 3.125 | 3 | 3.825 | multi-peak |

The high-segment rerun preserves the qualitative ranking: multi-tone remains the stronger phase-addressable candidate, and the standing-wave case remains conditional with comparable secondary structure. Fine numerical values should still be treated as scalar-CMT results, not experimental predictions.

## L. TMM spot checks

No independent TMM spot checks were added in this pass because the existing TMM comparison is not exposed as a direct generalized-field spot-check helper. Cases remain scalar-CMT results.

## M. Display-architecture implications

- Localized packets imply one scanned active depth plane, but the current model still shows strong finite-grating interference.
- Traveling sinusoids imply periodic moving activation planes.
- Standing waves imply simultaneous stationary periodic planes.
- Two-tone fields imply electronically translated or rearranged activation envelopes.

## N. Physical-generation questions that remain

Physical generation was deliberately not ranked. Remaining questions include whether the required strain amplitudes, periods, phase stability, and beat envelopes can be generated by acoustic, piezoelectric, electro-optic, thermal, or mechanical mechanisms in the target medium.

## O. Documentation changes

This generated report is intended to be summarized into `RESEARCH.md`, `HANDOFF.md`, and `MILESTONES.md`.
