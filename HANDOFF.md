# Handoff

## Repository Status

- Current work is on `codex/v2-hybrid-bragg-foundation`.
- `RESEARCH.md` already had user edits before this task; the v2 simulator implication section was appended without removing those edits.

## Latest Task

- Resolved PR #55 review findings after completing WP-v2-03 fixed-laser moving active-region experiment.
- The core architecture separates permanent optical structure, prescribed perturbation field, material response, solver, experiment helpers, and metrics.
- v1 quarter-wave stack, TMM solver, acoustic grating, sweeps, heatmaps, plotting, import/export, and UI shell remain in place.

## What Changed

- Added a headless permanent uniform Bragg grating model with explicit SI conversion from UI units.
- Moved rectangular/Gaussian strain sampling into `src/simulation/perturbations/strainField.ts`.
- Moved first-order material response into `src/simulation/responses/strainOpticResponse.ts`.
- Added a spatial coupled-mode solver using the documented weak sinusoidal grating convention `kappa = pi * delta-n / lambda_B`.
- Added closed-form detuned uniform-grating validation helper.
- Added fixed-laser moving active-region experiment returning `R_laser(z_pulse)`, no-strain baseline, enhancement, position statistics, guarded gain, pulse overlap metadata, and effective-width classification.
- Added Moving Region output tab with fixed-laser reflectance plot, no-strain baseline, current strain profile, metrics, and CSV export.
- Added Hybrid Bragg UI controls for fixed laser and pulse-position sweep settings.
- Added explicit caps for hybrid segment count, pulse position count, and aggregate segment-position work.
- Fixed older hybrid setup imports so missing moving-pulse sweep end defaults to the imported grating length.
- Fixed Hybrid Bragg length edits so pulse sweep start/end do not collapse to an invalid equal range.
- Added a Hybrid Bragg UI mode and Stack Definition readout.
- Extended sweep labels, CSV metadata, JSON export/import, validation, and workspace drafts for the new hybrid mode.
- Updated `ARCHITECTURE.md` with authoritative coupled-mode conventions and solver assumptions.
- Updated `README.md`, `MILESTONES.md`, and `RESEARCH.md`.

## Validation Performed

- Focused hybrid tests cover zero perturbation, uniform strain shift, rectangular/Gaussian strain contracts, localized strain bounds, pulse-position dependence, analytic on-resonance and detuned uniform-grating limits, spatial convergence, TMM slice-density comparison, TMM/CMT grating-strength comparison, energy normalization, and numerical stability cases.
- Analytic uniform-grating validation spans `kappa L = 0.01, 0.1, 0.5, 1, 2, 3.5`.
- Detuning validation spans `delta/kappa = -2, -1, -0.5, 0, 0.5, 1, 2`.
- Localized rectangular strain convergence shows 25 segments can differ from a 1600-segment reference by about 0.03 reflectance; 400+ segments are below 0.005 in the tested case.
- TMM comparison improves with slices per period in the weak-modulation regime and diverges materially as `Delta n` approaches `1e-3`.
- Focused moving-region tests cover zero-strain baseline, position count, boundary clipping metadata, rectangular/Gaussian movement, metrics, guarded gain, effective-width classification, and CSV export.
- Representative moving-region runs show exact static resonance is dominated by the no-strain grating, while detuned cases can enhance reflectance but remain strongly position dependent with multiple comparable peaks.
- Full test: `npm.cmd run test` - passed, 27 files / 173 tests.
- Lint: `npm.cmd run lint` - passed.
- Build: `npm.cmd run build` - passed.
- Browser smoke: reused existing Vite server on `http://127.0.0.1:5173`, switched to Hybrid Bragg mode, opened Moving Region tab, and confirmed the plots, baseline, metrics, and CSV export control rendered.

## Known Limitations

- Hybrid strain is prescribed directly; no acoustic propagation, attenuation, echoes, transducer model, or time-domain acoustic solve is implemented.
- The coupled-mode solver is scalar and normal-incidence in practice; UI incident angle/polarization are still shared app settings but are not yet physically used by the hybrid solver.
- Transmission is reported as `1 - R` only for the current lossless matched-boundary model, not as a general independently solved transmission channel.
- Localized strain can produce strong finite-grating position-dependent interference; it should not be treated as a fully independent moving mirror.
- Use at least 400 segments for localized-strain studies until adaptive or boundary-aware segmentation exists.
- Effective optical response width is reported only for a single dominant enhancement peak; multi-peak responses are explicitly classified as not unique.
- Fixed-laser response is plotted, but acoustic propagation, finite laser linewidth, attenuation, and transducer physics are still not modeled.

## Recommended Next Work

1. Run active strain length versus permanent index modulation trade studies.
2. Study apodized permanent gratings to reduce off-state leakage and distributed interference.
3. Consider adaptive or boundary-aware segmentation before relying on sharp rectangular perturbations for final design decisions.
4. Add more realistic strain profiles with rise/fall and ringing.
5. Add acoustic propagation, attenuation, echoes, and transducer constraints.
