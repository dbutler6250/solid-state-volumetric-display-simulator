# Handoff

## Latest Task

- Converted Bragg reflector layer thicknesses to derived quarter-wave values from `designWavelengthNm`.
- Removed thickness fields from the Bragg reflector form and updated the stack summary to show computed values.

## Verification

- `npm.cmd run test` passed
- `npm.cmd run lint` passed
- `npm.cmd run build` passed

## Notes

- Quarter-wave thickness now uses `d = designWavelengthNm / (4 * n)` with separate `n` for high and low layers.
- Build still reports the pre-existing Vite chunk-size warning.
