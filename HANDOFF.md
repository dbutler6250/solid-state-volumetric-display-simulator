# Handoff

## Repository Status

- PR #44 was merged into `main` at `d9405d2`.
- Current work is on branch `codex/issue-11-3d-viewer`.

## Latest Task

- Issue #11 now adds a reusable 3D output tab built from `ReflectanceVolumeScene` and a `three.js` viewer.
- The viewer renders a transparent medium with proxy volume and moving-plane modes, freeze control, orbit/pan/zoom behavior, preset-view scaffolding, slice/threshold/clip controls, and a legend.
- The viewer now includes actual preset camera buttons and a shift-drag pan gesture in addition to orbit and zoom.
- First-pass refinements added an interaction hint, inline slider values, a small scene-state badge, and a taller desktop canvas.
- Plane motion is now split into sweep and manual modes; sweep loops through the volume with adjustable speed, while manual mode freezes the plane and exposes direct position control.
- Overlay modes now differ in rendered shell/interior behavior instead of only changing labels.
- The scene builder uses the canonical `SimulationDocument`, resolved structure, and solver output instead of a second data path.
- The tab fails gracefully when WebGL initialization is unavailable and directs the user back to Stack Definition.
- Added focused tests for the 3D scene builder and proxy mode switching.

## Verification

- `npm.cmd run test` - passed (91 tests).
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- Browser-verified the 3D tab on desktop and at 390 px width.
- Browser-verified the tab row, 3D controls, freeze toggle, and no horizontal overflow at mobile width.
- Browser-verified the 3D tab mounts without the earlier React/runtime error, and the preset camera buttons are present.
- Browser-verified the refinement pass with the new hint, inline values, and badge, and confirmed no actual horizontal overflow.
- Browser-verified that sweep mode shows plane speed, manual mode shows plane position, and manual mode reads as frozen.

## Browser Verification

- Verified the 3D View tab appears alongside Spectrum, Parameter Sweep, and Stack Definition.
- Verified the 3D tab shows the proxy volume controls, legend, and plane/volume toggle.
- Verified the 3D tab shows the preset camera buttons and mounts a canvas without the fallback error state.
- Verified the 3D tab shows the interaction hint, inline slider values, and scene-state badge.
- Verified sweep/manual plane state changes, including the frozen manual state and the sweep speed control.
- Verified the mobile layout keeps the tab row and 3D controls usable with no page-level horizontal overflow at 390 px width.

## Remaining Limitations

- Acoustic solving is still a discretized-index TMM approximation; standing/traveling-wave dynamics and coupled-mode/Floquet physics remain future work.
- Acoustic work is cooperatively chunked on the main thread rather than moved to a Web Worker. Cancellation prevents stale commits and yielding preserves input responsiveness, but a worker remains the preferred future path for workloads beyond the enforced limits.
- Parameter sweeps remain explicit synchronous actions and are therefore guarded by per-point and aggregate limits.
- The new 3D view is a proxy visualization layer, not a higher-fidelity field solver.
