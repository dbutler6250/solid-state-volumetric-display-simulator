# Handoff

## Repository Status

- Current work is on branch `codex/heatmap-restructure`.
- The UI now uses dynamic sweep rows driven by the active structure, with heatmap controls embedded in Parameter Sweep.

## Latest Task

- Moved the heatmap controls and chart into the Parameter Sweep tab.
- Made sweep rows dynamic so they follow the active structure's supported sweep parameters.
- Added async parameter sweep and optical spectrum execution so large valid stacks stay responsive.
- Removed the direct optical layer-wavelength validation cap that blocked standard large stacks.

## Verification

- Full test: `npm.cmd run test` - passed.
- Lint: `npm.cmd run lint` - passed.
- Build: `npm.cmd run build` - passed, with the existing Vite chunk-size warning.

## Browser Verification

- Local app remains available at `http://127.0.0.1:5173/`.
- Verified the refactored Parameter Sweep and embedded Heatmap layout in the browser.

## Remaining Follow-Up

- The Vite chunk-size warning is still present and can be addressed separately later.
