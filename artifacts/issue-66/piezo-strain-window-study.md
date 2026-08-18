# WP-v2-08 Piezo-Defined Strain Window Study

## Primary Validation Result

BIASED STRAIN-TROUGH ADVANTAGE IS REAL BUT FRAGILE

Selectivity result: REVISED; 2100-segment target response is 0.6180 with competitor below the selectivity denominator floor, so the original 44.29 is best treated as a finite-resolution estimate rather than a final exact ratio.

PIEZO-DEFINED STRAIN STATES MATERIALLY IMPROVE ADDRESSABILITY

## Actuator-Field Architecture

Electrical actuator commands are represented only as prescribed quasi-static strain states. The optical pipeline remains actuator command -> prescribed perturbation field -> material response -> permanent grating -> spatial CMT solver -> calculated reflection metrics.

The prescribed PZT-like strain profile is an optical design target, not yet a demonstrated mechanical field.

## Window vs Trough

BIASED STRAIN TROUGH PERFORMS BEST

| case | width mm | edge mm | bias strain | peak/local strain | target response | competitor | selectivity | regions | optical width mm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| best window | 0.8000 | 0.2500 | 0.000 | 0.001500 | 0.8815 | 0.2967 | 2.971 | 7 | 1.361 |
| best trough | 0.8000 | 0.2500 | 0.001500 | 0.001500 | 0.6183 | 0.01396 | 44.29 | 13 | 0.6111 |

## Solver-Level Trough Explanation

The biased background shifts the local Bragg wavelength away from the fixed laser. The local trough reduces that strain and returns the trough region closer to the laser resonance; the listed optical intensity remains calculated from CMT fields, not from the strain footprint.

| z mm | epsilon | Lambda nm | Delta n | lambda_B nm | laser detuning nm | kappa 1/m | |A|^2 | |B|^2 norm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5000 | 0.001500 | 207.2 | -0.0005030 | 600.7 | -0.5916 | 523.0 | 1.003 | 0.3893 |
| 2.500 | 0.001500 | 207.2 | -0.0005030 | 600.7 | -0.5916 | 523.0 | 1.006 | 0.4317 |
| 5.000 | 0.000 | 206.9 | 0.000 | 600.0 | 0.1000 | 523.6 | 1.038 | 0.9504 |
| 7.500 | 0.001500 | 207.2 | -0.0005030 | 600.7 | -0.5916 | 523.0 | 0.9791 | 0.005551 |
| 9.500 | 0.001500 | 207.2 | -0.0005030 | 600.7 | -0.5916 | 523.0 | 0.9799 | 0.01866 |

## Raw Metric Audit

Useful-response guard: high-selectivity / meaningful-response. The guard threshold is a research comparison threshold, not a display brightness requirement.

| R_static/bias-only | R_active_trough | peak enhancement | target |B|^2 | off-target |B|^2 | competitor | selectivity | secondary ratio | regions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.001203 | 0.02126 | 0.02005 | 0.6183 | 1.893 | 0.01396 | 44.29 | 0.02258 | 13 |

## Numerical Convergence

BIASED-TROUGH RESULT CONVERGED

| segments | target | competitor | selectivity | R_total | region center mm | width mm | secondary ratio |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 700 | 0.6180 | 0.000 | n/a | 0.02109 | 4.893 | 0.6286 | n/a |
| 1400 | 0.6180 | 0.000 | n/a | 0.02103 | 4.893 | 0.6357 | n/a |
| 2100 | 0.6180 | 0.000 | n/a | 0.02102 | 4.893 | 0.6381 | n/a |

## Position Resolution

| samples | step mm | best selectivity | best target mm | region center mm |
| --- | --- | --- | --- | --- |
| 17 | 0.6250 | 44.41 | 4.375 | 4.264 |
| 41 | 0.2500 | 44.29 | 5.000 | 4.903 |
| 81 | 0.1250 | 44.41 | 4.375 | 4.264 |

## Robustness

NARROW BUT REPRODUCIBLE REGION

Bias, trough-depth, laser-detuning, width, and transition sweeps show whether the result occupies a finite neighborhood rather than a single point.

| sweep | best label | selectivity | target | R_total |
| --- | --- | --- | --- | --- |
| bias | bias-0.0015 | 44.29 | 0.6183 | 0.02126 |
| trough depth | trough-depth-0.0015 | 44.29 | 0.6183 | 0.02126 |
| laser | laser-offset-0.1 | 44.29 | 0.6183 | 0.02126 |
| width | width-0.8 | 44.29 | 0.6183 | 0.02126 |
| transition | edge-0.25 | 44.29 | 0.6183 | 0.02126 |

## Edge Translation

interior-robust

| trough center mm | region center mm | selectivity | target | R_total |
| --- | --- | --- | --- | --- |
| 0.7500 | 0.6250 | 20.22 | 0.6184 | 0.02764 |
| 2.500 | 2.403 | 21.29 | 0.6131 | 0.02344 |
| 5.000 | 4.903 | 44.29 | 0.6183 | 0.02126 |
| 7.500 | 7.389 | 21.68 | 0.6205 | 0.02344 |
| 9.250 | 9.125 | 10.18 | 0.6068 | 0.02764 |

## Moving Trough Tracking

OPTICAL REGION TRACKS MOVING STRAIN TROUGH

Position error: mean |Delta z| = 0.1091 mm; max |Delta z| = 0.1250 mm.

| trough center mm | region center mm | Delta z mm | selectivity | R_total |
| --- | --- | --- | --- | --- |
| 1.250 | 1.125 | -0.1250 | 13.70 | 0.02590 |
| 2.500 | 2.403 | -0.09722 | 21.29 | 0.02344 |
| 3.750 | 3.653 | -0.09722 | 43.61 | 0.02182 |
| 5.000 | 4.903 | -0.09722 | 44.29 | 0.02126 |
| 6.250 | 6.139 | -0.1111 | 22.29 | 0.02182 |
| 7.500 | 7.389 | -0.1111 | 21.68 | 0.02344 |
| 8.750 | 8.625 | -0.1250 | 14.18 | 0.02590 |

## Sequential Piezo Array

NO USEFUL DISCRETE ADDRESSING

- actuator count: 4
- actuator pitch: 2.000 mm
- window width: 1.700 mm
- transition width: 0.5000 mm
- peak/local strain: 0.003000
- background bias strain: 0.000
- median selectivity: 0.4951
- minimum selectivity: 0.1668
- addressable S>1.1: 0.000
- addressable S>1.5: 0.000
- addressable S>2: 0.000

## Biased-Trough Array

BIASED-TROUGH ARRAY ENABLES USEFUL DISCRETE ADDRESSING

- actuator count: 4
- actuator pitch: 2.000 mm
- median selectivity: 7.622
- minimum selectivity: 6.067
- addressable S>1.1: 1.000
- addressable S>1.5: 1.000
- addressable S>2: 1.000

## Inter-Actuator Interpolation

PARTIAL / NONLINEAR INTERPOLATION

| alpha | dominant center mm | selectivity | total R | secondary ratio |
| --- | --- | --- | --- | --- |
| 0 | 1.375 | 0.6659 | 0.08889 | 1.502 |
| 0.25 | 1.347 | 1.011 | 0.04118 | 0.9894 |
| 0.5 | 1.375 | 1.021 | 0.04770 | 0.9799 |
| 0.75 | 1.431 | 1.027 | 0.04118 | 0.9740 |
| 1 | 0.2083 | 0.4826 | 0.08889 | 2.072 |

## Trough Interpolation

| alpha | dominant center mm | selectivity | total R | region count |
| --- | --- | --- | --- | --- |
| 0 | 4.292 | 0.2915 | 0.02480 | 19 |
| 0.25 | 2.222 | 0.01995 | 0.03884 | 1 |
| 0.5 | 4.222 | 2.003 | 0.0008213 | 4 |
| 0.75 | 2.847 | 0.2498 | 0.03884 | 1 |
| 1 | 5.486 | 2.312 | 0.02480 | 25 |

## TMM Spot Check

DOES NOT SUPPORT THE CMT TROUGH RESULT

TMM layer count: 48333; slices per grating period: 1. This is a discretized scalar spot check of reflectance and resonance trend only; it is not a TMM analogue of CMT spatial |B(z)|^2.

| metric | CMT | TMM | abs diff |
| --- | --- | --- | --- |
| active R at laser | 0.02126 | 8.959e-9 | 0.02126 |
| bias-only R at laser | 0.001203 | 8.661e-8 | 0.001203 |
| peak wavelength nm | 600.0 | 600.0 | 0.000 |

## Prior Architecture Comparison

| architecture | target response | selectivity | secondary ratio | region count | optical width mm |
| --- | --- | --- | --- | --- | --- |
| best standing-wave reference | 0.1919 | 0.2051 | 4.876 | 3 | n/a |
| best multi-tone reference | 0.01864 | 0.01286 | 77.74 | 5 | n/a |
| PZT window | 0.8815 | 2.971 | 0.3366 | 7 | 1.361 |
| PZT trough | 0.6183 | 44.29 | 0.02258 | 13 | 0.6111 |

## Operating Point

- static Bragg wavelength: 600.0 nm
- laser wavelength: 600.1 nm
- local Bragg shift estimate for 0.003 strain: 1.404 nm
- time model: quasi-static during one illumination interval; actuator settling and drive latency are deferred.

## Mechanical Requirements

- background bias strain: 0.001500
- local trough strain: 0.000
- strain excursion: 0.001500
- trough width: 0.8000 mm
- transition width: 0.2500 mm
- usable positioning tolerance: 0.1250 mm first-pass max absolute optical-center error
- desired actuator pitch if array-based: 2.000 mm first-pass tested, not yet useful

## Mechanical Follow-Up

- Candidate realizations: surface-bonded PZT patch, opposed PZT pair, embedded piezo layer, segmented piezo array, mechanically isolated local zone, preloaded medium plus differential actuator.
- Required strain-field geometry is the optical result above; mechanical feasibility is unverified.

