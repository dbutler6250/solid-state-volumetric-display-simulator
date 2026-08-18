# WP-v2-08C Independent Optical Validation

## A. Canonical physical model

Both solvers are intended to represent n(z) = n_bar(z) + Delta_n * cos(phi(z)) on the reference z coordinate. Strain modifies n_bar by the first-order photoelastic response and stretches the local grating period by (1 + epsilon). The current validation keeps physical device length and strain-field positions in reference coordinates. Delta n is the sinusoidal peak modulation, not peak-to-peak modulation.

## B. Solver convention audit

| Quantity | CMT | TMM |
| --- | --- | --- |
| epsilon(z) | sampled on reference z | sampled on reference z |
| n_bar(z) | photoelastic first-order | photoelastic first-order |
| Lambda(z) | Lambda0 * (1 + epsilon) | Lambda0 * (1 + epsilon) |
| Delta n modulation | peak sinusoidal delta-n via kappa | peak sinusoidal delta-n in layers |
| grating phase | section phase in coupled coefficient | continuous accumulated local period |
| physical z coordinate | reference length | reference layer thickness |
| device length | 10 mm | 10 mm |
| boundary index | 1.45 | 1.45 |
| laser wavelength | 600.11 nm | 600.11 nm |

## C. Coordinate convention

The implemented convention is reference-z. The grating period is locally stretched, but the model does not integrate a separately deformed device length. Trough width, center, and output positions are reference-coordinate quantities. This resolves the convention explicitly but does not prove it is the only physically useful convention.

## D. Root cause - REQUIRED

multiple contributing causes: full-length TMM convergence is unresolved and the biased trough remains scalar-CMT approximation-sensitive under high background detuning

## E. Uniform-strain parity - REQUIRED

UNIFORM-STRAIN SOLVER PARITY CONFIRMED

Case 1 - uniform globally strained grating

| metric | value |
| --- | --- |
| R_piecewise_analytic | 0.0005654 |
| R_spatial_CMT | 0.0005654 |
| CMT absolute difference | 0.000 |
| R_TMM_at_laser | 0.0005551 |
| TMM energy error at laser | 4.108e-15 |

## F. Piecewise trough comparison - REQUIRED

Case 3 - sharp three-region biased trough

| metric | value |
| --- | --- |
| R_piecewise_analytic | 0.04482 |
| R_spatial_CMT | 0.04482 |
| CMT absolute difference | 0.000 |
| R_TMM_at_laser | 4.785e-7 |
| TMM energy error at laser | 1.710e-14 |

## G. Smooth trough comparison - REQUIRED

Case 4 - smooth WP-v2-08B biased trough

| metric | value |
| --- | --- |
| R_piecewise_analytic | 0.02108 |
| R_spatial_CMT | 0.02108 |
| CMT absolute difference | 0.000 |
| R_TMM_at_laser | 3.027e-7 |
| TMM energy error at laser | 2.887e-15 |

## H. Spectral comparison

| case | CMT peak nm | TMM peak nm | CMT peak R | TMM peak R |
| --- | --- | --- | --- | --- |
| Case 0 - uniform unstrained grating | 600.0 | 600.0 | 0.0006850 | 0.0006831 |
| Case 1 - uniform globally strained grating | 600.4 | 600.4 | 0.0006422 | 0.0006307 |
| Case 3 - sharp three-region biased trough | 600.0 | 600.1 | 0.1473 | 4.785e-7 |
| Case 4 - smooth WP-v2-08B biased trough | 600.0 | 599.9 | 0.2633 | 3.202e-7 |

## I. Numerical convergence

| slices/period | CMT R | TMM R | energy error |
| --- | --- | --- | --- |
| 1 | 0.02108 | 3.027e-7 | 2.887e-15 |
| 2 | 0.02108 | 0.01143 | 2.998e-14 |

## J. Energy conservation

Maximum TMM energy error across reported cases: 3.308e-14.

## K. CMT validity envelope

CMT section multiplication and spatial CMT agree for the sampled piecewise model; TMM agreement is only demonstrated for short, weak uniform gratings, not for the full biased trough.

## L. TMM resolution guidance

Use at least 32 slices/period for short uniform reference cases; full 10 mm trough TMM at 1-2 slices/period remains a low-resolution diagnostic and should not be treated as converged.

## M. Moving-trough confirmation

The prior CMT moving-trough result is preserved but not independently validated here. Mean absolute CMT center error remains 0.1091 mm from the frozen WP-v2-08B artifact.

## N. Array confirmation

The 4-actuator CMT array result remains a CMT-only secondary result: median selectivity 7.622 at 2.000 mm pitch.

## O. Localization metrics

| target | strongest competitor | raw selectivity | target fraction |
| --- | --- | --- | --- |
| 0.6183 | 0.01396 | 44.29 | 0.9779 |

## P. Primary conclusion - REQUIRED HIGHLIGHT

CMT–TMM DISAGREEMENT EXPLAINED — TROUGH REMAINS APPROXIMATION-SENSITIVE

## Q. Architecture decision - REQUIRED HIGHLIGHT

BIASED TROUGH REMAINS PROMISING BUT REQUIRES A HIGHER-FIDELITY OPTICAL MODEL

## R. Documentation

- ARCHITECTURE.md
- RESEARCH.md
- HANDOFF.md
- artifacts/issue-66/trough-optical-validation-study.md
- artifacts/issue-66/trough-optical-validation-study.json

## S. Verification

- `npx.cmd tsx scripts/piezoStrainWindowStudy.mts` - passed; regenerated Issue #66 WP-v2-08B artifacts.
- `npx.cmd tsx scripts/troughOpticalValidationStudy.mts` - passed; regenerated WP-v2-08C artifacts.
- `npm.cmd run test` - passed, 33 files / 218 tests.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run test:browser` - passed, 14 browser tests.

## T. GitHub

Issue #66 / draft PR #67 on branch codex/issue-66-piezo-strain-window-addressing.

## U. Recommended next step

First constrain the optical architecture to the independently validated range, then perform mechanical feasibility against those constraints.

