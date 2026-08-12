# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated: 2026-07-19

This document is the historical record of completed project work. Active roadmap items, backlog work, and implementation details now live in GitHub Issues.

## Completed Work

Keep this section as the historical record. Do not create issues for these items unless a regression is found.

- Development environment
- Project skeleton
- GitHub Pages deployment
- UI structure and dark mode
- Transfer Matrix Method solver
- Basic UI controls
- Backend diagnostics
- Solver sanity checks
- Optical stack diagram and refinements
- Documentation cleanup
- Custom refractive index values
- Thickness values derived from design wavelength
- Thickness mode selection with derived, manual, and acoustic states
- Thickness-mode UI refinement and stack-definition status treatment
- Manual thickness solver coverage
- Manual thickness peak shift coverage
- Plot centering around bandwidth
- FWHM / peak reflectance corrections
- Fast sweep range slider
- CSV export
- JSON export and import
- Bragg terminology genericization
- Code comments
- Parameter sweep analysis
- Lazy-loaded Plotly chart chunk
- Accessible output tabs and responsive simulator workspace layout
- Reusable precision-preserving formatted numeric input for manual layer thicknesses
- Consistent precision-preserving numeric controls with compact steppers, explicit reset behavior, and constrained parameter-sweep inputs
- Acoustic generator tab with discretized sinusoid layer generation, acoustic-material inputs, and acoustic config round-tripping
- Progress-aware explicit acoustic stack generation with large-period handling groundwork and future-mode stubs
- Unified discriminated structure resolution so quarter-wave and acoustic stacks share one solver, stack-definition, sweep, and export data path
- 3D proxy reflectance viewer with reusable scene builder, plane sweep/manual controls, live sweep animation, overlay modes, and WebGL fallback handling
- STL slicer and playback foundation with deterministic transport controls, axis selection, richer slice diagnostics, export helpers, hollow-sphere sample mesh, mesh validation, coverage sampling, slice timeline strip, and explicit display-projection mapping
- STL slicer boundary hardening with reusable output contracts and source metadata for sample meshes and uploaded files
- STL slicer fidelity follow-up with axis-aware display-plane mapping, mesh topology diagnostics, and denser stratified coverage sampling
- STL slicer compact preview rail with neighboring-slice occupancy thumbnails for lightweight at-a-glance inspection
- STL slicer timing profile with deterministic frame intervals, sweep duration, and per-step timestamps for future hardware synchronization
- STL slicer export schema envelope with versioned downstream contract metadata for JSON consumers
- Strict setup import contract with validated parameter-sweep and heatmap-selection round-tripping
- Shared workload limits and safer defaults for large automatic optical/acoustic jobs
- STL slicer workload-limit hardening with regression coverage for large meshes and slice counts
- UI runtime correctness hardening for Plotly lazy loading, Suspense remounts, and stale async result handling
- Local Playwright browser regression harness covering primary simulator workflows and responsive layout
- General 2D reflectance heatmap tab with reusable axis selection, solver caching, Plotly heatmap rendering, and regression coverage
- Dynamic structure-aware parameter sweep rows with embedded heatmap controls and async sweep/heatmap solving
- In-chart calculation progress bars for spectrum, parameter sweep, and heatmap solver work
- Resource-efficient output tabs that preserve ARIA tabpanels while unmounting inactive Plotly, WebGL, and STL slicer runtime views
- Reduced Plotly production payload by switching lazy charts from the full bundle to the official cartesian bundle and removing the chunk-size build warning
- v2 hybrid Bragg architecture foundation with separated permanent grating, localized strain perturbation, explicit strain/material response, spatial coupled-mode solver, fixed-laser helpers, and analytic/TMM validation tests
- v2 coupled-mode solver validation expansion with separated perturbation/response modules, analytic detuning coverage, spatial convergence checks, TMM slice-density and grating-strength comparisons, localized-strain behavior checks, and stability coverage
- Fixed-laser moving active-region experiment with `R_laser(z_pulse)` plot, no-strain baseline, position-uniformity metrics, guarded enhancement ratios, effective-width classification, strain profile view, CSV export, and persisted experiment controls
- Moving-response regime map with detuning x strain-width x permanent-coupling sweeps, transparent localization metrics, classification maps, cell drill-down curves, and an initial marginal/fragile oscillation-collapse finding
- Generalized perturbation-field architecture with prescribed localized, periodic, packet, and two-tone strain fields; phase-scanned periodic response; field-profile visualization; comparison helper; import/export metadata; and documented actuator/field separation

## v2 - Hybrid Static Bragg Grating Simulation

- [x] Architecture foundation
- [x] Uniform permanent grating
- [x] Localized strain perturbation
- [x] Coupled-mode solver foundation
- [x] Initial analytic and TMM cross-validation
- [x] Fixed-laser moving-pulse response helpers
- [x] Solver validation and convergence expansion
- [x] Fixed-laser moving active-region UI and CSV export
- [x] Active-length / coupling trade study
- [x] Generalized prescribed perturbation fields
- [ ] Quantitative full perturbation-family sweep
- [ ] Realistic actuator-to-field models
- [ ] Apodized grating support
- [ ] Acoustic pulse propagation
- [ ] Disorder / fabrication tolerance model
- [ ] Time-domain visualization
- [ ] Experimental parameter fitting

## Notes

Use this section for quick general brain dumps before cleaning them up into GitHub Issues. Keep active roadmap, backlog, and implementation tracking in GitHub Issues.

- Consider richer parameter sweep export metadata if external analysis pipelines become important.
- Consider angle sweep support as a future analysis workflow.
- Improve peak, center, and bandwidth metric extraction with interpolation instead of sampled-point estimates.
- Manual thickness tuning should be expected to shift the stopband peak before it sharply reduces reflectance, so reflectance at the design wavelength and peak reflectance across a sweep are different checks. The manual thickness path is now covered by regression tests.
