# Handoff

## Latest Task

- Fixed `centerWavelengthNm` in `transferMatrix.ts` so it is derived from the contiguous half-max stopband around the true peak instead of being forced to the design wavelength.

## Verification

- `npm.cmd run test` passed
- `npm.cmd run lint` passed
- `npm.cmd run build` passed

## Notes

- Updated `src/simulation/solvers/transferMatrix.test.ts` to reflect the new center-wavelength behavior.
- Build still reports the pre-existing Vite chunk-size warning.
