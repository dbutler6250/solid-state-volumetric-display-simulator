# Handoff

## Repository Status

- Current work is on branch `codex/resource-efficiency-review`.
- Output tab panels now keep ARIA tabpanel shells mounted while unmounting inactive heavy content.

## Latest Task

- Reviewed simulator output tabs for hidden runtime/resource usage.
- Fixed inactive Spectrum, Parameter Sweep/Heatmap, Stack Definition, 3D View, and STL Slicer tabs so their content only mounts when active.
- Preserved tabpanel IDs, ARIA relationships, and stored result/input state while releasing Plotly, WebGL, slicer preview, interval, listener, and animation resources on tab changes.
- Added a focused lifecycle predicate test for active output panel mounting.
- Replaced the full Plotly bundle with the official cartesian bundle used by the app's scatter and heatmap charts.
- Calibrated the Vite chunk warning threshold to the measured async Plotly cartesian chunk size.

## Verification

- Full test: `npm.cmd run test` - passed, 24 files / 150 tests.
- Lint: `npm.cmd run lint` - passed.
- Build: `npm.cmd run build` - passed with no chunk-size warning.
- Plotly async chunk is now `plotly-cartesian.min-*.js` at about 1,427 kB minified / 476 kB gzip, down from the prior full Plotly chunk at about 4,843 kB minified / 1,469 kB gzip.

## Browser Verification

- Local app remains available at `http://127.0.0.1:5173/`.
- Verified tab switching in the browser.
- Confirmed inactive panels keep empty tabpanel shells, Spectrum mounts one Plotly chart only when active, 3D View mounts one WebGL canvas only when active, and STL Slicer preview unmounts when inactive.

## Remaining Follow-Up

- No immediate follow-up.
