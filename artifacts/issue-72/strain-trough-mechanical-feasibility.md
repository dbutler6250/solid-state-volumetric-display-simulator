# WP-v2-10 Reduced-Order Mechanical Feasibility

## A. PR #71 / baseline state
merged into main as 7785d8b; no comments, reviews, or review threads returned by GitHub inspection

## B. Issue / branch / PR
Issue #72, branch `codex/issue-72-strain-trough-mechanical-feasibility`; draft PR is opened after verification.

## C. Optical requirement
| quantity | value |
| --- | --- |
| totalOpticalLengthMm | 10.000 |
| averageRefractiveIndex | 1.4500 |
| gratingDeltaN | 0.00010000 |
| gratingPeriodNm | 206.90 |
| laserWavelengthNm | 600.11 |
| backgroundBiasStrain | 0.0015000 |
| troughCenterStrain | 0.0000 |
| strainExcursion | 0.0015000 |
| troughCenterMm | 5.0000 |
| troughWidthMm | 0.80000 |
| transitionWidthMm | 0.25000 |
| effectivePhotoelasticCoefficient | 0.22000 |
| cmtResolutionSegments | 360.00 |
| maxwellOpticalSamplesPerPeriod | 8.0000 |
| maxwellMechanicalEnvelopeBlocks | 300.00 |
| targetWidthMm | 1.0000 |
| couplingLengthMm | 1.9102 |
| backgroundBraggWavelengthNm | 600.70 |
| troughBraggWavelengthNm | 600.01 |

## D. Refined tolerance interpretation
PRIOR TOLERANCE RESULT WAS MIXED
| parameter | nominal | prior sweep step | nearest pass | nearest fail |
| --- | --- | --- | --- | --- |
| bias strain | 0.0015000 | 0.00040000 | 0.0015000 | 0.0011000 |
| trough excursion | 0.0015000 | 0.00030000 | 0.0015000 | 0.0012000 |
| trough width mm | 0.80000 | 0.16000 | 0.80000 | 0.64000 |
| position offset mm | 0.0000 | 0.050000 | 0.0000 | -0.050000 |
| laser wavelength nm | 600.11 | 0.040000 | 600.11 | 600.07 |
| refined parameter | lower useful | upper useful |
| --- | --- | --- |
| position offset mm | 0.0000 | 0.010000 |
| trough width mm | 0.80000 | 0.84000 |
| bias strain | 0.0015000 | 0.0015000 |
| trough excursion | 0.0015000 | 0.0015000 |

## E. Mechanical assumptions
Linear small-strain quasi-static 1D mechanics. Host E=2.0000e+9 Pa, A=1.0000e-6 m^2, density=2200.0 kg/m^3. This excludes 3D Poisson effects, bending, edge stress concentrations, adhesive peeling, piezoelectric voltage coupling, modes, fatigue, and thermal effects.

## F. Uniform preload
epsilon=0.0015000, sigma=3.0000e+6 Pa, F=3.0000 N, displacement=1.5000e-5 m, energy=2.2500e-5 J.

## G-M. Mechanical architecture table
| Architecture | Mechanical abstraction | Bias preserved? | Trough strain achieved | Transition error mm | Localization length mm | Cross-talk | Required free strain | Required displacement um | Required force N | R_Maxwell | Optical result | Reduced-order feasibility |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| local force in uniform medium | 1D continuous preloaded bar with a local axial force surrogate | yes | 0.0015000 | -0.25000 | 0.0000 | 0.0000 | n/a | n/a | 3.0000 | 0.0011256 | FAILS MAXWELL OPTICAL TARGET | MECHANICALLY IMPLAUSIBLE UNDER TESTED ASSUMPTIONS |
| preload + active counter-strain | uniform preload plus local negative eigenstrain over the optical trough | partial | 0.0000 | -0.11250 | 1.0375 | 0.99384 | -0.0015000 | 1.2000 | 3.0000 | 0.019913 | PASSES MAXWELL OPTICAL TARGET | MECHANICALLY MARGINAL |
| opposed differential actuator pair | symmetric counter-strain pair represented as a high-transfer local eigenstrain | partial | 6.0000e-5 | -0.10000 | 1.0250 | 0.95409 | -0.0015625 | 1.2500 | 3.0000 | 0.11183 | PARTIALLY PASSES / REVISED OPTICAL TARGET | MECHANICALLY MARGINAL |
| bonded/shear-lag actuator | local actuator free strain transferred through an exponential shear-lag length | partial | 0.0000 | -0.10000 | 0.92500 | 0.89927 | -0.0015000 | 1.2000 | 3.0000 | 0.054030 | PARTIALLY PASSES / REVISED OPTICAL TARGET | MECHANICALLY MARGINAL |
| local stiffness engineering | constant-force bar with locally increased EA | partial | 0.00015000 | -0.062500 | 1.0250 | 0.89446 | n/a | n/a | 3.0000 | 0.24495 | PARTIALLY PASSES / REVISED OPTICAL TARGET | MECHANICALLY MARGINAL |
| mechanically isolated zone | local optical region coupled through compliant effective interfaces | partial | 0.00018000 | 0.35000 | 1.0250 | 0.87458 | -0.0017045 | 1.3636 | 2.6400 | 0.25881 | PARTIALLY PASSES / REVISED OPTICAL TARGET | MECHANICALLY IMPLAUSIBLE UNDER TESTED ASSUMPTIONS |
| small differential actuator array | four mechanically coupled zones with nearest-neighbor leakage | partial | 0.00027000 | 0.35000 | 1.0000 | 0.81495 | -0.0015000 | 1.2000 | 3.0000 | 0.19554 | PARTIALLY PASSES / REVISED OPTICAL TARGET | MECHANICALLY IMPLAUSIBLE UNDER TESTED ASSUMPTIONS |

## O. Target-error table
| Mechanical quantity | Achieved | Optical allowed |
| --- | --- | --- |
| bias error | -3.8723e-5 | 0.0015000 to 0.0015000 |
| trough-depth error | 0.0000 | 0.0015000 to 0.0015000 |
| center error mm | 0.0062500 | 0.0000 to 0.010000 |
| width error mm | 0.23750 | 0.80000 to 0.84000 |
| transition error mm | -0.11250 | not refined |

## P. Maxwell optical rescoring
Best actual field: preload + active counter-strain. R_Maxwell=0.019913, center=4.8947 mm, width=0.64416 mm, target fraction=0.24856, off-target fraction=0.75144, regions=1.

## Q. Main result - REQUIRED HIGHLIGHT
REDUCED-ORDER MECHANICS SHOW A MARGINAL / HIGH-RISK PATH TO THE STRAIN TROUGH

## R. Best mechanical concept
PRELOAD + ACTIVE COUNTER-STRAIN IS THE LEADING MECHANICAL CONCEPT

## S. Mechanical bottleneck - REQUIRED HIGHLIGHT
TRANSITION-WIDTH LOCALIZATION AND POSITION PRECISION ARE THE PRIMARY BOTTLENECKS

## T. Optical result - REQUIRED HIGHLIGHT
MECHANICALLY GENERATED STRAIN FIELD PASSES MAXWELL OPTICAL REQUIREMENT

## U. Detailed-mechanics gate - REQUIRED HIGHLIGHT
DETAILED MECHANICAL MODELING IS JUSTIFIED ONLY FOR A NARROW HIGH-RISK CONCEPT

## V. Documentation / W. Verification / X. GitHub / Y. Recommended next step
Filled during task closeout after tests, docs, draft PR, and CI status are complete.

