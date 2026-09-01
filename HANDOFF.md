# Handoff

## Repository Status

- Current branch: `codex/issue-82-localized-interaction-architecture`.
- GitHub Issue #82: `WP-v2-16 - Architecture reset: localized optical interaction mechanisms`.
- Branch started from clean `main` after WP-v2-15 / PR #81 was audited, verified, squash-merged, and Issue #80 was closed.
- WP-v2-16 is an architecture feasibility and physics-gating packet, not a UI redesign or FEM/device-engineering task.

## WP-v2-15 Result

- Artifacts:
  - `artifacts/issue-80/permanent-grating-architecture-study.md`
  - `artifacts/issue-80/permanent-grating-architecture-study.json`
- Runner: `npx.cmd tsx scripts/permanentGratingArchitectureStudy.mts`.
- Current uniform baseline:
  - `kappa = 523.6 1/m`.
  - `L_c = 1.91 mm`.
  - `kappa L = 5.236`.
  - Active trough plus transitions are about `1.30 mm`, or `0.681 L_c`.
- Required coupling map shows that 0.8 mm active lengths need about `Delta n = 2.10e-4` for `R = 0.50` and `4.34e-4` for `R = 0.90` in the idealized uniform short-grating benchmark.

## Conclusions

```text
THE CURRENT ACTIVE REGION IS UNDER-COUPLED RELATIVE TO ITS AVAILABLE INTERACTION LENGTH
```

```text
PERMANENT-GRATING ENGINEERING DOES NOT RESOLVE THE ACTIVE / BACKGROUND TRADEOFF
```

```text
NO TESTED PERMANENT-GRATING ARCHITECTURE IS CLEARLY PREFERRED
```

```text
NO TESTED PERMANENT-GRATING ARCHITECTURE SUPPORTS ROBUST MOVING SPATIAL ADDRESSING
```

- Stronger uniform coupling raises active reflectance but broadens spectral response and shifts/broadens the optical region.
- Smooth apodization and simple segmentation/phase cases provide only modest tradeoff changes in CMT.
- Combined stronger-coupling/apodized cases produce higher active reflectance but are not localized at the commanded trough.
- Current Maxwell layer reconstruction does not represent engineered coupling, phase, or segmented grating profiles, so those rows are intentionally CMT-only.
- No simulator default should change from WP-v2-15.

## Verification Snapshot

- `npx.cmd tsx scripts/permanentGratingArchitectureStudy.mts` passed and regenerated issue #80 artifacts.
- `npm.cmd run test` passed: 41 files / 263 tests.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

## WP-v2-16 Result

- Artifacts:
  - `artifacts/issue-82/localized-optical-interaction-architecture-study.md`
  - `artifacts/issue-82/localized-optical-interaction-architecture-study.json`
- Runner: `npx.cmd tsx scripts/localizedOpticalInteractionArchitectureStudy.mts`.
- Architecture reset decision: the biased strain trough is retained as a validated research reference but is no longer the assumed forward architecture.
- Candidate families researched: switchable Bragg coupling, locally induced gratings, phase/resonant defects, coupling cancellation/restoration, resonant scattering, EO/AO/photorefractive/thermo-optic activation, hybrid static momentum plus dynamic coupling, discrete active planes, sparse embedded structures, and scanned thin active layers.
- Rejected mechanisms: direct optical-period dynamic acoustic grating, fast thermo-optic bulk depth switching, and display-rate photorefractive writing without a static assist.
- Surviving architectures: hybrid static momentum plus EO switchable coupling; discrete EO/LC active planes; sparse resonant-scatterer or resonator planes; locally gated phase-defect grating.
- Leading control mechanism: electro-optic control, with field localization and electrode geometry still unresolved.
- Continuous-vs-discrete result: discrete active planes are a credible competing architecture.

## WP-v2-16 Conclusions

```text
THE BIASED STRAIN-TROUGH ARCHITECTURE IS RETAINED AS A VALIDATED RESEARCH REFERENCE BUT IS NO LONGER THE ASSUMED FORWARD ARCHITECTURE
```

```text
MULTIPLE ALTERNATIVE ARCHITECTURES REMAIN CREDIBLE AND REQUIRE TARGETED FOLLOW-UP
```

```text
LOCALLY SWITCHING OPTICAL COUPLING IS A CREDIBLE PATH FORWARD
```

```text
DISCRETE ACTIVE PLANES ARE A CREDIBLE COMPETING ARCHITECTURE
```

```text
ELECTRO-OPTIC CONTROL IS THE LEADING DYNAMIC MECHANISM
```

```text
ADVANCE MULTIPLE SURVIVING ARCHITECTURES TO SMALL TARGETED FEASIBILITY STUDIES
```

## Remaining Work

- Recommended next packet: compare a switchable-kappa static-momentum plus EO-control model against a discrete active-plane loss/efficiency model.
- Future high-fidelity follow-up should extend the Maxwell layer path to represent engineered coupling/phase/segmented permanent gratings before claiming Maxwell support for those architecture classes.
