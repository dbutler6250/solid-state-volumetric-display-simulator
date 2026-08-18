# WP-v2-06B Segmented Bragg Validation Closeout

## Primary Conclusion

SEGMENTATION PROVIDES A TRADE-OFF BUT NOT A CLEAR IMPROVEMENT

Segmented grating phase disruption can greatly change the calculated response, but the tested cases do not provide a clean addressability improvement over the globally coherent reference. The strongest segmented cases tend to trade higher peak response for high secondary ambiguity, static leakage, or incomplete section reachability.

## Global Comparison

| Architecture | R_static | Peak enhancement | Reflection-region count | Secondary response | Addressable depths | Median selectivity | Pattern type |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| global grating | 0.0060627 | 0.21875 | 2 | 0.43592 | 0/1 | n/a | periodic band motion |
| best segmented multi-tone | 0.066349 | 0.046394 | 7 | 0.0000 | 11/16 | 1.0019 | multi-region clutter |
| best segmented standing-wave | 0.00041474 | 0.015550 | 4 | 0.77625 | 3/4 | 1.0284 | multi-region clutter |
| representative segmented traveling-wave | 0.00041474 | 0.021372 | 3 | 1.0000 | 4/4 | 1.3916 | multi-region clutter |

## Best Segmented Configuration

Best scored segmented multi-tone case: 16 sections / fixed-reset / multi-tone.

- section count: 16
- section length: 0.62500 mm
- L_section / L_c: 0.32724
- gap length: 0.0000 mm
- phase mode: fixed-reset
- total active grating length: 10.000 mm
- R_static: 0.066349
- R_peak: 0.11274
- peak enhancement: 0.046394
- region count: 7
- best section selectivity: 1.0160
- median section selectivity: 1.0019
- addressable section count: 11/16

## Phase-Mode And Section-Length Sweep

| Case | Sections | Phase | L_section (mm) | L_section / L_c | Active length (mm) | R_static | R_peak | Enhancement | Secondary ratio | Regions | Addressable sections | Median selectivity | Pattern |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| global coherent multi-tone reference | 1 | continuous | 10.000 | 5.2359 | 10.000 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 0/1 | n/a | periodic band motion |
| 2 sections / continuous / multi-tone | 2 | continuous | 5.0000 | 2.6180 | 10.000 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 2/2 | 2.7371 | multi-region clutter |
| 2 sections / fixed-reset / multi-tone | 2 | fixed-reset | 5.0000 | 2.6180 | 10.000 | 0.0017192 | 0.37793 | 0.37621 | 0.98986 | 4 | 1/2 | 2.1400 | stair-step/discrete sweep |
| 2 sections / alternating / multi-tone | 2 | alternating | 5.0000 | 2.6180 | 10.000 | 0.0045898 | 0.31756 | 0.31297 | 0.96424 | 4 | 1/2 | 2.2222 | stair-step/discrete sweep |
| 2 sections / seeded-random / multi-tone | 2 | seeded-random | 5.0000 | 2.6180 | 10.000 | 0.0054105 | 0.21062 | 0.20521 | 0.58490 | 2 | 2/2 | 2.8959 | stair-step/discrete sweep |
| 4 sections / continuous / multi-tone | 4 | continuous | 2.5000 | 1.3090 | 10.000 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 3/4 | 1.1006 | multi-region clutter |
| 4 sections / fixed-reset / multi-tone | 4 | fixed-reset | 2.5000 | 1.3090 | 10.000 | 0.0013212 | 0.27794 | 0.27662 | 0.82032 | 5 | 4/4 | 1.2192 | multi-region clutter |
| 4 sections / alternating / multi-tone | 4 | alternating | 2.5000 | 1.3090 | 10.000 | 0.00041474 | 0.72835 | 0.72794 | 0.43661 | 1 | 2/4 | 1.6063 | deterministic but non-monotonic switching |
| 4 sections / seeded-random / multi-tone | 4 | seeded-random | 2.5000 | 1.3090 | 10.000 | 0.0029845 | 0.37458 | 0.37160 | 0.62600 | 5 | 3/4 | 1.3767 | multi-region clutter |
| 8 sections / continuous / multi-tone | 8 | continuous | 1.2500 | 0.65449 | 10.000 | 0.0060627 | 0.22482 | 0.21875 | 0.43593 | 2 | 5/8 | 1.0430 | multi-region clutter |
| 8 sections / fixed-reset / multi-tone | 8 | fixed-reset | 1.2500 | 0.65449 | 10.000 | 0.000084491 | 0.78673 | 0.78665 | 0.98844 | 2 | 2/8 | 0.39738 | stair-step/discrete sweep |
| 8 sections / alternating / multi-tone | 8 | alternating | 1.2500 | 0.65449 | 10.000 | 0.0012399 | 0.26649 | 0.26525 | 0.86323 | 4 | 5/8 | 1.0532 | multi-region clutter |
| 8 sections / seeded-random / multi-tone | 8 | seeded-random | 1.2500 | 0.65449 | 10.000 | 0.00048708 | 0.71544 | 0.71495 | 0.98695 | 1 | 3/8 | 0.73136 | multi-region clutter |
| 16 sections / continuous / multi-tone | 16 | continuous | 0.62500 | 0.32724 | 10.000 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 6/16 | 0.96747 | multi-region clutter |
| 16 sections / fixed-reset / multi-tone | 16 | fixed-reset | 0.62500 | 0.32724 | 10.000 | 0.066349 | 0.11274 | 0.046394 | 0.0000 | 7 | 11/16 | 1.0019 | multi-region clutter |
| 16 sections / alternating / multi-tone | 16 | alternating | 0.62500 | 0.32724 | 10.000 | 0.044829 | 0.94989 | 0.90506 | 0.98804 | 3 | 2/16 | 0.21313 | stair-step/discrete sweep |
| 16 sections / seeded-random / multi-tone | 16 | seeded-random | 0.62500 | 0.32724 | 10.000 | 0.73310 | 0.79207 | 0.058967 | 0.0000 | 1 | 2/16 | 0.62743 | multi-region clutter |
| 4 sections / alternating / standing-wave | 4 | alternating | 2.5000 | 1.3090 | 10.000 | 0.00041474 | 0.015965 | 0.015550 | 0.77625 | 4 | 3/4 | 1.0284 | multi-region clutter |
| 4 sections / alternating / traveling-wave | 4 | alternating | 2.5000 | 1.3090 | 10.000 | 0.00041474 | 0.021786 | 0.021372 | 1.0000 | 3 | 4/4 | 1.3916 | multi-region clutter |

## Gap-Length Study

Same total medium length cases reduce total active Bragg length as gap grows; same-active-length cases preserve 10 mm of Bragg material by extending total device depth.

| Case | Gap (mm) | Active length (mm) | R_static | Enhancement | Addressable sections | Median selectivity | Pattern |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 4 sections / alternating / gap 0 mm | 0.0000 | 10.000 | 0.00041474 | 0.72794 | 2/4 | 1.6063 | deterministic but non-monotonic switching |
| 4 sections / alternating / gap 0.025 mm | 0.025000 | 9.9250 | 0.0051768 | 0.53557 | 2/4 | 1.0045 | stair-step/discrete sweep |
| 4 sections / alternating / gap 0.05 mm | 0.050000 | 9.8500 | 0.019388 | 0.14294 | 3/4 | 1.1115 | multi-region clutter |
| 4 sections / alternating / gap 0.1 mm | 0.10000 | 9.7000 | 0.00036148 | 0.19799 | 3/4 | 1.7132 | deterministic but non-monotonic switching |
| 4 sections / alternating / gap 0.2 mm | 0.20000 | 9.4000 | 0.0024825 | 0.40925 | 2/4 | 1.1694 | stair-step/discrete sweep |
| 4 sections / same active 10 mm / gap 0 mm | 0.0000 | 10.000 | 0.00041474 | 0.72794 | 2/4 | 1.6063 | deterministic but non-monotonic switching |
| 4 sections / same active 10 mm / gap 0.05 mm | 0.050000 | 10.000 | 0.00011881 | 0.45779 | 2/4 | 1.4215 | stair-step/discrete sweep |
| 4 sections / same active 10 mm / gap 0.1 mm | 0.10000 | 10.000 | 0.0040808 | 0.16799 | 3/4 | 1.4428 | multi-region clutter |

## Addressability Table For Best Segmented Case

| Section | Dominant state exists? | Control phase/time | Target response | Largest competitor | Selectivity |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | yes | 3.7186 | 1.0000 | 0.99838 | 1.0016 |
| 2 | yes | 3.9751 | 1.0000 | 0.99892 | 1.0011 |
| 3 | yes | 0.76937 | 1.0000 | 0.98699 | 1.0132 |
| 4 | yes | 3.5904 | 1.0000 | 0.98420 | 1.0160 |
| 5 | yes | 2.0517 | 1.0000 | 0.99789 | 1.0021 |
| 6 | yes | 6.0267 | 1.0000 | 0.99905 | 1.0009 |
| 7 | yes | 4.2315 | 1.0000 | 0.99464 | 1.0054 |
| 8 | no | 4.6162 | 0.99858 | 1.0000 | 0.99858 |
| 9 | yes | 0.89760 | 1.0000 | 0.99535 | 1.0047 |
| 10 | yes | 5.7703 | 1.0000 | 0.98600 | 1.0142 |
| 11 | yes | 2.3081 | 1.0000 | 0.99473 | 1.0053 |
| 12 | no | 2.5646 | 0.99626 | 1.0000 | 0.99626 |
| 13 | no | 2.6928 | 0.89052 | 1.0000 | 0.89052 |
| 14 | no | 3.2057 | 0.99481 | 1.0000 | 0.99481 |
| 15 | yes | 2.6928 | 1.0000 | 0.99182 | 1.0082 |
| 16 | no | 5.8985 | 0.88348 | 1.0000 | 0.88348 |

## Spatial Convergence

VISUALIZED REFLECTION REGIONS ARE NUMERICALLY STABLE

| Case | Segments | R_peak frame | Dominant center (mm) | Dominant width (mm) | Secondary-region ratio | Active section | Section selectivity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| global coherent multi-tone reference | 700 | 0.22482 | 3.8643 | 1.9143 | 0.89879 | 1 | n/a |
| global coherent multi-tone reference | 1400 | 0.22484 | 3.8679 | 1.9286 | 0.89881 | 1 | n/a |
| global coherent multi-tone reference | 2100 | 0.22484 | 3.8667 | 1.9286 | 0.89882 | 1 | n/a |
| 4 sections / alternating / multi-tone | 700 | 0.72835 | 0.52857 | 1.0429 | n/a | 1 | 3.3578 |
| 4 sections / alternating / multi-tone | 1400 | 0.72839 | 0.52857 | 1.0500 | n/a | 1 | 3.3577 |
| 4 sections / alternating / multi-tone | 2100 | 0.72839 | 0.52857 | 1.0524 | n/a | 1 | 3.3576 |
| 16 sections / alternating / multi-tone | 700 | 0.94989 | 0.35000 | 0.68571 | 0.52117 | 1 | 1.8990 |
| 16 sections / alternating / multi-tone | 1400 | 0.94990 | 0.35000 | 0.69286 | 0.51919 | 1 | 1.9062 |
| 16 sections / alternating / multi-tone | 2100 | 0.94990 | 0.35000 | 0.69524 | 0.51852 | 1 | 1.9087 |

The selected 700/1400/2100 segment checks keep the dominant region centers stable enough for qualitative visualization use. The result still depends on the scalar CMT model, so the visualization should be treated as a research interface for calculated backward intensity rather than a direct local-reflectivity measurement.

## TMM Spot Checks

Full 10 mm sinusoidal TMM spot checks are computationally impractical at optical-period resolution in this browser-oriented codebase, so the spot checks use 0.05 mm scaled segmented cases to validate segmented response existence and magnitude. Spatial local fields are not compared because the TMM path does not expose directly comparable CMT `A(z)`/`B(z)` amplitudes.

| Case | CMT R | TMM R | Abs diff | CMT peak nm | TMM peak nm |
| --- | ---: | ---: | ---: | ---: | ---: |
| static segmented scaled 0.05 mm | 0.00068141 | 0.00062161 | 0.000059795 | 600.07 | 600.07 |
| activated alternating segmented scaled 0.05 mm | 0.00043025 | 0.00038311 | 0.000047139 | 600.07 | 600.07 |
| phase reset plus gap scaled 0.05 mm | 0.000042432 | 0.000038147 | 0.0000042847 | 600.07 | 600.07 |

## Visualization Semantics

The calculated reflection-region visualization displays normalized backward optical intensity `|B(z)|^2`; detected regions use a 50% of frame maximum threshold. It does not display local reflectivity. Total reflectance remains the externally measured boundary result shown separately.

## Synchronization Assessment

The simulated mappings are deterministic and therefore schedulable in principle, but the best segmented cases do not yet provide enough clean per-section selectivity to claim useful discrete-depth addressing. The synchronization indicator is valid as a timing demonstration over calculated states, not as a brightness or display-quality model.

## Recommendation

Return to engineered continuous coupling profiles or inverse design of `kappa(z)`, while keeping segmented phase disruption as a possible constraint or regularization mechanism rather than the primary architecture.
