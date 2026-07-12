# Handoff

## Latest Task

- Added a reusable `FormattedNumberInput` abstraction on branch `codex/formatted-number-input`.
- Manual high- and low-index thickness fields now use explicit focused draft state instead of form-wide numeric-equality synchronization.
- Inactive thicknesses remain one-decimal displays while focused fields reveal and preserve the exact parent value.
- Thickness inputs intentionally accept fractional values with `step="any"`; solver, validation, and import/export behavior are unchanged.
- Focused thickness controls retain incomplete decimal and exponent drafts instead of allowing native number-input sanitization.

## Verification

- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Browser Verification

- Verified derived, user-typed, and acoustic thickness values render concisely.
- Verified `105.6250` remains intact while editing, blurs to `105.6`, and refocuses as exact `105.625`.
- Automated coverage verifies raw drafts such as `103.`, `1e`, and `1e-` remain uncommitted until complete.
- Verified mode switching preserves the exact manual value, fractional edits update the spectrum, and no console errors occur.
- Verified no page-level horizontal overflow at a 390 px mobile viewport.

## Notes

- Active drafts win over external prop updates until blur; mode changes unmount the manual inputs and explicitly reset drafts.
- Precise manual import behavior is covered by automated tests because the in-app browser API does not expose file upload.
