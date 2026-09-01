# Handoff

## Repository Status

- Current branch: `codex/wp-v2-13-spatial-addressing-ux`.
- Active work packet: `WP-v2-13` Spatial Addressing Visualization + CMT/Maxwell Validation UX.
- Stacked on PR #75 / branch `codex/issue-74-ui-information-architecture` because PR #75 is still open and draft.
- PR #75 inspection: open draft, base `main`, head `70252250`, CI `test-lint-build` passed, no comments/reviews/review threads returned by `gh` or the GitHub app.

## Latest Work

- Reworked Spatial Addressing around a current-state research-instrument view.
- Added a prominent provenance bar: interactive spatial model is CMT, reference validation is Not run / Running / Current / Stale / Unavailable.
- Added an explicit `Validate with Maxwell` action for the current spatial state only.
- Added deterministic validation identity from solver-relevant inputs and marks previous Maxwell results stale after changes.
- Added compact tracking and validation panels:
  - commanded trough center, optical center, tracking error, optical width, dominant region count, secondary-region ratio;
  - CMT/Maxwell optical centers, width comparison, center difference, and boundary reflectance comparison.
- Replaced the strain/intensity dual-axis overlay with aligned shared-depth traces:
  - strain profile epsilon(z);
  - local detuning `lambda_B - lambda_laser`, with zero resonance line;
  - normalized backward optical intensity, with CMT and current Maxwell overlay when available.
- Moved the depth-position intensity map behind `Current State` / `Trajectory Map` tabs and added commanded trough plus calculated optical-center trajectory overlays.
- Added focused regression coverage for the new Spatial Addressing provenance/tracking labels.

## Remaining Follow-Up

- Current Maxwell validation is synchronous after the user clicks the button; if heavier configurations become common, move it to a cancellable async worker-style path.
- Maxwell trajectory support remains honest/sparse: this change validates only the current state, not a sweep of validation points.
- PR #75 still needs to merge before WP-v2-13 can be rebased or opened cleanly against `main`.

## Verification Snapshot

- `npm.cmd run test` - 40 files / 261 tests passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- In-app Browser manual review against `http://127.0.0.1:5173`:
  - Spatial Addressing opens.
  - Stacked trace labels visible: strain profile, local detuning, CMT normalized backward optical intensity, trough target, optical center.
  - Trajectory Map shows normalized intensity map plus commanded trough and calculated optical-center trajectory overlays.
  - `Validate with Maxwell` transitions Reference validation to `Current` and exposes Maxwell normalized backward optical intensity overlay.
  - Browser console had no errors.

## Notes

- A Vite dev server was already running at `http://127.0.0.1:5173`.
- This work did not change the physics model; it wires existing CMT spatial fields and the existing Maxwell field reconstruction into clearer UI provenance and validation readouts.
