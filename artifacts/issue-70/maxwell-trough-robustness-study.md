# WP-v2-09D Maxwell Trough Robustness Envelope

## A. Baseline and provenance
Nominal trough is read from `artifacts/issue-66/piezo-strain-window-study.json` at `bestTrough.design`. PR #67 and PR #69 remain historical inputs; this packet does not reopen them.

## B. Nominal trough configuration
| parameter | value |
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

## C. Useful-state criterion
| threshold | value |
| --- | --- |
| minimumReflectance | 0.012000 |
| maximumCenterErrorMm | 0.35000 |
| maximumRegionWidthMm | 1.1000 |
| maximumOffTargetFraction | 0.78000 |
| minimumTargetFraction | 0.22000 |
| maximumRegionCount | 3.0000 |
These are research thresholds for optical usefulness only, not final display requirements.

## D. Bias-strain robustness
| bias strain | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | competitor | regions | useful | CMT-Maxwell center diff mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.00070000 | 0.0019549 | 1.8936 | -3.1064 | 0.28581 | 0.051809 | 0.94819 | 0.23368 | 20 | false | -1.1202 |
| 0.0011000 | 0.025426 | 2.2399 | -2.7601 | 4.4798 | 0.087936 | 0.91206 | 3.4164 | 3 | false | 0.0037838 |
| 0.0015000 | 0.019814 | 4.8949 | -0.10508 | 0.64413 | 0.24926 | 0.75074 | 0.0000 | 1 | true | -0.0078569 |
| 0.0019000 | 0.035198 | 2.5523 | -2.4477 | 5.1045 | 0.17453 | 0.82547 | 2.7559 | 1 | false | -0.0032811 |
| 0.0023000 | 5.3674e-5 | 4.7364 | -0.26356 | 0.33342 | 0.45906 | 0.54094 | 0.0000 | 6 | false | 0.00032468 |
Tested useful range containing nominal: 0.0015000 to 0.0015000.

## E. Trough-depth robustness
| trough depth | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | competitor | regions | useful | CMT-Maxwell center diff mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.00097500 | 0.0038247 | 5.1233 | 0.12327 | 0.46508 | 0.28585 | 0.71415 | 0.0000 | 1 | false | -0.0017266 |
| 0.0012000 | 0.14928 | 2.4322 | -2.5678 | 4.8645 | 0.089087 | 0.91091 | 4.0193 | 1 | false | 0.0016913 |
| 0.0015000 | 0.019814 | 4.8949 | -0.10508 | 0.64413 | 0.24926 | 0.75074 | 0.0000 | 1 | true | -0.0078569 |
| 0.0018000 | 6.6088e-6 | 4.7375 | -0.26249 | 0.28012 | 0.61346 | 0.38654 | 0.0000 | 2 | false | 0.0013980 |
| 0.0021000 | 0.0030699 | 4.6924 | -0.30756 | 0.18905 | 0.31548 | 0.68452 | 0.0000 | 3 | false | -0.65478 |
Interpretation: optimum operation follows local lambda_B approximately matching the laser more directly than a strict local strain equals zero rule.
Tested useful range containing nominal: 0.0015000 to 0.0015000.

## F. Width robustness
| trough width | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | competitor | regions | useful | CMT-Maxwell center diff mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.28000 | 0.080798 | 2.4362 | -2.5638 | 4.8724 | 0.084445 | 0.91556 | 3.9992 | 1 | false | 0.0056353 |
| 0.40000 | 0.069924 | 2.4525 | -2.5475 | 4.9050 | 0.087933 | 0.91207 | 3.9857 | 1 | false | -0.0057974 |
| 0.64000 | 0.070210 | 2.5307 | -2.4693 | 5.0613 | 0.11004 | 0.88996 | 3.9671 | 1 | false | 0.0028886 |
| 0.80000 | 0.019814 | 4.8949 | -0.10508 | 0.64413 | 0.24926 | 0.75074 | 0.0000 | 1 | true | -0.0078569 |
| 0.96000 | 0.0070306 | 4.9326 | -0.067385 | 0.63841 | 0.51667 | 0.48333 | 0.0000 | 1 | false | 0.0020598 |
Nominal W/Lc = 0.41880.
Tested useful range containing nominal: 0.80000 to 0.80000.

## G. Transition-width robustness
| transition width | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | competitor | regions | useful | CMT-Maxwell center diff mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.0000 | 0.041749 | 2.5097 | -2.4903 | 5.0193 | 0.10518 | 0.89482 | 3.8818 | 1 | false | 0.0096532 |
| 0.080000 | 0.051306 | 2.5499 | -2.4501 | 5.0997 | 0.12556 | 0.87444 | 3.8883 | 1 | false | -0.0056992 |
| 0.16000 | 0.041665 | 2.5825 | -2.4175 | 5.1649 | 0.17353 | 0.82647 | 2.8216 | 1 | false | -0.00085152 |
| 0.25000 | 0.019814 | 4.8949 | -0.10508 | 0.64413 | 0.24926 | 0.75074 | 0.0000 | 1 | true | -0.0078569 |
| 0.32000 | 0.014879 | 4.9034 | -0.096596 | 0.64015 | 0.27779 | 0.72221 | 0.0000 | 1 | true | 0.00062598 |
Nominal transition/W = 0.31250; transition/Lc = 0.13088.
Tested useful range containing nominal: 0.25000 to 0.32000.

## H. Position tolerance
| position offset | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | competitor | regions | useful | CMT-Maxwell center diff mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| -0.30000 | 0.035354 | 4.5476 | -0.45237 | 0.64974 | 0.12914 | 0.87086 | 0.21699 | 21 | false | 0.0059603 |
| -0.20000 | 0.020180 | 4.6953 | -0.30474 | 0.64185 | 0.21016 | 0.78984 | 0.081466 | 1 | false | 0.00081833 |
| -0.10000 | 0.036089 | 4.7449 | -0.25508 | 0.64780 | 0.17651 | 0.82349 | 0.086130 | 22 | false | 0.0088076 |
| -0.050000 | 0.027479 | 4.8205 | -0.17949 | 0.65230 | 0.21503 | 0.78497 | 0.047077 | 23 | false | 0.0010702 |
| 0.0000 | 0.019814 | 4.8949 | -0.10508 | 0.64413 | 0.24926 | 0.75074 | 0.0000 | 1 | true | -0.0078569 |
| 0.050000 | 0.027323 | 4.9248 | -0.075182 | 0.63720 | 0.21917 | 0.78083 | 0.051981 | 23 | false | -0.0057377 |
| 0.10000 | 0.036065 | 4.9445 | -0.055514 | 0.64550 | 0.19878 | 0.80122 | 0.088143 | 24 | false | 4.1811e-5 |
| 0.20000 | 0.020228 | 5.0925 | 0.092458 | 0.64651 | 0.25936 | 0.74064 | 0.0000 | 1 | true | -0.0047640 |
| 0.30000 | 0.035286 | 5.1468 | 0.14680 | 0.64299 | 0.21350 | 0.78650 | 0.086431 | 25 | false | -0.0059825 |
Mechanical position tolerance from tested useful offsets: +/- 0.0000 mm.

## I. Laser tolerance
| laser wavelength | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | competitor | regions | useful | CMT-Maxwell center diff mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 600.03 | 0.24068 | 2.3757 | -2.6243 | 4.7513 | 0.066395 | 0.93360 | 4.2232 | 1 | false | 0.00068568 |
| 600.07 | 0.15780 | 2.4196 | -2.5804 | 4.8393 | 0.076534 | 0.92347 | 4.1627 | 1 | false | 0.0029722 |
| 600.11 | 0.019814 | 4.8949 | -0.10508 | 0.64413 | 0.24926 | 0.75074 | 0.0000 | 1 | true | -0.0078569 |
| 600.15 | 0.0026899 | 5.0353 | 0.035302 | 0.45777 | 0.35730 | 0.64270 | 0.0000 | 1 | false | 0.0075245 |
| 600.19 | 0.047463 | 2.2732 | -2.7268 | 4.5464 | 0.072401 | 0.92760 | 3.7642 | 2 | false | -0.0045591 |
Tested useful range containing nominal: 600.11 to 600.11.

## J. Laser compensation - REQUIRED
LASER TUNING DOES NOT MATERIALLY RELAX STRAIN TOLERANCES
| bias strain | laser nm | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | regions | useful |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.0011000 | 600.07 | 0.00027565 | 5.2651 | 0.26510 | 0.26258 | 0.39279 | 0.60721 | 2 | false |
| 0.0011000 | 600.11 | 0.025426 | 2.2399 | -2.7601 | 4.4798 | 0.087936 | 0.91206 | 3 | false |
| 0.0019000 | 600.11 | 0.035198 | 2.5523 | -2.4477 | 5.1045 | 0.17453 | 0.82547 | 1 | false |
| 0.0019000 | 600.15 | 0.10871 | 2.4405 | -2.5595 | 4.8811 | 0.092589 | 0.90741 | 1 | false |
| trough depth | laser nm | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | regions | useful |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.0012000 | 600.07 | 0.037422 | 2.5287 | -2.4713 | 5.0574 | 0.14940 | 0.85060 | 2 | false |
| 0.0012000 | 600.11 | 0.14928 | 2.4322 | -2.5678 | 4.8645 | 0.089087 | 0.91091 | 1 | false |
| 0.0018000 | 600.11 | 6.6088e-6 | 4.7375 | -0.26249 | 0.28012 | 0.61346 | 0.38654 | 2 | false |
| 0.0018000 | 600.15 | 0.0069532 | 4.3844 | -0.61560 | 0.19593 | 0.11748 | 0.88252 | 30 | false |

## K. Position dependence and usable scan depth
| depth dependence | R_Maxwell | center mm | error mm | width mm | target fraction | off-target fraction | competitor | regions | useful | CMT-Maxwell center diff mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2.0000 | 0.028790 | 1.8669 | -0.13307 | 0.65248 | 0.43766 | 0.56234 | 0.052292 | 8 | false | 0.0058214 |
| 4.0000 | 0.027727 | 3.8734 | -0.12657 | 0.63720 | 0.25607 | 0.74393 | 0.053935 | 18 | false | -0.0015682 |
| 5.0000 | 0.019814 | 4.8949 | -0.10508 | 0.64413 | 0.24926 | 0.75074 | 0.0000 | 1 | true | -0.0078569 |
| 6.0000 | 0.027882 | 5.8694 | -0.13058 | 0.65235 | 0.18817 | 0.81183 | 0.048686 | 28 | false | -0.0055821 |
| 8.0000 | 0.028635 | 7.8702 | -0.12980 | 0.63733 | 0.13914 | 0.86086 | 0.058267 | 37 | false | -0.0047985 |
Physical medium depth: 0-10.000 mm. Validated usable optical scan depth: 5.0000-5.0000 mm. Edge exclusion: 5.0000 mm entrance / 5.0000 mm exit. Classification: strongly position dependent.

## L. Sensitivity ranking
| rank | parameter | relative tolerance | sensitivity |
| --- | --- | --- | --- |
| 1 | bias strain | 0.0000 | high |
| 2 | trough depth | 0.0000 | high |
| 3 | trough width | 0.0000 | high |
| 4 | transition width | 0.0000 | high |
| 5 | laser wavelength | 0.0000 | high |
| 6 | trough position | 0.0000 | high |

## M. CMT-vs-Maxwell robustness - REQUIRED
CMT TRACKS MAXWELL QUALITATIVELY BUT MISSTATES TOLERANCE WIDTHS

## N. Width + transition coupling
| width mm | transition mm | W/Lc | transition/Lc | R_Maxwell | center error mm | width mm | target fraction | off-target fraction | regions | useful |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.64000 | 0.080000 | 0.33504 | 0.041880 | 0.040874 | -2.5060 | 4.9880 | 0.099959 | 0.90004 | 1 | false |
| 0.80000 | 0.080000 | 0.41880 | 0.041880 | 0.051306 | -2.4501 | 5.0997 | 0.12556 | 0.87444 | 1 | false |
| 0.96000 | 0.080000 | 0.50256 | 0.041880 | 0.012224 | -0.089394 | 0.63888 | 0.31843 | 0.68157 | 1 | true |
| 0.96000 | 0.16000 | 0.50256 | 0.083760 | 0.0050565 | -0.062613 | 0.63523 | 0.44251 | 0.55749 | 1 | false |

## O. Mechanical target table - REQUIRED
| parameter | nominal value | lower tested useful bound | upper tested useful bound | sensitivity | notes |
| --- | --- | --- | --- | --- | --- |
| background strain | 0.0015 | 0.0015000 | 0.0015000 | high | Bias shifts the off-trough Bragg wavelength away from the laser. |
| trough strain / strain excursion | 0.0000 / 0.0015000 | 0.0000 | 0.0000 | high | Trough usefulness follows local Bragg alignment more directly than zero strain alone. |
| trough width | 0.8 | 0.80000 | 0.80000 | high | Nominal W/Lc = 0.41880. |
| transition width | 0.25 | 0.25000 | 0.32000 | high | Finite transition widths are allowed only while localization remains useful. |
| position | 0 mm command error | 0.0000 | 0.0000 | high | Bounds are tested mechanical placement error relative to the desired target. |
| laser wavelength | 600.11 | 600.11 | 600.11 | high | Laser tuning also appears in the compensation sweeps. |

## P. Bragg-shift requirements
| quantity | value nm |
| --- | --- |
| unstrainedBraggWavelengthNm | 600.01 |
| nominalBackgroundDeltaLambdaBNm | 0.69155 |
| nominalTroughDeltaLambdaBNm | 0.0000 |
| nominalDifferentialDeltaLambdaBNm | 0.69155 |

## Q. Robustness result - REQUIRED HIGHLIGHT
MAXWELL-CONFIRMED TROUGH IS OPTICALLY VALID BUT TOLERANCE-LIMITED

## R. Mechanical gate - REQUIRED HIGHLIGHT
BIASED TROUGH REMAINS OPTICALLY PROMISING BUT MECHANICAL GATE REMAINS CLOSED

## S. Continuous vs discrete optical preference
Based only on optical behavior, the validated trough appears most naturally compatible with: continuous moving trough.

## T. Performance
| case | runtime ms |
| --- | --- |
| biasRobustnessMs | 9685.7 |
| widthTransitionStudyMs | 2.3405e+4 |
| laserCompensationMs | 1.3647e+4 |
| fullMaxwellRobustnessRunMs | 9.0749e+4 |

## U. Mechanical handoff concepts
Surface-bonded PZT patch; opposed PZT pair; preloaded optical medium plus local strain relief; segmented differential actuator array; embedded piezoelectric element; mechanically compliant local region; low-frequency traveling stress field. No winner is selected here.

