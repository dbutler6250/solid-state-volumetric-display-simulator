# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated: 2026-07-10

This document is organized for direct conversion into GitHub Issues and a GitHub Project.

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
- Plot centering around bandwidth
- FWHM / peak reflectance corrections
- Fast sweep range slider
- CSV export
- JSON export and import
- Bragg terminology genericization
- Code comments

## Milestone 1: Simulation Analysis Expansion

Goal: Expand the simulator from a single-stack view into a broader analysis tool.

### Issues

1. `Add parameter sweep analysis`
   - Outcome: Support sweeping one or more parameters across defined ranges.
   - Done when:
     - User can choose at least one swept parameter.
     - Results are rendered in a readable table or chart.
     - Sweep completion is visible in the UI.

2. `Add multidimensional analysis support`
   - Outcome: Allow at least two varying inputs in the same analysis run.
   - Done when:
     - Multiple parameter axes can be configured.
     - Output distinguishes between sweep dimensions clearly.
     - Invalid or overly expensive sweeps are blocked or warned about.

3. `Add reflectance and transmission versus angle plots`
   - Outcome: Plot optical response as a function of incident angle.
   - Done when:
     - Angle can be swept independently of wavelength.
     - Reflectance and transmission curves are both supported.
     - Plot labels and units are correct.

4. `Add stopband evolution view`
   - Outcome: Visualize how the stopband changes as design parameters vary.
   - Done when:
     - Stopband metrics are computed across a sweep.
     - The resulting trend is visible in a chart or summary panel.

5. `Add polarization comparison`
   - Outcome: Compare response for at least s and p polarization.
   - Done when:
     - Users can select or compare polarization modes.
     - The plots or metrics clearly differentiate the modes.

## Milestone 2: Optical Design Flexibility

Goal: Support more realistic and more general stack definitions.

### Issues

1. `Support complex refractive index values`
   - Outcome: Allow absorbing materials and complex `n + ik` inputs.
   - Done when:
     - UI accepts complex index values.
     - Solver handles them without breaking existing real-index behavior.
     - Diagnostics warn on invalid complex inputs.

2. `Improve stack definition UI`
   - Outcome: Make layer editing easier and less error-prone.
   - Done when:
     - Layer add/remove/reorder/edit actions are straightforward.
     - Stack state is easier to review before simulation.
     - Invalid stack configurations are prevented or surfaced clearly.

3. `Support non-quarter-wave thicknesses`
   - Outcome: Allow arbitrary layer thicknesses instead of only quarter-wave assumptions.
   - Done when:
     - Users can enter explicit thickness values.
     - Derived-thickness mode still works where needed.
     - Existing quarter-wave workflows remain intact.

4. `Add acoustic design thickness mode`
   - Outcome: Optionally derive thickness from acoustic frequency inputs.
   - Done when:
     - Frequency-to-thickness logic is documented and exposed.
     - User can switch between optical and acoustic design modes.
     - Output remains traceable to the chosen design mode.

5. `Add period multiplier controls`
   - Outcome: Support a multiplier similar to the MATLAB workflow for longer effective periods.
   - Done when:
     - The multiplier changes derived stack geometry as expected.
     - UI labels explain the effect.
     - Resulting wavelength behavior is validated.

## Milestone 3: Visualization Upgrades

Goal: Improve how simulation results and stack structures are visualized.

### Issues

1. `Add Three.js stack visualization`
   - Outcome: Replace or augment the current stack diagram with a richer 3D view.
   - Done when:
     - Stack layers can be rendered in 3D.
     - The visualization remains readable at typical stack sizes.
     - The current diagram can be retained as a fallback if needed.

2. `Add reflectance heatmaps over wavelength and angle`
   - Outcome: Display 2D response maps for quick exploration.
   - Done when:
     - Wavelength and angle axes are both configurable.
     - Heatmap values match solver output.
     - Color scaling is understandable and labeled.

3. `Add wavelength versus acoustic frequency heatmap`
   - Outcome: Show the coupling between optical wavelength and acoustic frequency.
   - Done when:
     - The heatmap reflects computed simulation values, not placeholder data.
     - A user can identify candidate operating regions from the map.

4. `Add 3D playback visualization for display logic`
   - Outcome: Render the final display behavior with playback controls.
   - Done when:
     - Playback can be started, paused, and scrubbed.
     - Slice or plane behavior is visible in the visualization.
     - The display logic can be tested independently of hardware.

## Milestone 4: Volumetric Display Logic

Goal: Encode the physical display model beyond pure optical response.

### Issues

1. `Define reflection plane width logic`
   - Outcome: Compute and expose reflection plane width from the model.
   - Done when:
     - The width can be derived from simulation inputs.
     - The value is visible to the user or downstream logic.

2. `Define reflection plane location logic`
   - Outcome: Determine where in the volume the active plane should appear.
   - Done when:
     - Plane position is computed from model parameters.
     - The result is used by at least one visualization or export path.

3. `Define playback speed logic`
   - Outcome: Map simulation timing to display playback rate.
   - Done when:
     - Playback speed is configurable.
     - The timing model is documented.

4. `Model acousto-optic engine behavior`
   - Outcome: Capture the core logic driving the display engine.
   - Done when:
     - The model uses real or well-defined proxy reflection values.
     - Dependencies and assumptions are documented.
     - Open physics questions are tracked separately.

## Milestone 5: UI and Documentation Polish

Goal: Finish the user-facing experience and keep the project maintainable.

### Issues

1. `Complete the How To Use section`
   - Outcome: Document the workflow directly in the app UI.
   - Done when:
     - New users can understand the basic flow without external help.
     - The section matches current UI behavior.

2. `Refresh UI layout and visual hierarchy`
   - Outcome: Make the interface cleaner and easier to scan.
   - Done when:
     - Primary controls are visually grouped.
     - Secondary information is de-emphasized.
     - The layout remains responsive.

3. `Audit and update project documentation`
   - Outcome: Keep repository docs aligned with current implementation.
   - Done when:
     - README, handoff notes, and context docs match the current app.
     - Terminology is consistent across docs and UI.

## Milestone 6: Research and Open Questions

Goal: Track items that are not yet ready for implementation issues.

### Backlog

- `Define equations for acoustic wave interaction`
- `Research optimal reflection-value model for three.js playback`
- `Confirm EMAT design targets for frequency-to-geometry mapping`
- `Validate any non-quarter-wave acoustic assumptions`

These should remain as research tasks until they have a clear implementation path.

## Suggested GitHub Project Fields

Use these fields to make the project actionable:

- `Status`: `Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`
- `Area`: `Analysis`, `Optics`, `Visualization`, `Volumetric Logic`, `UI`, `Docs`, `Research`
- `Priority`: `P0`, `P1`, `P2`, `P3`
- `Type`: `Feature`, `Bug`, `Research`, `Docs`, `Chore`

## Recommended Issue Template

Use this shape for each issue created from the roadmap:

```md
### Goal
Short summary of the user-facing outcome.

### Scope
What is included, and what is explicitly out of scope.

### Acceptance Criteria
- Criterion 1
- Criterion 2
- Criterion 3

### Notes
Implementation details, formulas, dependencies, or open questions.
```

## Next Conversion Step

If you want, the next pass can turn this into:

1. A numbered issue backlog with priorities and dependencies
2. A GitHub Project column setup with draft issue titles
3. A release milestone plan with target versions
