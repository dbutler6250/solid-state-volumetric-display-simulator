# WP-v2-07 Grating Profile Optimization Study

PERMANENT-GRATING PROFILE ENGINEERING PROVIDES ONLY A MODEST TRADE-OFF

## Search Architecture

- Target state: normalized calculated backward optical intensity `|B(z)|^2` inside a target depth window.
- Raw metrics: target power, off-target power, strongest competitor, selectivity, total/static reflectance, peak enhancement, active width, active count.
- Candidate families: uniform, Gaussian, raised-cosine, Tukey, piecewise coupling, phase-engineered continuous, segmented fixed-reset reference.
- Search method: deterministic bounded enumeration with same-peak and same-integrated coupling normalization where applicable.

## Search Ranges

- Gaussian width fractions: 0.2, 0.3, 0.45.
- Raised-cosine floor multipliers: 0, 0.1.
- Tukey taper fractions: 0.25, 0.5, 0.75.
- Piecewise zones: 2, 4, and 8 zone multiplier templates.
- Phase profiles: pi ramp, 2pi ramp, 4-zone alternating pi, 4-zone explicit offsets.
- Multi-state depths: 1, 2.5, 5, 7.5, 9 mm with 1 mm target windows.

## Best Candidate

- profile family: piecewise-coupling
- label: piecewise-2z-0.5-1.2 / same-peak
- total length: 10 mm
- peak Delta n / kappa proxy: 0.0001
- coupling profile: `{"family":"piecewise","zoneMultipliers":[0.5,1.2],"normalizeIntegratedCoupling":false}`
- phase profile: `{"family":"constant"}`
- perturbation family: multi-tone
- control state: 0.000 rad for primary single-state score
- R_static: 0.005879
- R_total: 0.01396
- peak enhancement: 0.008084
- target response: 0.1514
- strongest competing response: 0.4255
- target selectivity: 0.3559
- secondary peak ratio: 2.810
- region count: 13
- target width: 1 mm
- calculated optical width: n/a mm

## Baseline Comparison

| Candidate | Family | Peak enhancement | Target selectivity | Secondary ratio | Addressable S>1.1 | S_min | S_median | Pattern type |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| uniform global | uniform | 0.08922 | 0.01395 | 71.67 | 0.4000 | 0.4893 | 0.8791 | coarse deterministic search |
| segmented fixed-reset | segmented | 0.1147 | 0.02836 | 35.27 | 0.2000 | 0.2886 | 0.4271 | coarse deterministic search |
| best apodized | tukey | 0.1037 | 0.1039 | 9.623 | 0.4000 | 0.01499 | 0.4695 | coarse deterministic search |
| best piecewise coupling | piecewise-coupling | 0.008084 | 0.3559 | 2.810 | 0.6000 | 0.5752 | 1.200 | coarse deterministic search |
| best phase engineered | phase-engineered | 0.07857 | 0.02369 | 42.21 | 0.6000 | 0.4089 | 1.161 | coarse deterministic search |

## Multi-State Depth Addressing

| Target depth mm | Best control state | Target response | Strongest competitor | Selectivity | Total reflectance |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 0.000 | 0.5195 | 0.4185 | 1.241 | 0.01396 |
| 2.500 | 0.000 | 0.4265 | 0.4255 | 1.002 | 0.01396 |
| 5.000 | 4.435 | 0.5373 | 0.9340 | 0.5752 | 0.03448 |
| 7.500 | 0.000 | 0.5107 | 0.4255 | 1.200 | 0.01396 |
| 9.000 | 4.805 | 0.8243 | 0.3567 | 2.311 | 0.01365 |

## Addressability Assessment

- Addressability mode: insufficiently selective states under this initial bounded search.
- Coupling-profile result: apodization provides a measurable trade-off but did not establish decisive depth addressability in this run.
- Phase-profile result: phase profiles are now supported and tested, but this first coarse set did not prove material improvement.
- Combined-profile result: joint coupling/phase search remains the next required step if profile engineering is still pursued.
- Visualization result: generated metrics are solver-driven and can be overlaid on the existing calculated reflection-region visualization.
- Numerical convergence: not yet expanded beyond the study resolution in this foundation pass.
- TMM spot checks: not yet run for optimized profiles in this foundation pass.
- Manufacturability: candidate profiles are limited to smooth windows, 2/4/8 coupling zones, and low-count phase zones.

## Recommended Next Step

Run convergence and visualization smoke checks for the top apodized, piecewise, and phase-engineered candidates before expanding into joint grating-plus-perturbation optimization.

