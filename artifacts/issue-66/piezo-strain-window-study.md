# WP-v2-08 Piezo-Defined Strain Window Study

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

## Inter-Actuator Interpolation

PARTIAL / NONLINEAR INTERPOLATION

| alpha | dominant center mm | selectivity | total R | secondary ratio |
| --- | --- | --- | --- | --- |
| 0 | 1.375 | 0.6659 | 0.08889 | 1.502 |
| 0.25 | 1.347 | 1.011 | 0.04118 | 0.9894 |
| 0.5 | 1.375 | 1.021 | 0.04770 | 0.9799 |
| 0.75 | 1.431 | 1.027 | 0.04118 | 0.9740 |
| 1 | 0.2083 | 0.4826 | 0.08889 | 2.072 |

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

## Mechanical Follow-Up

- Candidate realizations: surface-bonded PZT patch, opposed PZT pair, embedded piezo layer, segmented piezo array, mechanically isolated local zone, preloaded medium plus differential actuator.
- Required strain-field geometry is the optical result above; mechanical feasibility is unverified.

