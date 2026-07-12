# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated: 2026-07-12

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

## Notes

Use this section for quick general brain dumps before cleaning them up into GitHub Issues. Keep active roadmap, backlog, and implementation tracking in GitHub Issues.

- Consider richer parameter sweep export metadata if external analysis pipelines become important.
- Consider angle sweep support as a future analysis workflow.
- Consider 2D sweep heatmaps after multiple swept parameters are supported.
- Improve peak, center, and bandwidth metric extraction with interpolation instead of sampled-point estimates.
- Manual thickness tuning should be expected to shift the stopband peak before it sharply reduces reflectance, so reflectance at the design wavelength and peak reflectance across a sweep are different checks. The manual thickness path is now covered by regression tests.
