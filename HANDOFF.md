# Handoff

## Latest Task

- Expanded the acoustic generator work to include a progress-aware explicit stack build, future-mode stubs, and large-period handling groundwork.
- Added chunked acoustic stack generation so large runs can report progress instead of freezing the UI.
- Added generator tests for synchronous and asynchronous stack building plus derived layer-count coverage.
- Updated README and living notes to reflect the new acoustic mode and progress workflow.

## Verification

- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Browser Verification

- Verified the acoustic tab renders and is selectable on desktop and mobile Chrome.

## Notes

- The acoustic generator now has explicit progress reporting for large materializations and future-mode stubs for standing-wave, traveling-wave, and coupled-mode / Floquet paths.
