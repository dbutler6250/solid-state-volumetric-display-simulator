# Handoff

## Repository Status

- Current work is on `codex/issue-60-comparative-perturbation-study`.
- GitHub issue #60 tracks WP-v2-05A comparative perturbation-field physics study.
- Base is `main`, which already contains the merged WP-v2-05 generalized-field architecture.

## Latest Task

- Added `scripts/comparativePerturbationStudy.mts`, a reproducible headless study runner that reuses the scalar spatial CMT hybrid Bragg APIs.
- Generated study artifacts:
  - `artifacts/issue-60/comparative-perturbation-study.md`;
  - `artifacts/issue-60/comparative-perturbation-study.json`.
- Updated `RESEARCH.md` with the WP-v2-05A comparative study and required highlights.
- Updated `MILESTONES.md` to mark the quantitative full perturbation-family sweep complete.

## Key Result

- `MOST PROMISING PERTURBATION FIELD: multi-tone`
- The best two-tone case is conditional, not a clean single plane: peak enhancement about `0.219`, secondary peak ratio about `0.436`, phase-response width about `1.762 rad`, activation-proxy width about `1.100 mm`, and two inferred active regions.
- `LOCALIZED MOVING-FIELD LIMITATION REMAINS`; smooth top-hat, triangular, and carrier-envelope packets did not materially clean up the moving localized response under the current scalar-CMT model.
- Continuous traveling excitation behaves as a periodic multi-plane candidate, not a single moving plane.
- Standing waves can form separated inferred regions when the period is near or above `L_c`, but coherent Bragg interference still rearranges the apparent response.
- Two-tone relative phase can translate the inferred activation maximum across the grating in the local Bragg-alignment diagnostic; physical generation remains unevaluated.

## Validation Performed

- Study runner: `npx.cmd tsx scripts/comparativePerturbationStudy.mts` - passed and regenerated artifacts.
- Higher-segment convergence: best multi-tone and standing-wave candidates rerun at 700, 1400, and 2100 CMT segments; qualitative ranking persisted.
- Unit tests: `npm.cmd run test` - passed, 30 files / 187 tests.
- Lint: `npm.cmd run lint` - passed with no reported issues.
- Build: `npm.cmd run build` - passed.
- Targeted browser smoke: local Vite at `http://127.0.0.1:5173`, selected Hybrid Bragg, switched smooth top-hat and traveling sinusoid controls, opened Moving Region, and verified response/profile chart text plus metrics rendered.
- Broader Playwright browser regression: `npx.cmd playwright test tests/browser/browser-regression.spec.ts` - passed, 12 tests across `edge-desktop` and `edge-mobile`.
- The previously reported six Playwright failures were stale expectations: exact Plotly SVG text matching and the old parameter-sweep selector model. Updated the regression spec to assert current chart text and the current per-row sweep controls.

## Remaining Follow-Up

- Commit and push the review-fix update to PR #61.
