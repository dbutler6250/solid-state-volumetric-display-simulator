# Handoff

## Repository Status

- Current branch: `codex/issue-78-operating-point-optimization`.
- GitHub Issue #78: `WP-v2-14 - Fixed-grating optical operating-point optimization`.
- Branch started from updated `main` at `d5e8564` after `git fetch --prune origin`.
- GitHub PR chain checked before branching:
  - PR #75 `WP-v2-12 - UI information architecture and research workspace redesign` is merged.
  - PR #77 `WP-v2-13 - Spatial addressing validation UX` is merged.
  - PR #76 was the temporary stacked WP-v2-13 PR and is closed unmerged.

## WP-v2-14 Result

- Artifacts:
  - `artifacts/issue-78/fixed-grating-operating-point-study.md`
  - `artifacts/issue-78/fixed-grating-operating-point-study.json`
- Runner: `npx.cmd tsx scripts/fixedGratingOperatingPointStudy.mts`.
- Baseline audit:
  - `lambda_B,0 = 600.01 nm`.
  - `lambda_B,bg = 600.70 nm`.
  - `lambda_B,active = 600.01 nm`.
  - `lambda_L = 600.11 nm`.
  - The physically relevant OFF-state detuning is `Delta lambda_bg ~= -0.592 nm`, not the historical static `+0.10 nm` spacing.
- Bare 10 mm / `Delta n = 1e-4` CMT grating FWHM is about `0.056 nm`; the historical biased-background point is about `10.6` FWHM off the laser.
- Existing strain/material model gives about `0.461 nm` Bragg shift per `1000 microstrain`.

## Conclusions

```text
NO ROBUST DETUNING OPERATING REGION WAS IDENTIFIED
```

```text
THE HISTORICAL ~0.10 NM OPERATING POINT WAS A REASONABLE BUT NON-OPTIMAL EXPLORATORY CHOICE
```

```text
LARGER DETUNING IMPROVES BACKGROUND SUPPRESSION BUT DOES NOT MATERIALLY SIMPLIFY OVERALL LIGHT MANAGEMENT
```

- Larger `|Delta lambda_bg|` suppresses background reflection in isolation.
- Stronger-reflectance CMT candidates were not robust localized display points after spatial/Maxwell inspection: they shifted toward the entrance or broadened across millimeters.
- Historical baseline remains the only selected candidate with Maxwell-supported primary region near the trough target in this packet.
- No simulator default should change from WP-v2-14.

## Verification Snapshot

- Clean `main` baseline before branching:
  - `npm.cmd run test` failed before implementation because `src/simulation/validation/spatialMaxwellValidation.test.ts` timed out at 5000 ms; 262/263 tests passed.
- WP-v2-14 runner:
  - `npx.cmd tsx scripts/fixedGratingOperatingPointStudy.mts` passed and regenerated both issue #78 artifacts.
- Branch verification:
  - `npm.cmd run test` passed: 41 files / 263 tests.
  - `npm.cmd run lint` passed.
  - `npm.cmd run build` passed.

## Remaining Work

- The clean-main Maxwell test timeout may need either a test-timeout adjustment or performance follow-up, but it predates WP-v2-14 edits.
- Future operating-point work should use a stronger spatial objective or architecture changes before proposing a new default baseline.
