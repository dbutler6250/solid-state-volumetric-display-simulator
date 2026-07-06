# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated 6/29/26

## Completed Milestones

- [x] Set up development environment
    - [x] Install required dependencies (Node.js, Lint, etc.)
    - [x] Configure IDE
    - [x] Create Github repository
- [x] Create project skeleton
- [x] Deploy blank application to GitHub Pages
- [x] Create UI structure
- [x] Configure UI dark mode
- [x] Implement Transfer Matrix Method (TMM) solver
- [x] Add basic UI controls
- [x] Implement backend diagnostics
- [x] Add sanity checks to TMM solver
- [x] Add optical stack diagram to UI
- [x] Improve optical stack diagram
    - [x] Remove horizontal scroll
    - [x] Fix lambda symbols
- [x] Clean up documentation for future reference and better AI tool integration
- [x] Allow custom refractive index values
- [x] Change layer thicknesses to dervied values based off of design wavelength
- [x] Add ability to center plot around bandwidth quickly
- [x] Correct FWHM bandwidth and peak reflectance/center
- [x] Add slider for fast sweep range adjustments
- [x] Add CSV export for simulation spectra
- [x] Add JSON export for simulation setup/configuration
- [x] Add JSON import for simulation setup/configuration
- [x] Recontextualize "Bragg" within codebase and genericize

## Future Milestones
- [] Add parameter sweeps and multidimensional analysis
- [] Add reflectance & transmission versus angle plots
- [] Add stopband evolution
- [] Add polarization comparison
- [] Add Three.js capabilities for improved stack visualizations and result visuals
- [] Add capabilites for complex refractive index handling
- [] Clean up UI
    - [] Complete How To Use section at bottom of page
- [] Improve stack definition UI
- [] Add capabilities outside of just quarter wave stacks
- [] Add secondary bandwidth output (not FWHM), based on user selected R% threshold
- [] Add reflectance heatmaps over wavelength and angle
- [] Add "period multiplier" similar to matlab to get closer to acoustic frequencies
- [] Allow custom non-quarter wave thicknesses to better simulate acoustic wave behavior?
    - [] Add acoustic logic (frequency input) and optionally(?) drive design thicknesses
- [] Create heat map of optical wavelength vs acoustic frequency of reflection
    - [] Pick out acoustic frequency to design EMAT against
- [] Add logic behind volumetric display simulation
    - [] reflection plane width
    - [] plane location
    - [] playback speed
    - [] Add logic for acousto-optic engine
        - [] Ideally want real reflection valuew driving three.js display simulation
        - [] Need to define equations and research more
- [] Add 3D visualization abilities to display outputs rom logic above (three.js)
    - [] Result should be similar to MKI slice simulator plus playback capabilities
    - [] Will have slicing structure complete and tested so it can be simulated in software regardless of hardware status
- [] ...
