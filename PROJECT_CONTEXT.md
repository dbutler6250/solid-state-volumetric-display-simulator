# Volumetric Display Simulator Project Context

This file captures context transferred from a prior ChatGPT thread.

## Project Goal

Build a browser-based optics simulation platform that can evolve into a volumetric display design and analysis environment.

Version 1 should implement a Transfer Matrix Method (TMM) Bragg reflector simulator that lets users:

- Define multilayer dielectric stacks.
- Calculate reflectance and transmission spectra.
- Visualize results interactively.
- Explore parameter changes through a modern web UI.

The simulator should work from both desktop and mobile browsers.

## Current Architecture And Tech Stack

Chosen stack:

- TypeScript
- React
- Vite
- Plotly
- Three.js for future use
- GitHub Pages

Rationale:

- TypeScript for maintainable scientific code.
- React for scalable UI architecture.
- Vite for fast development and build workflow.
- Plotly for engineering and scientific charting.
- Three.js reserved for future optical visualization features.
- GitHub Pages for free static hosting.

Hosting model:

```text
Browser
|-- React UI
|-- Simulation Engine (TypeScript)
|-- Plotly Visualizations
`-- GitHub Pages Hosting
```

No backend server is planned for Version 1. All computation should run client-side in the browser.

## Important Decisions Already Made

Python plus Dash was considered and intentionally abandoned. The project should use TypeScript plus React.

Three.js remains part of the long-term stack, but it should not be implemented in Version 1. Introduce it only when optical visualization becomes necessary.

The architecture should be future-proof without being overengineered. Design the simulation engine so that:

- Additional optical structures can be added later.
- The Bragg reflector is only the first supported structure.
- Core TMM code remains reusable for future simulations.

## Version 1 Scope

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

- Reflectance versus wavelength using Plotly.

## Planned Future Versions

Version 1.5:

- Add automatic layer-stack visualization generated from user parameters.

Version 2:

- Add parameter sweeps and multidimensional analysis.
- Add reflectance versus angle.
- Add transmission versus angle.
- Add reflectance heatmaps over wavelength and angle.
- Add stopband evolution.
- Add polarization comparison.

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

- `materials/`: material definitions such as refractive index and future dispersion data.
- `layers/`: layer representations such as thickness and material association.
- `structures/`: optical structures such as Bragg reflectors, future gratings, and future cavities.
- `solvers/`: numerical engines, initially `transferMatrix.ts`.
- `sweeps/`: future wavelength and angle sweep helpers.
- `results/`: output data models, arrays, and metadata.

## Planned Commands And Run Steps

Session 1 setup:

```bash
npm create vite@latest
npm install
npm run dev
git init
git add .
git commit -m "Initial project setup"
git push
```

Deployment target:

- GitHub Pages

Preferred IDE:

- VS Code

Suggested VS Code extensions:

- ESLint
- Prettier
- GitHub Pull Requests and Issues

## Open Technical Questions

TMM scope:

- Quarter-wave stack assumptions?
- Arbitrary layer thicknesses?
- Material dispersion support?
- Complex refractive indices?
- TE only initially, or TE/TM from day one?

Data model:

- Define `Material`.
- Define `Layer`.
- Define `Structure`.
- Define `SimulationResult`.

Visualization scope:

- Single chart initially?
- Reflectance plus transmission chart?
- Multi-trace Plotly layouts?

## Constraints And Preferences

Strong preferences:

- Browser-only application.
- No backend server.
- Mobile and desktop accessible.
- GitHub Pages deployment.
- Future-proof architecture.
- Avoid unnecessary complexity.
- Keep simulation engine reusable.

Developer background:

- Comfortable with Java.
- Familiar with JavaScript.
- Familiar with HTML and CSS.
- New to TypeScript but willing to learn.
- Using VS Code.

Project philosophy:

- Prefer a simple foundation, clean architecture, and incremental growth.
- Avoid premature optimization, overengineering, and large framework sprawl.

## Next Recommended Task

Session 1 should set up the development environment and establish the project skeleton.

Goals:

1. Install Node.js.
2. Verify Node/npm.
3. Create Vite React TypeScript project.
4. Configure VS Code.
5. Create the initial folder structure.
6. Create the GitHub repository.
7. Push the first commit.
8. Deploy the blank application to GitHub Pages.

Success criteria:

- A working GitHub Pages URL serving a basic React application.
- No physics implementation yet.
- The full development pipeline is proven end to end before implementing the TMM solver.
