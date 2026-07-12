# Handoff

## Latest Task

- Improved peak, center wavelength, and bandwidth metric extraction.
- Peak reflectance now uses local parabolic interpolation around the sampled maximum.
- Half-maximum band edges now use linear interpolation between crossing samples.
- Added solver coverage confirming metrics are refined between sampled wavelengths.

## Verification

- `npm.cmd run test -- --run src/simulation/solvers/transferMatrix.test.ts` - passed.
- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Notes

- No PR requested for this change.
