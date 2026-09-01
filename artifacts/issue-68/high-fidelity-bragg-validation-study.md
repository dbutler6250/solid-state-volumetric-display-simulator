# WP-v2-09B Locally Periodic Long-Grating Maxwell Validation

## A. Solver extension
The Maxwell solver now supports locally periodic mechanical-envelope blocks. Each block samples the existing strain/material model once, treats the microscopic carrier as an explicit sinusoidal Maxwell medium, composes complete periods with stable repeated-cell scattering, and appends an exact-length partial period when the block does not end on a period boundary.

## B. Phase continuity
The solver carries a running microscopic phase between mechanical blocks using `d phi / dz = 2 pi / Lambda(z)`. Blocks do not reset to a cosine maximum unless the physical input phase says so.

## C. Fractional-period handling
The fractional validation used 10.65 periods and preserved length 2.2035e-6 m. R error versus explicit discretization was 1.9867e-13.

## D. Acceleration validation
| N periods | R explicit | R accelerated | |Delta R| | |Delta T| |
| --- | --- | --- | --- | --- |
| 1 | 1.1693e-8 | 1.1693e-8 | 0.0000 | 0.0000 |
| 2 | 4.6770e-8 | 4.6770e-8 | 3.3087e-23 | 0.0000 |
| 5 | 2.9231e-7 | 2.9231e-7 | 2.6470e-22 | 2.6645e-15 |
| 10 | 1.1692e-6 | 1.1692e-6 | 2.1176e-21 | 8.5487e-15 |
| 50 | 2.9224e-5 | 2.9224e-5 | 1.9617e-18 | 1.1524e-13 |
| 100 | 0.00011681 | 0.00011681 | 1.4704e-17 | 1.7963e-13 |

## E. Split-grating identity
| blocks | R | T | |R+T-1| |
| --- | --- | --- | --- |
| 1 | 0.0059841 | 0.99402 | 5.8772e-11 |
| 2 | 0.0059841 | 0.99402 | 1.1703e-11 |
| 10 | 0.0059841 | 0.99402 | 3.8920e-12 |
| 100 | 0.0059841 | 0.99402 | 1.3914e-11 |

## F. Optical-period convergence
| samples/period | R_Maxwell | T_Maxwell | |R+T-1| | runtime ms |
| --- | --- | --- | --- | --- |
| 8 | 0.0049644 | 0.99504 | 5.6611e-12 | 0.064300 |
| 16 | 0.0057674 | 0.99423 | 2.4913e-11 | 0.063600 |
| 32 | 0.0059841 | 0.99402 | 5.8772e-11 | 0.066500 |
| 64 | 0.0060394 | 0.99396 | 9.3829e-11 | 0.079500 |

## G. Mechanical-envelope convergence
| blocks | R_Maxwell | T_Maxwell | |R+T-1| | runtime ms |
| --- | --- | --- | --- | --- |
| 25 | 0.0028266 | 0.99717 | 1.1053e-11 | 0.96830 |
| 50 | 0.055712 | 0.94429 | 1.6928e-11 | 1.5436 |
| 100 | 0.025304 | 0.97470 | 1.6906e-12 | 3.4779 |
| 200 | 0.021831 | 0.97817 | 1.5501e-12 | 4.1241 |
| 400 | 0.021204 | 0.97880 | 1.5440e-12 | 9.6359 |

## H. Energy conservation
MAXWELL ENERGY CONSERVATION ACCEPTABLE
Maximum relevant |R + T - 1|: 1.1583e-10.

## I. Full-length uniform-grating result
10 mm uniform spectrum peak R = 0.99938 at 600.02 nm; sampled bandwidth = n/a nm.

## J. Full-length uniform-strain result
R_CMT(lambda_laser) = 0.0012026; R_Maxwell(lambda_laser) = 0.0011831.

## K. Piecewise trough result
R_exact_CMT = 0.041461; R_spatial_CMT = 0.041461; R_Maxwell = 0.043915.

## L. Smooth 10 mm trough - REQUIRED
R_CMT(lambda_laser) = 0.021257; R_Maxwell(lambda_laser) = 0.021204; absolute error = 5.2461e-5; relative error = 0.0024680.
Maxwell peak R = 0.25584 at 600.02 nm; sampled width = n/a nm.

## M. CMT error diagnostics
Detuning, transition-width, and coupling diagnostics are compact controlled checks, not a broad optimization sweep.
| case | parameter | R_CMT | R_Maxwell | |Delta R| |
| --- | --- | --- | --- | --- |
| detuning | bias 0.00075000 | 0.046631 | 0.046406 | 0.00022523 |
| detuning | bias 0.0015000 | 0.021257 | 0.021204 | 5.2461e-5 |
| detuning | bias 0.0030000 | 8.3233e-6 | 9.1068e-6 | 7.8349e-7 |
| transition | edge 0.0000 mm | 0.041461 | 0.043915 | 0.0024532 |
| transition | edge 0.25000 mm | 0.021257 | 0.021204 | 5.2461e-5 |
| transition | edge 0.50000 mm | 0.019131 | 0.019046 | 8.5047e-5 |
| coupling | Delta n 5.0000e-5 | 0.0045363 | 0.0045441 | 7.7549e-6 |
| coupling | Delta n 0.00010000 | 0.021257 | 0.021204 | 5.2461e-5 |
| coupling | Delta n 0.00020000 | 0.13794 | 0.13726 | 0.00068226 |

## N. CMT validity conclusion
SCALAR CMT IS QUANTITATIVELY ADEQUATE FOR THE TROUGH

## O. Maxwell spatial reconstruction
Not implemented in this packet. Boundary optics are converged enough for the reflectance verdict, but no Maxwell spatial localization metric is claimed.

## P. Moving-trough result
MOVING-TROUGH TRACKING REMAINS CMT-ONLY

## Q. 4-actuator result
Not independently tested because comparable Maxwell spatial fields are not available.

## R. Architecture result - REQUIRED HIGHLIGHT
HIGH-FIDELITY MAXWELL MODEL PARTIALLY SUPPORTS THE TROUGH BUT REVISES ITS PERFORMANCE

## S. CMT result - REQUIRED HIGHLIGHT
SCALAR CMT IS QUANTITATIVELY ADEQUATE FOR THE TROUGH

## T. Mechanical gate - REQUIRED HIGHLIGHT
BIASED TROUGH REMAINS OPTICALLY PROMISING BUT MECHANICAL GATE REMAINS CLOSED

## U. Mechanical requirements
Not extracted because the mechanical gate remains closed.

## V. Performance
| case | R | runtime ms | heap delta MB |
| --- | --- | --- | --- |
| stress-1mm | 0.016728 | 0.050800 | 0.0000 |
| stress-5mm | 0.0015577 | 0.022100 | 0.11151 |
| stress-10mm | 0.0059841 | 0.022700 | 0.12883 |
| stress-20mm | 0.020403 | 0.018200 | 0.099129 |
| smooth-spectrum-9pt | 0.25584 | see JSON per point | bounded |

## W. Documentation
- `src/simulation/solvers/maxwell/longGratingScatteringSolver.ts`
- `src/simulation/solvers/maxwell/longGratingScatteringSolver.test.ts`
- `scripts/highFidelityBraggValidationStudy.mts`
- `artifacts/issue-68/high-fidelity-bragg-validation-study.md`
- `artifacts/issue-68/high-fidelity-bragg-validation-study.json`
- `RESEARCH.md`
- `ARCHITECTURE.md`
- `HANDOFF.md`
- `MILESTONES.md`

## X. Verification
Generated by `npx.cmd tsx scripts/highFidelityBraggValidationStudy.mts`. Full test/lint/build/browser results are recorded in `HANDOFF.md` after verification.

## Y. GitHub
Issue #68; branch `codex/issue-68-high-fidelity-bragg-maxwell-solver`; draft PR #69 now targets `main` after PR #67 was merged.

## Z. Recommended next step
Complete Maxwell spatial-field reconstruction before mechanics. The boundary result supports a revised trough response, but moving-trough and array localization remain CMT-only.
