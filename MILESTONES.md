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
- Comparative perturbation-field physics study with equal peak-strain and equal strain-energy normalizations, localized/periodic/standing/two-tone sweeps, phase-translation diagnostics, and a conditional multi-tone ranking under scalar spatial CMT
- Segmented Bragg baseline with global/segmented permanent grating modes, inter-section phase modes, unmodulated section gaps, calculated spatial CMT field output, reflection-region detection from `|B(z)|^2`, playback/depth-time visualization, and issue-62 baseline artifacts
- Segmented Bragg validation closeout with boundary-aware section/gap CMT intervals, per-section addressability metrics, gap and same-active-length comparisons, convergence tables, scaled TMM spot checks, and the conclusion that segmentation provides a trade-off but not a clear addressability improvement
- Target reflection-state optimization foundation with explicit depth-window objective metrics, parameterized coupling and phase profiles, deterministic coarse grating-profile search, multi-state depth-address lookup metrics, and issue-64 study artifacts
- Piezo-defined prescribed strain fields with smooth window, biased trough, and actuator-array families in the existing hybrid Bragg perturbation pipeline
- WP-v2-08 optical study artifacts comparing PZT window, biased trough, actuator arrays, interpolation, standing-wave, and multi-tone references
- Biased strain-trough result identified as the strongest first-pass actuator-defined optical target, with mechanical feasibility deferred
- Biased strain-trough validation closeout: CMT convergence and moving-trough tracking are strong, biased-trough arrays improve discrete addressing, but TMM does not yet support the CMT trough reflectance result
- Independent biased-trough optical validation gate: short uniform strained CMT/TMM parity is confirmed, exact piecewise CMT matches spatial CMT, and the full biased trough remains approximation-sensitive pending a higher-fidelity optical reference
- High-fidelity Maxwell reference solver foundation with Redheffer scattering composition, repeated-cell stability checks, bounded smooth-trough validation artifacts, and a mechanical-feasibility gate that keeps the biased trough in optical refinement
- Locally periodic long-grating Maxwell closeout with phase-preserving mechanical blocks, fractional-period handling, full 10 mm smooth-trough boundary validation, quantitative CMT boundary parity, and mechanical gate still closed pending Maxwell spatial localization
- Maxwell spatial-field validation closeout with stable prefix/suffix internal-field reconstruction, static trough localization, moving-trough Maxwell tracking, partial 4-actuator support, qualitative CMT visualization validation, and the mechanical gate still closed
- Maxwell trough robustness envelope with CMT exploration, selected Maxwell validation points, narrow tolerance ranges, solver-independent strain target extraction, and a reduced-order mechanical feasibility gate opening
- Reduced-order mechanical feasibility closeout with tolerance audit/refinement, SI-unit axial mechanics, sampled actual strain-field metrics, direct mechanical-field Maxwell rescoring, and a marginal high-risk preload plus active counter-strain path
- Fixed-grating UI information architecture pass with Overview default, Current Architecture navigation, spatial-first workflow labels, core/advanced control hierarchy, operating-point readouts, mechanics status workspace, and supporting-tool separation
- Spatial Addressing UX closeout with shared-depth strain/detuning/backward-intensity traces, tracking metrics, explicit CMT/Maxwell validation provenance, stale validation behavior, and a trajectory-map view

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
- [x] Quantitative full perturbation-family sweep
- [x] Segmented Bragg architecture baseline
- [x] Spatial optical field output
- [x] Calculated reflection-region visualization baseline
- [x] Depth-time reflection map baseline
- [x] Synchronized illumination timing indicator baseline
- [x] Segmented Bragg validation closeout
- [x] Target reflection-state metrics
- [x] Parameterized grating profiles
- [x] Coarse grating-profile optimization
- [x] Multi-state depth-address evaluation
- [x] Prescribed piezo-like strain window
- [x] Biased strain-trough architecture
- [x] Sequential actuator-array optical study
- [x] Inter-actuator interpolation optical study
- [x] Biased strain-trough CMT validation
- [x] Biased-trough actuator-array optical study
- [x] Independent trough validation / improved TMM representation
- [x] High-fidelity Maxwell reference solver foundation
- [x] Repeated-cell scattering validation
- [x] Bounded smooth-envelope Maxwell validation
- [x] CMT validity gate for biased trough
- [x] Mechanical-feasibility gate deferred by high-fidelity optical evidence
- [x] Locally periodic long-grating Maxwell solver
- [x] Full-length biased-trough Maxwell boundary validation
- [x] Quantitative CMT boundary-reflectance trust region
- [x] Maxwell internal spatial field reconstruction
- [x] Static trough spatial validation
- [x] Moving trough Maxwell validation
- [x] 4-actuator Maxwell validation
- [x] CMT spatial visualization qualitative validation
- [x] Mechanical gate kept closed after partial Maxwell spatial localization
- [x] Maxwell trough robustness envelope
- [x] Mechanical strain target extraction
- [x] Mechanical feasibility gate decision
- [x] Refined tolerance interpretation
- [x] Reduced-order mechanics
- [x] Mechanical to Maxwell closed loop
- [x] Detailed-mechanics gate
- [x] Finalize fixed-grating UI information architecture
- [x] Spatial-first primary visualization
- [x] Simplify primary control hierarchy
- [x] Organize supporting research tools
- [x] Improve solver/validation presentation
- [x] Browser regression for new workflow
- [x] Align Spatial Addressing traces by depth
- [x] Add explicit current-state Maxwell validation UX
- [x] Add Spatial Addressing trajectory map overlays
- [ ] Realistic actuator-to-field models
- [x] Apodized grating support
- [ ] Optimized reflection visualization
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
