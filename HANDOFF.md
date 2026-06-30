# Handoff

## Latest Task

- Added custom refractive index entry support in the Bragg reflector material form.
- Updated UI labels so custom `n` values are clearer in both the form and stack summary.

## Verification

- `npm.cmd run test` passed
- `npm.cmd run lint` passed
- `npm.cmd run build` passed

## Notes

- Change was kept narrowly focused on material-related UI files.
- Build still reports the pre-existing Vite chunk-size warning.
