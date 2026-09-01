# Handoff

## Repository Status

- Current branch: `codex/issue-80-permanent-grating-architecture`.
- GitHub Issue #80: `WP-v2-15 - Permanent-grating spectral and spatial coupling architecture optimization`.
- WP-v2-14 / PR #79 was audited, marked ready, squash-merged to `main` as `0822501cc71f728eb0213c0094d5fb35f79f25e4`, and Issue #78 is closed.
- Local `main` was fast-forwarded to `origin/main` before this branch was created.

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

## Remaining Work

- Create PR for Issue #80 if verification passes.
- Future high-fidelity follow-up should extend the Maxwell layer path to represent engineered coupling/phase/segmented permanent gratings before claiming Maxwell support for those architecture classes.
