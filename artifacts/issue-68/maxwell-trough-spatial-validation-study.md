# WP-v2-09C Maxwell Trough Spatial Validation

## A. Reconstruction method
stable prefix/suffix scattering reconstruction on the explicit Maxwell layer chain
forward/backward/total fields are complex electric-field amplitudes sampled at layer centers; normalized backward optical intensity is max-normalized |E_backward|^2; flux values multiply intensity by local refractive index.

## B. Validation checks
| case | passed | R/error |
| --- | --- | --- |
| matched slab | true | 0.0000 |
| dielectric slab | true | 0.0000 |
| short grating | true | 1.8208e-14 |
| split uniform grating | true | 0.0000 |

## C. Static trough result
| metric | CMT | Maxwell |
| --- | --- | --- |
| R | 0.021257 | 0.019814 |
| primary center mm | 4.9028 | 4.8949 |
| primary width mm | 0.61111 | 0.64413 |
| target response | 0.61828 | 0.61768 |
| off-target fraction | 1.8932 | 0.75074 |

## D. Moving trough result
MAXWELL CONFIRMS MOVING-TROUGH TRACKING
Mean |Delta z_Maxwell| = 0.12741 mm; median = 0.12980 mm; max = 0.15562 mm.
| target mm | CMT center mm | Maxwell center mm | R_CMT | R_Maxwell |
| --- | --- | --- | --- | --- |
| 1.0000 | 0.90278 | 0.89426 | 0.021308 | 0.019874 |
| 2.0000 | 1.8611 | 1.8669 | 0.030758 | 0.028790 |
| 3.0000 | 2.8472 | 2.8444 | 0.038749 | 0.036156 |
| 4.0000 | 3.8750 | 3.8734 | 0.029818 | 0.027727 |
| 5.0000 | 4.9028 | 4.8949 | 0.021257 | 0.019814 |
| 6.0000 | 5.8750 | 5.8694 | 0.029818 | 0.027882 |
| 7.0000 | 6.8472 | 6.8445 | 0.038749 | 0.036165 |
| 8.0000 | 7.8750 | 7.8702 | 0.030758 | 0.028635 |
| 9.0000 | 8.9028 | 8.8953 | 0.021308 | 0.019856 |

## E. 4-actuator spot check
MAXWELL PARTIALLY SUPPORTS 4-ACTUATOR ADDRESSING
| actuator | target mm | Maxwell center mm | target fraction | off-target fraction | target/competitor | R |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 2.0000 | 1.8592 | 0.40494 | 0.59506 | 8.2269 | 0.022756 |
| 1 | 4.0000 | 3.8798 | 0.27743 | 0.72257 | 15.092 | 0.028508 |
| 2 | 6.0000 | 5.8562 | 0.16708 | 0.83292 | 7.0126 | 0.028598 |
| 3 | 8.0000 | 7.8699 | 0.13912 | 0.86088 | 8.9688 | 0.022719 |

## F. Conclusions
MAXWELL SPATIAL FIELDS PARTIALLY CONFIRM / REVISE TROUGH LOCALIZATION
CMT SPATIAL VISUALIZATION IS VALIDATED FOR QUALITATIVE TROUGH RESEARCH
BIASED TROUGH REMAINS OPTICALLY PROMISING BUT MECHANICAL GATE REMAINS CLOSED

## G. Performance
Static reconstruction: 2180.6 ms, 645.01 MB heap delta.
9-position moving sweep total: 1.3484e+4 ms.
4-actuator sweep total: 6259.6 ms.
