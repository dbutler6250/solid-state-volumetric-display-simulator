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

The simulator should work from both desktop and mobile browsers.

## Current Architecture And Tech Stack

Stack:

- TypeScript -> Maintainable scientific code
- React -> Scalable UI architecture
- Vite -> Development and build workflow
- Plotly -> Scientific charting
- Three.js -> Future use
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
