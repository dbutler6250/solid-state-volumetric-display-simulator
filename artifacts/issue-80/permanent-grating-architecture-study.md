# Permanent-Grating Spectral and Spatial Coupling Architecture Study

Issue: #80

## WP-v2-14 Closeout Gate

`WP-v2-14 IS CLEANLY MERGED AND ITS DETUNING CONCLUSIONS ARE THE NEW RESEARCH BASELINE`

## Required Conclusions

- Coupling length: `THE CURRENT ACTIVE REGION IS UNDER-COUPLED RELATIVE TO ITS AVAILABLE INTERACTION LENGTH`
- Grating engineering: `PERMANENT-GRATING ENGINEERING DOES NOT RESOLVE THE ACTIVE / BACKGROUND TRADEOFF`
- Architecture: `NO TESTED PERMANENT-GRATING ARCHITECTURE IS CLEARLY PREFERRED`
- Spatial addressability: `NO TESTED PERMANENT-GRATING ARCHITECTURE SUPPORTS ROBUST MOVING SPATIAL ADDRESSING`
- Defaults: No simulator default update is recommended from WP-v2-15.

## Coupling-Length Scale

Current kappa is 523.6 1/m, L_c = 1.910 mm, and kappa L = 5.236.
The active trough plus transitions provide about 1.300 mm, or 0.6807 coupling lengths.

| active length | ideal R at current Delta n | L_active / L_c |
| ---: | ---: | ---: |
| 0.5000 mm | 0.06552 | 0.2618 |
| 0.8000 mm | 0.1568 | 0.4189 |
| 1.000 mm | 0.2308 | 0.5236 |
| 1.500 mm | 0.4301 | 0.7854 |

## Required Coupling Map

| target R | 0.5 mm Delta n | 0.8 mm Delta n | 1.0 mm Delta n | 1.5 mm Delta n |
| ---: | ---: | ---: | ---: | ---: |
| 0.1000 | 0.000125 | 0.0000782 | 0.0000625 | 0.0000417 |
| 0.2500 | 0.000210 | 0.000131 | 0.000105 | 0.0000699 |
| 0.5000 | 0.000337 | 0.000210 | 0.000168 | 0.000112 |
| 0.7500 | 0.000503 | 0.000314 | 0.000252 | 0.000168 |
| 0.9000 | 0.000695 | 0.000434 | 0.000347 | 0.000232 |

## Architecture Sweep

| architecture | class | Delta n | L | FWHM | R_bg | R_active | target frac | center | width | secondary | score |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 16 continuous sections | segmented | 0.000100 | 10.00 mm | 0.05600 nm | 0.001203 | 0.02109 | 0.2267 | 4.893 mm | 0.6286 mm | 0.02693 | 0.003964 |
| current uniform baseline | current-uniform | 0.000100 | 10.00 mm | 0.05600 nm | 0.001203 | 0.02109 | 0.2267 | 4.893 mm | 0.6286 mm | 0.02693 | 0.003964 |
| uniform Delta n 0.0001 | uniform-coupling | 0.000100 | 10.00 mm | 0.05600 nm | 0.001203 | 0.02109 | 0.2267 | 4.893 mm | 0.6286 mm | 0.02693 | 0.003964 |
| 10 mm uniform grating | length | 0.000100 | 10.00 mm | 0.05600 nm | 0.001203 | 0.02109 | 0.2267 | 4.893 mm | 0.6286 mm | 0.02693 | 0.003964 |
| 4 continuous sections | segmented | 0.000100 | 10.00 mm | 0.05600 nm | 0.001203 | 0.02109 | 0.2267 | 4.893 mm | 0.6286 mm | 0.02693 | 0.003964 |
| 8 continuous sections | segmented | 0.000100 | 10.00 mm | 0.05600 nm | 0.001203 | 0.02109 | 0.2267 | 4.893 mm | 0.6286 mm | 0.02693 | 0.003964 |
| linear phase ramp 2pi | chirp-proxy | 0.000100 | 10.00 mm | 0.05600 nm | 0.001255 | 0.01202 | 0.3488 | 4.914 mm | 0.5571 mm | n/a | 0.003459 |
| linear phase ramp pi | chirp-proxy | 0.000100 | 10.00 mm | 0.05600 nm | 0.00002213 | 0.01080 | 0.2822 | 4.914 mm | 0.5857 mm | n/a | 0.002802 |
| uniform Delta n 0.0003 | uniform-coupling | 0.000300 | 10.00 mm | 0.1680 nm | 0.007534 | 0.4421 | 0.09406 | 2.529 mm | 5.043 mm | 9.568 | 0.001114 |
| Tukey taper apodization with stronger coupling | combined | 0.000200 | 10.00 mm | 0.08400 nm | 0.00001188 | 0.1706 | 0.1424 | 2.586 mm | 5.157 mm | 5.992 | 0.001017 |
| Gaussian apodization with stronger coupling | combined | 0.000200 | 10.00 mm | 0.08400 nm | 0.0002018 | 0.1646 | 0.1449 | 2.586 mm | 5.157 mm | 5.878 | 0.001014 |
| raised-cosine apodization with stronger coupling | combined | 0.000200 | 10.00 mm | 0.08400 nm | 0.0001094 | 0.1660 | 0.1440 | 2.586 mm | 5.157 mm | 5.924 | 0.001011 |

## Selected Candidate Maxwell Checks

| candidate | class | R_CMT | R_Maxwell | CMT center | Maxwell center | CMT width | Maxwell width | agreement |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| current uniform baseline | current-uniform | 0.02109 | 0.01981 | 4.893 mm | 4.895 mm | 0.6286 mm | 0.6441 mm | quantitative |
| uniform Delta n 0.0001 | uniform-coupling | 0.02109 | 0.01981 | 4.893 mm | 4.895 mm | 0.6286 mm | 0.6441 mm | quantitative |
| raised-cosine apodization | apodized | 0.02786 | n/a | 4.871 mm | n/a mm | 0.6429 mm | n/a mm | not-represented |
| 16 continuous sections | segmented | 0.02109 | n/a | 4.893 mm | n/a mm | 0.6286 mm | n/a mm | not-represented |
| linear phase ramp 2pi | chirp-proxy | 0.01202 | n/a | 4.914 mm | n/a mm | 0.5571 mm | n/a mm | not-represented |
| Tukey taper apodization with stronger coupling | combined | 0.1706 | n/a | 2.586 mm | n/a mm | 5.157 mm | n/a mm | not-represented |

Engineered coupling, phase, and segmented candidates are kept CMT-only in this packet unless the current Maxwell layer path represents the same optical architecture. This preserves the Maxwell/CMT model boundary instead of treating baseline-like Maxwell rows as validation.

## Spatial Addressability

### current uniform baseline

| commanded center | optical center | tracking error | R_active | width | secondary | regions |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2.500 mm | 2.393 mm | -0.1071 mm | 0.02326 | 0.6286 mm | 0.05209 | 10 |
| 5.000 mm | 4.893 mm | -0.1071 mm | 0.02109 | 0.6286 mm | 0.02693 | 1 |
| 7.500 mm | 7.386 mm | -0.1143 mm | 0.02326 | 0.6429 mm | 0.05154 | 34 |

### uniform Delta n 0.0001

| commanded center | optical center | tracking error | R_active | width | secondary | regions |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2.500 mm | 2.393 mm | -0.1071 mm | 0.02326 | 0.6286 mm | 0.05209 | 10 |
| 5.000 mm | 4.893 mm | -0.1071 mm | 0.02109 | 0.6286 mm | 0.02693 | 1 |
| 7.500 mm | 7.386 mm | -0.1143 mm | 0.02326 | 0.6429 mm | 0.05154 | 34 |

### raised-cosine apodization

| commanded center | optical center | tracking error | R_active | width | secondary | regions |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2.500 mm | 2.386 mm | -0.1143 mm | 0.009257 | 0.6429 mm | 0.04057 | 1 |
| 5.000 mm | 4.871 mm | -0.1286 mm | 0.02786 | 0.6429 mm | 0.09799 | 17 |
| 7.500 mm | 7.357 mm | -0.1429 mm | 0.009257 | 0.6143 mm | 2.561 | 24 |

### 16 continuous sections

| commanded center | optical center | tracking error | R_active | width | secondary | regions |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2.500 mm | 2.393 mm | -0.1071 mm | 0.02326 | 0.6286 mm | 0.05210 | 10 |
| 5.000 mm | 4.893 mm | -0.1071 mm | 0.02109 | 0.6286 mm | 0.02693 | 1 |
| 7.500 mm | 7.386 mm | -0.1143 mm | 0.02326 | 0.6429 mm | 0.05154 | 34 |

### linear phase ramp 2pi

| commanded center | optical center | tracking error | R_active | width | secondary | regions |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2.500 mm | 2.450 mm | -0.05000 mm | 0.004612 | 0.5714 mm | n/a | 1 |
| 5.000 mm | 4.914 mm | -0.08571 mm | 0.01202 | 0.5571 mm | n/a | 1 |
| 7.500 mm | 7.471 mm | -0.02857 mm | 0.004612 | 0.5571 mm | n/a | 1 |

### Tukey taper apodization with stronger coupling

| commanded center | optical center | tracking error | R_active | width | secondary | regions |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2.500 mm | 1.336 mm | -1.164 mm | 0.1702 | 2.657 mm | 2.707 | 1 |
| 5.000 mm | 2.586 mm | -2.414 mm | 0.1706 | 5.157 mm | 5.992 | 1 |
| 7.500 mm | 3.836 mm | -3.664 mm | 0.1702 | 7.657 mm | 9.372 | 1 |

## Interpretation

The current trough plus transition length is shorter than one coupling length, so weak local accumulation and broader-band stronger-coupling penalties compete directly.

Stronger uniform coupling raises possible active reflection, but it also broadens the grating response and raises background participation. Smooth apodization and simple segmentation/phase disruption can move the tradeoff modestly, but the tested bounded set does not establish a robust architecture that simultaneously gives high active reflection, low background reflection, and clean moving spatial localization. The phase-ramp cases are reported only as chirp proxies because this model does not yet expose a first-class monotonic period-chirp input.

No mechanical/FEM claim is made here; final candidates use the same prescribed trough field unless explicitly noted in the JSON payload.

## Artifacts

- C:\Users\dbutl\OneDrive\Documents\Projects\Volumetric Display\Solid State\MkII\01_Software\Simulation Tool\artifacts\issue-80\permanent-grating-architecture-study.json
- C:\Users\dbutl\OneDrive\Documents\Projects\Volumetric Display\Solid State\MkII\01_Software\Simulation Tool\artifacts\issue-80\permanent-grating-architecture-study.md

Generated by `npx.cmd tsx scripts/permanentGratingArchitectureStudy.mts`.
