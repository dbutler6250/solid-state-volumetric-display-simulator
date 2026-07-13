# Handoff

## Latest Task

- Moved the acoustic generator into the primary input column when `Input mode` is `Acoustic`.
- Removed the separate `Acoustic Generator` output tab so outputs now stay focused on spectrum, parameter sweep, and stack definition.
- Replaced duplicate acoustic-mode shared `Periods` and `Design wavelength` inputs with resolved readouts while preserving editable controls for optical and manual modes.
- Moved acoustic-derived output cards and planned acoustic mode stubs from the input sidebar into Stack Definition.
- Preserved acoustic materials not present in the optical material catalog so the acoustic-medium dropdown reflects imported/default acoustic designs.
- Kept the resolver layer unchanged; spectrum, stack definition, and parameter sweep continue to read the resolved stack inputs.

## Verification

- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Browser Verification

- Verified the output tab strip only shows Spectrum, Parameter Sweep, and Stack Definition.
- Verified Acoustic mode shows the promoted acoustic setup controls, hides duplicate shared design-wavelength controls, and keeps resolved readouts visible.
- Verified acoustic-derived outputs are shown in Stack Definition instead of the input sidebar.
- Verified the default fused-silica acoustic medium remains selected in the acoustic-medium dropdown.
- Verified Manual and Optical modes still expose their original controls and hide the acoustic setup panel.
- Verified Stack Definition continues to display resolved acoustic stack values.

## Notes

- Manual and optical workflows remain available and non-broken.
- Remaining follow-up is a deeper unified workflow pass if stack definition, parameter sweep, and acoustic generation should become one step-based flow.
