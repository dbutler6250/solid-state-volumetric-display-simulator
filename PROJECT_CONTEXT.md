# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated 6/29/26

## Project Goal

Build a browser-based optics simulation platform that can evolve into a volumetric display design and analysis environment.

Version 1 implements a Transfer Matrix Method (TMM) quarter-wave optical stack simulator that lets users:

- Define multilayer optical stacks
- Calculate reflectance and transmission spectra
- Visualize results interactively
- Explore parameter changes through a modern web UI

The current implementation also includes a proxy 3D reflectance view for the resolved quarter-wave stack. It is a visualization layer built on the canonical resolved structure and solver output, not a higher-fidelity field solver.

The simulator should work from both desktop and mobile browsers.

## Current Architecture And Tech Stack

Stack:

- TypeScript -> Maintainable scientific code
- React -> Scalable UI architecture
- Vite -> Development and build workflow
- Plotly -> Scientific charting
- Three.js -> Proxy 3D visualization layer
- GitHub Pages -> Free static hosting

Hosting model:

```text
Browser
|-- React UI
|-- Simulation Engine (TypeScript)
|-- Plotly Visualizations
`-- GitHub Pages Hosting
```

No backend server. All computation should run client-side in the browser.

## Important Decisions Already Made

The architecture should be future-proof without being overengineered. Design the simulation engine so that:

- Additional optical structures can be added later
- The quarter-wave stack is only the first supported structure
- Core TMM code remains reusable for future simulations
- New visualization layers should reuse the canonical resolved document and solver results rather than introducing a second structure-resolution path

## Scope Adjustments From PR #45

- The 3D output tab is intentionally a proxy visualization, not a new solver.
- Plane motion in the 3D tab has two user-facing modes: sweep and manual.
- Sweep mode is animated in the render loop and manual mode freezes the plane while exposing direct position control.
- The slice control affects both plane and volume presentation, so it is not only a plane-mode input.
- Overlay and clip controls update Three.js materials in place instead of rebuilding the renderer and scene graph.

## Version 1 Initial Scope

Inputs:

- `nH`: high-index material
- `nL`: low-index material
- `dH`: high-index layer thickness
- `dL`: low-index layer thickness
- Number of periods
- Design wavelength
- Incident angle
- Polarization: TE or TM

Outputs:

- Reflectance spectrum
- Transmission spectrum
- Peak reflectance
- Center wavelength
- Bandwidth

Primary visualization:

- Reflectance versus wavelength using Plotly

## Planned Project Structure

Top-level source structure:

```text
src/
|-- components/
|-- simulation/
|-- plots/
|-- visualization/
`-- types/
```

More detailed simulation structure:

```text
simulation/
|-- materials/
|-- layers/
|-- structures/
|-- solvers/
|   `-- transferMatrix.ts
|-- sweeps/
`-- results/
```

Expected responsibilities:

- `materials/`: material definitions such as refractive index and future dispersion data
- `layers/`: layer representations such as thickness and material association
- `structures/`: optical structures such as quarter-wave stacks, future gratings, and future cavities
- `solvers/`: numerical engines, initially `transferMatrix.ts`
- `sweeps/`: future wavelength and angle sweep helpers
- `results/`: output data models, arrays, and metadata
