# Handoff

## Repository Status

- Current branch: `main`.
- `main` includes WP-v2-12 and WP-v2-13 after squash merges:
  - PR #75 `WP-v2-12 — UI information architecture and research workspace redesign` -> `ff7bb83`.
  - PR #77 `WP-v2-13 — Spatial addressing validation UX` -> `1273478`.
- Issue #74 is closed.
- Closed PR #76 was the temporary stacked WP-v2-13 PR and was superseded by PR #77 after PR #75 merged.

## Current UI State

- Information architecture is complete for the current research workflow:
  - Overview
  - Fixed-Grating Display
  - Spatial Addressing
  - Robustness
  - Mechanical Feasibility
  - Supporting Research tools
- Spatial Addressing now uses an aligned-depth workflow:
  - strain profile epsilon(z);
  - local detuning `lambda_B - lambda_laser`;
  - normalized backward optical intensity;
  - distinct trough-target and optical-center markers.
- CMT / Maxwell provenance is explicit:
  - CMT is the responsive interactive spatial model.
  - Maxwell is an explicit current-state reference validation.
  - Maxwell validation is marked stale after solver-relevant input edits, and stale Maxwell fields are not overlaid as the current optical result.
- `Trajectory Map` is available as a secondary Spatial Addressing view with commanded trough and calculated optical-center trajectory overlays.

## Verification Snapshot

- Pre-merge WP-v2-13 head:
  - `npm.cmd run test` - 41 files / 263 tests passed.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run build` - passed.
  - `npm.cmd run test:browser` - 20 tests passed.
- Physics regression scripts completed with unchanged conclusions:
  - `npx.cmd tsx scripts/highFidelityBraggValidationStudy.mts`
  - `npx.cmd tsx scripts/maxwellTroughSpatialValidationStudy.mts`
  - `npx.cmd tsx scripts/maxwellTroughRobustnessStudy.mts`
  - `npx.cmd tsx scripts/strainTroughMechanicalFeasibilityStudy.mts`
- Browser smoke against `http://127.0.0.1:5173` passed:
  - required workspaces opened;
  - Spatial Addressing traces, trajectory map, Maxwell `Not run` / `Current` / `Stale` behavior verified;
  - no console errors;
  - 1920x1080, 1440x900, and 1366x768 had no horizontal overflow.

## Remaining UI Debt

- Consider a dedicated Acoustic / Acousto-Optic Research workspace instead of keeping it selected through Input mode.
- Consider moving explicit Maxwell validation to a cancellable async path if heavier configurations become common.
- Maxwell trajectory validation remains sparse/current-state only; do not imply continuous Maxwell validation without additional data.

## Next Research Direction

- Start WP-v2-14 from updated `main`.
- WP-v2-14 scope: Fixed-Grating Optical Operating-Point Optimization - detuning, contrast, and required strain.
- Do not start WP-v2-14 from a stale UI branch.
