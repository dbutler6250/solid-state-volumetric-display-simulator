# WP-v2-06 Segmented Bragg Baseline Study

This study uses the scalar spatial CMT Hybrid Bragg solver and detects active regions from calculated normalized backward optical intensity `|B(z)|^2 >= 50% max`.

Best scored case in this initial sweep: 16 sections / alternating.

| Case | Sections | Phase | L_section (mm) | L_section / L_c | R_static | R_peak | Enhancement | Secondary ratio | Regions | Active sections |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| global coherent reference | 1 | continuous | 10.00 | 5.236 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 1 |
| 2 sections / continuous | 2 | continuous | 5.000 | 2.618 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 1 |
| 2 sections / fixed-reset | 2 | fixed-reset | 5.000 | 2.618 | 0.0017192 | 0.37793 | 0.37621 | 0.98986 | 4 | 2 |
| 2 sections / alternating | 2 | alternating | 5.000 | 2.618 | 0.0045898 | 0.31756 | 0.31297 | 0.96424 | 4 | 1 |
| 2 sections / seeded-random | 2 | seeded-random | 5.000 | 2.618 | 0.0054105 | 0.21062 | 0.20521 | 0.58490 | 2 | 1 |
| 4 sections / continuous | 4 | continuous | 2.500 | 1.309 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 2 |
| 4 sections / fixed-reset | 4 | fixed-reset | 2.500 | 1.309 | 0.0013212 | 0.27794 | 0.27662 | 0.82032 | 5 | 2 |
| 4 sections / alternating | 4 | alternating | 2.500 | 1.309 | 0.00041474 | 0.72835 | 0.72794 | 0.43661 | 1 | 1 |
| 4 sections / seeded-random | 4 | seeded-random | 2.500 | 1.309 | 0.0029845 | 0.37458 | 0.37160 | 0.62600 | 5 | 3 |
| 8 sections / continuous | 8 | continuous | 1.250 | 0.6545 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 3 |
| 8 sections / fixed-reset | 8 | fixed-reset | 1.250 | 0.6545 | 0.00094425 | 0.78615 | 0.78521 | 0.99372 | 1 | 3 |
| 8 sections / alternating | 8 | alternating | 1.250 | 0.6545 | 0.00094168 | 0.26369 | 0.26275 | 0.88118 | 4 | 4 |
| 8 sections / seeded-random | 8 | seeded-random | 1.250 | 0.6545 | 0.00060974 | 0.71512 | 0.71451 | 0.98670 | 1 | 4 |
| 16 sections / continuous | 16 | continuous | 0.6250 | 0.3272 | 0.0060627 | 0.22482 | 0.21875 | 0.43592 | 2 | 6 |
| 16 sections / fixed-reset | 16 | fixed-reset | 0.6250 | 0.3272 | 0.065257 | 0.11223 | 0.046976 | 0.0000 | 7 | 9 |
| 16 sections / alternating | 16 | alternating | 0.6250 | 0.3272 | 0.055215 | 0.95170 | 0.89649 | 0.98697 | 3 | 4 |
| 16 sections / seeded-random | 16 | seeded-random | 0.6250 | 0.3272 | 0.73037 | 0.79371 | 0.063338 | 0.0000 | 1 | 3 |

Interpretation: this is a baseline implementation study, not the final WP-v2-06 conclusion. It verifies that segmented permanent-grating phase relationships and calculated optical-field region detection are now executable and exportable.
