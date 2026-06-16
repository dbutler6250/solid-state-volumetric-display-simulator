# Solid State Volumetric Display

## Project Direction

- Build a browser-based optics simulation platform that can grow into a volumetric display design and analysis environment.
- Version 1 is a Transfer Matrix Method Bragg reflector simulator.
- Keep the application browser-only with no backend server for Version 1.
- Target both desktop and mobile browsers.

## Preferred Stack

- TypeScript
- React
- Vite
- Plotly for scientific charts
- GitHub Pages for static hosting
- Three.js is reserved for future visualization work and should not be introduced in Version 1.

## Engineering Preferences

- Prefer a simple foundation, clean architecture, and incremental growth.
- Avoid premature optimization, overengineering, and unnecessary framework sprawl.
- Keep simulation code reusable so additional optical structures can be added later.
- Treat the Bragg reflector as the first supported structure, not the whole architecture.

## Version 1 Scope

- Inputs: high-index material, low-index material, high-index layer thickness, low-index layer thickness, period count, design wavelength, incident angle, and polarization.
- Outputs: reflectance spectrum, transmission spectrum, peak reflectance, center wavelength, and bandwidth.
- Primary visualization: reflectance versus wavelength with Plotly.

## Deferred Scope

- Do not implement Three.js in Version 1.
- Layer-stack visualization can wait for Version 1.5.
- Parameter sweeps, angle plots, heatmaps, stopband evolution, and polarization comparison belong in Version 2.

## Project Context

- Read `PROJECT_CONTEXT.md` for the imported summary from the prior ChatGPT thread before making architectural decisions.
