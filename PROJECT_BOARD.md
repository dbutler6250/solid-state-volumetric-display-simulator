# GitHub Project Board Layout

Use this as the board structure for the simulator project.

## Board Columns

Map these directly to GitHub Project `Status` values:

1. `Backlog`
   - Ideas that are captured but not yet refined.
   - Add new roadmap items here by default.

2. `Ready`
   - Issues with clear scope and acceptance criteria.
   - Move items here when they can be worked without extra research.

3. `In Progress`
   - Items being actively implemented.
   - Limit to one primary issue per contributor when possible.

4. `Blocked`
   - Items waiting on a decision, dependency, or research result.
   - Include the blocking reason in a comment or project field.

5. `Done`
   - Completed issues that meet the acceptance criteria.
   - Leave closed items here for project history.

## Suggested Board Views

Use these saved views if the project supports them:

- `All Issues`
  - Shows every active issue and project item.

- `Priority Queue`
  - Filters to `Backlog`, `Ready`, and `Blocked`.
  - Sort by `Priority` then `Area`.

- `Active Work`
  - Filters to `In Progress`.
  - Sort by most recently updated.

- `Research Queue`
  - Filters to `Type = Research`.
  - Useful for physics and modeling questions before implementation.

## Draft Issue Cards

Create these as draft issues or project items in the order below.

### Analysis

1. `Add parameter sweep analysis`
   - Status: `Backlog`
   - Priority: `P1`
   - Area: `Analysis`

2. `Add multidimensional analysis support`
   - Status: `Backlog`
   - Priority: `P2`
   - Area: `Analysis`

3. `Add reflectance and transmission versus angle plots`
   - Status: `Backlog`
   - Priority: `P1`
   - Area: `Analysis`

4. `Add stopband evolution view`
   - Status: `Backlog`
   - Priority: `P2`
   - Area: `Analysis`

5. `Add polarization comparison`
   - Status: `Backlog`
   - Priority: `P2`
   - Area: `Analysis`

### Optics

6. `Support complex refractive index values`
   - Status: `Backlog`
   - Priority: `P1`
   - Area: `Optics`

7. `Improve stack definition UI`
   - Status: `Backlog`
   - Priority: `P1`
   - Area: `Optics`

8. `Support non-quarter-wave thicknesses`
   - Status: `Backlog`
   - Priority: `P1`
   - Area: `Optics`

9. `Add acoustic design thickness mode`
   - Status: `Blocked`
   - Priority: `P2`
   - Area: `Optics`
   - Note: Keep blocked until the frequency-to-thickness equation is finalized.

10. `Add period multiplier controls`
    - Status: `Backlog`
    - Priority: `P3`
    - Area: `Optics`

### Visualization

11. `Add Three.js stack visualization`
    - Status: `Backlog`
    - Priority: `P2`
    - Area: `Visualization`

12. `Add reflectance heatmaps over wavelength and angle`
    - Status: `Backlog`
    - Priority: `P2`
    - Area: `Visualization`

13. `Add wavelength versus acoustic frequency heatmap`
    - Status: `Blocked`
    - Priority: `P3`
    - Area: `Visualization`
    - Note: Depends on acoustic frequency model outputs.

14. `Add 3D playback visualization for display logic`
    - Status: `Blocked`
    - Priority: `P1`
    - Area: `Visualization`
    - Note: Depends on volumetric display logic being defined first.

### Volumetric Logic

15. `Define reflection plane width logic`
    - Status: `Blocked`
    - Priority: `P1`
    - Area: `Volumetric Logic`

16. `Define reflection plane location logic`
    - Status: `Blocked`
    - Priority: `P1`
    - Area: `Volumetric Logic`

17. `Define playback speed logic`
    - Status: `Blocked`
    - Priority: `P2`
    - Area: `Volumetric Logic`

18. `Model acousto-optic engine behavior`
    - Status: `Blocked`
    - Priority: `P0`
    - Area: `Volumetric Logic`

### UI and Docs

19. `Complete the How To Use section`
    - Status: `Backlog`
    - Priority: `P2`
    - Area: `Docs`

20. `Refresh UI layout and visual hierarchy`
    - Status: `Backlog`
    - Priority: `P2`
    - Area: `UI`

21. `Audit and update project documentation`
    - Status: `Backlog`
    - Priority: `P2`
    - Area: `Docs`

### Research

22. `Define equations for acoustic wave interaction`
    - Status: `Backlog`
    - Priority: `P0`
    - Area: `Research`

23. `Research optimal reflection-value model for three.js playback`
    - Status: `Backlog`
    - Priority: `P0`
    - Area: `Research`

24. `Confirm EMAT design targets for frequency-to-geometry mapping`
    - Status: `Backlog`
    - Priority: `P1`
    - Area: `Research`

25. `Validate any non-quarter-wave acoustic assumptions`
    - Status: `Backlog`
    - Priority: `P1`
    - Area: `Research`

## Recommended Ordering

Work the board in this order:

1. `Research` items that unblock physics-dependent work
2. `Optics` items that generalize the simulator core
3. `Analysis` items that expand the solver outputs
4. `Visualization` items that make the data easier to explore
5. `Volumetric Logic` items that connect the simulator to the display model
6. `UI` and `Docs` polish items

## Minimum Project Fields

Use these fields on every issue:

- `Status`
- `Priority`
- `Area`
- `Type`

Optional if you want more control:

- `Dependency`
- `Estimate`
- `Release`

