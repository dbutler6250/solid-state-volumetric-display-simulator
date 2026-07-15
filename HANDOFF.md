# Handoff

## Repository Status

- Branch `main` is active for WP-05 UI Runtime Correctness.
- Working tree contains the WP-05 implementation and focused tests only.
- The current work stays scoped to chart labels, 3D capacity handling, assumptions copy, and Plotly fallback containment.

## Latest Task

- Fixed acoustic/optical parameter sweep axis labels, including all supported acoustic parameters.
- Added a shared `Chart Unavailable` fallback with retry/remount behavior for Plotly load failures.
- Corrected the 3D reflectance voxel mesh capacity handling so multi-cell scenes rebuild safely and preserve existing instance transforms/colors.
- Updated assumptions copy to reflect nondispersive defaults and supported complex-index/absorption inputs.
- Follow-up: extracted the lazy Plotly retry factory into a separate module so the retry path is lint-clean and directly unit-tested.

## Verification

- Focused tests added for sweep labels, assumptions text, Plotly boundary fallback, and instanced-mesh capacity rebuild.
- Full test: `npm.cmd run test` - passed (138 tests).
- Lint: `npm.cmd run lint` - passed.
- Build: `npm.cmd run build` - passed.
- Browser: desktop and narrow-viewport checks from the previous pass still apply; the new retry/fallback path is covered by unit tests.

## Browser Verification

- Vite dev server was already listening at `http://127.0.0.1:5173/`.
- Browser checks were performed with Playwright CLI against the live Vite server.
- Console errors were not observed during the verification run.

## Remaining Follow-Up

- No known follow-up is required for WP-05.
