# Handoff

## Repository Status

- Current work is on branch `codex/heatmap-restructure`.
- The UI now uses dynamic sweep rows driven by the active structure, with heatmap controls embedded in Parameter Sweep.

## Latest Task

- Added in-chart progress bars for Spectrum, Parameter Sweep, and Reflectance Heatmap calculations.
- Threaded async solver progress callbacks for wavelength samples, sweep points, and heatmap cells.
- Preserved existing chart placeholder/result behavior while clearing progress on completion, stale requests, and aborts.
- Fixed stale async invalidation when sweep rows or heatmap axis controls change during long-running calculations.

## Verification

- Full test: `npm.cmd run test` - passed.
- Lint: `npm.cmd run lint` - passed.
- Build: `npm.cmd run build` - passed, with the existing Vite Plotly chunk-size warning.

## Browser Verification

- Local app remains available at `http://127.0.0.1:5173/`.
- Verified the refactored Parameter Sweep and embedded Heatmap layout in the browser.

## Remaining Follow-Up

- The Vite chunk-size warning is still present and can be addressed separately later.
