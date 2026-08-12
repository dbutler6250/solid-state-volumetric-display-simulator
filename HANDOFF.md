# Handoff

## Repository Status

- Current work is on `codex/issue-58-generalized-perturbation-fields`.
- GitHub issue #58 tracks WP-v2-05 generalized perturbation-field architecture and comparative tuning study.
- Base is `main` after merged PR #57.

## Latest Task

- Resolved PR #59 review findings:
  - periodic phase sweeps now use a half-open `[0, 2 pi)` grid to avoid duplicate endpoint peaks;
  - moving-region metrics now label phase scans in radians instead of millimeters;
  - regime-map classification colorbar/tick range now covers all eight classification labels.
- Added focused regression tests for half-open phase scans, phase-scan metric labels, and the expanded classification scale.
- Generalized the Hybrid Bragg perturbation layer beyond rectangular/Gaussian localized strain.
- Added prescribed field families: smooth top-hat, triangular, traveling sinusoid, standing wave, carrier-envelope packet, and two-tone superposition.
- Preserved rectangular full-width and Gaussian FWHM conventions.
- Added phase-scanned response behavior for periodic fields and a headless perturbation-family comparison helper.
- Updated Hybrid Bragg UI controls and perturbation profile plotting for prescribed field snapshots.
- Extended import validation and CSV metadata for new perturbation parameters.
- Updated `ARCHITECTURE.md`, `RESEARCH.md`, and `MILESTONES.md`.

## Key Result

- The simulator is no longer architecturally tied to a short moving acoustic pulse.
- No clearly superior perturbation field is claimed yet; the new comparison path enables quantitative follow-up sweeps.
- Optical field desirability remains separated from physical actuator feasibility.

## Validation Performed

- Focused review-fix test: `npm.cmd run test -- src/simulation/experiments/hybridBraggExperiments.test.ts src/plots/MovingPulseExperimentChart.test.ts src/plots/MovingResponseRegimeMapChart.test.ts src/simulation/perturbations/strainField.test.ts` - passed, 21 tests.
- Full test: `npm.cmd run test` - passed, 30 files / 187 tests.
- Lint: `npm.cmd run lint` - passed with no warnings.
- Build: `npm.cmd run build` - passed.
- Focused test: `npm.cmd run test -- src/simulation/perturbations/strainField.test.ts src/simulation/experiments/hybridBraggExperiments.test.ts src/io/importStackConfigJson.test.ts` - passed, 46 tests.
- Full test: `npm.cmd run test` - passed, 28 files / 185 tests.
- Lint: `npm.cmd run lint` - passed.
- Build: `npm.cmd run build` - passed.
- Targeted browser smoke: local Vite at `http://127.0.0.1:5173`, switched to Hybrid Bragg, selected smooth top-hat and traveling sinusoid fields, verified field-specific controls, opened Moving Region, and confirmed response metrics plus perturbation profile rendered.
- Broader Playwright browser regression: `npx.cmd playwright test tests/browser/browser-regression.spec.ts` had 6 stale selector failures around existing chart/control text; unrelated 3D, STL, and mobile overflow checks passed.

## Remaining Follow-Up

- Commit and push PR #59 review-fix changes.
- Future research should run a larger normalized comparison sweep, especially two-tone/phase-control cases, before choosing a physical actuator architecture.
