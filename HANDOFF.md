# Handoff

## Repository Status

- Current branch: `codex/issue-74-ui-ux-fixed-grating-realignment`.
- Active issue: #74 `WP-v2-12 — UI information architecture and research workspace redesign`.
- Base: `main` at `5651fb7` (`WP-v2-10 reduced-order strain trough mechanics (#73)`).
- PR #73 is merged; GitHub inspection returned no PR comments or review threads.

## Latest Work

- Recentered the app around WP-v2-12 fixed-grating display information architecture.
- Kept `Overview` as the default route so first load explains the architecture before detailed controls.
- Grouped navigation into `Research`, `Current Architecture`, and `Supporting Research`.
- Current Architecture tabs are `Fixed-Grating Display`, `Spatial Addressing`, `Robustness`, and `Mechanical Feasibility`.
- Supporting Research preserves `Optical Stack`, acoustic/manual mode inputs, `Geometry / 3D`, `Slicer / STL`, and Import / Export.
- Kept a UI-only biased strain-trough startup preset:
  - `fixedLaserWavelengthNm = 600.11`
  - `strainBias = 0.0015`
  - `peakStrain = -0.0015`
  - `strainShape = piezo-trough`
- Added a data-driven architecture diagram and operating-point summary.
- Made Laser Detuning the primary illumination control and grouped controls into Core Experiment, Permanent Grating, Advanced Solver / Strain Model, and Spatial Addressing Playback.
- Renamed primary labels away from generic perturbation language in the main workflow.
- Clarified spatial visualization labels around normalized backward optical intensity, trough target, optical center, and tracking error.
- Added a neutral mechanics workspace describing Optical Target -> Mechanical Candidate -> Predicted Strain -> Optical Rescore.

## Remaining UX Debt

- Spatial stacked traces are improved semantically but still share a Plotly overlay rather than fully separated aligned traces.
- Maxwell validation is presented as stale/reference status; there is not yet an interactive Maxwell run control.
- Acoustic / Acousto-Optic Research remains selected through Input mode rather than a dedicated output tab.

## Verification Snapshot

- `npm.cmd run test` - 40 files / 260 tests passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run test:browser` - 20 tests passed.
- `npx.cmd tsx scripts/highFidelityBraggValidationStudy.mts` - passed; rewrote issue-68 artifacts with timing-only markdown diffs.
- `npx.cmd tsx scripts/maxwellTroughSpatialValidationStudy.mts` - passed; rewrote issue-68 artifacts with timing-only markdown diffs.
- `npx.cmd tsx scripts/strainTroughMechanicalFeasibilityStudy.mts` - passed; rewrote issue-72 artifacts.
- In-app Browser manual review against `http://127.0.0.1:5173`:
  - Overview, Fixed-Grating Display, Spatial Addressing, Robustness, Mechanical Feasibility, Optical Stack, Geometry / 3D, and Slicer / STL selected successfully.
  - Acoustic / Acousto-Optic Research remains reachable through Input mode.
  - Current Research Baseline, +0.100 nm detuning, and mechanics Marginal / high-risk status were visible on the appropriate tabs.
  - No console errors.
  - No horizontal overflow at 1920x1080, 1440x900, or 1366x768.

## Notes

- A Vite dev server was started in the background at `http://127.0.0.1:5173`.
- The UI preset intentionally lives in `simulationWorkspaceState.ts`; `DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS` remains the neutral solver/import baseline.
