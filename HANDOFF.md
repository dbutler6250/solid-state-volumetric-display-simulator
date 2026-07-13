# Handoff

## Latest Task

- Issue #43 refactors simulation data flow around a canonical `SimulationDocument` with discriminated `quarter-wave-stack` and `acousto-optic-grating` definitions plus shared analysis settings.
- `resolveSimulationDocument` is the single physical-structure factory. It returns the exact `LayerStack`, structure summary, reference wavelength, and supported sweep parameters used by solving and Stack Definition.
- Spectrum and parameter sweeps now solve the resolved stack. Acoustic frequency, period count, index modulation, material, and representation therefore affect the active spectrum.
- A focused workspace reducer preserves independent Optical, Manual, and Acoustic drafts while propagating shared analysis settings atomically.
- Acoustic generation is automatic. The obsolete Generate Equivalent Stack action was removed; automatic work is limited to 4,096 slices to avoid large synchronous solves on edits.
- Stack Definition is structure-aware and reports the exact acoustic slice count/profile/thickness instead of H/L layers.
- Acoustic reference wavelengths outside the analysis range show a warning with a one-action recenter control.
- Acoustic exports identify `acousto-optic-grating`; schema v1 and legacy Bragg imports remain supported. Complex acoustic indices now use the shared material parser and survive resolution/import/export.
- Parameter sweep choices are capability-driven: optical derived supports design wavelength, periods, and angle; acoustic supports frequency, acoustic periods, modulation, and angle.

## Verification

- `npm.cmd run test` - passed (74 tests).
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `git diff --check` - passed (line-ending conversion notices only).

## Browser Verification

- Verified default optical and manual thickness workflows.
- Verified Optical (550 nm, 12 periods) -> Acoustic -> Optical draft preservation.
- Verified acoustic modulation 0 versus 0.002 changes spectrum metrics.
- Verified Binary/Fast/Accurate/Reference resolve to 20/80/160/320 slices for 10 periods and Stack Definition reports the same active count.
- Ran all optical and acoustic supported parameter sweeps.
- Verified the default 17,313 nm acoustic reference warning and recentered the analysis range to 17,013-17,613 nm in one action.
- Verified acoustic Stack Definition uses slice/profile terminology and no TiO2/SiO2 H/L diagram.
- Verified the populated How To Use panel.
- Verified at 390 px that all three output tabs fit without horizontal document overflow.
- Import/export compatibility and complex acoustic round trips are covered by focused unit tests; Export Setup remains available in the UI.

## Remaining Limitations

- Acoustic resolution is a static discretized-index TMM approximation; standing/traveling-wave dynamics and coupled-mode/Floquet physics remain future work.
- The UI intentionally blocks automatic acoustic structures above 4,096 slices. A worker-backed explicit solve path would be needed to support larger reference stacks without blocking edits.
- Incident-angle sweeps retain the existing fixed 0-89 degree, 89-point behavior and are covered by existing tests/browser verification.
