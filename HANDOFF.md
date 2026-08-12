# Handoff

## Repository Status

- Current work is on `main` at merged PR #57 (`ec3161e`).
- GitHub issue #56 is closed as completed.
- The PR #57 feature branch `codex/issue-56-moving-response-regime-map` has been deleted locally and from `origin`, then pruned.

## Latest Task

- Added moving-response localization metrics for the fixed-laser `R_laser(z_pulse)` experiment.
- Added a headless moving-response regime-map sweep across laser detuning, strain width normalized to `L_c ~ 1 / kappa`, permanent `Delta n`, and rectangular/Gaussian strain shape.
- Added a Moving Region UI regime-map runner with selectable classification/scalar maps and drill-down into the selected cell's enhancement curve.
- Extended moving-region CSV metadata with classification, secondary-peak ratio, peak dominance, localized fraction, and boundary-dominated peak status.
- Resolved PR #57 review findings by using consistent area integration for localized fraction and deriving default detuning samples separately for each swept coupling slice.
- Updated `ARCHITECTURE.md`, `RESEARCH.md`, and `MILESTONES.md`.

## Key Result

- Compact verification sweep outcome: `B. Only marginal / fragile regimes were found.`
- The only `single-dominant` cell found in the compact sweep was weak: Gaussian strain, `Delta n = 1e-4`, detuning `-0.05 nm`, `W_strain / L_c = 2`, peak enhancement about `0.0062`.
- Higher-enhancement cells remained multi-peak with secondary-peak ratios near `1`.

## Validation Performed

- Focused test: `npm.cmd run test -- src/simulation/experiments/hybridBraggExperiments.test.ts` - passed, 14 tests.
- Full test: `npm.cmd run test` - passed, 27 files / 180 tests.
- Lint: `npm.cmd run lint` - passed.
- Build: `npm.cmd run build` - passed.
- Compact headless sweep run by importing the TypeScript modules through a one-off transpile hook.
- Browser smoke: reused existing Vite server on `http://127.0.0.1:5173`, switched to Hybrid Bragg mode, opened Moving Region, confirmed the new response classification metric, ran the Regime Map, and confirmed outcome, map-quantity, and drill-down controls rendered.

## Remaining Follow-Up

- Consider boundary-aware segmentation as a separate issue if rectangular convergence cost becomes the next bottleneck.
- Future research should prioritize apodized/coupling-profile/phase-engineered permanent gratings before expanding acoustic propagation.
