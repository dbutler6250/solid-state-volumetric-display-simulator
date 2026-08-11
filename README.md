# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated 6/29/26

## Project Description

Browser-based optics simulation platform for solid-state volumetric display design.

Uses a Transfer Matrix Method (TMM) solver to simulate quarter-wave optical stacks and their reflectance/transmission performance metrics. The simulator also includes an acoustic generator tab that converts an acoustic drive into an equivalent discretized optical stack with derived acoustic outputs and progress-aware stack generation.

An early v2 foundation now adds a headless hybrid permanent Bragg grating model. This separates a fabricated optical grating from a prescribed localized strain perturbation, applies an explicit first-order strain/material response, and evaluates spectra with a spatial coupled-mode solver. This is an architectural foundation and validation path, not a complete acoustic propagation or final volumetric-display model.

Built with TypeScript, React, Vite, and Plotly. Metrics will be used to develop a novel volumetric display prototype.

## Demonstration

Screenshots to be added once development is complete.

## How To Use

Screenshots and instructions to be added once development is complete.

Current stable capabilities:

- Quarter-wave optical stack spectra through the TMM solver.
- Manual optical layer thickness tuning.
- Acoustic index-grating layer generation and shared stack/sweep/export paths.
- Parameter sweeps, heatmaps, CSV export, and JSON setup import/export.

Early v2 / hybrid capabilities:

- Permanent uniform Bragg grating plus prescribed rectangular or Gaussian local strain.
- First-order strain response affecting local grating period and refractive index.
- Spatial coupled-mode spectra with analytic, detuned, convergence, and TMM cross-validation coverage.
- Fixed-laser moving active-region experiment showing reflectance versus perturbation position with baseline and metrics.
- Hybrid Bragg UI controls for inspecting spectra and moving-position response.

Planned v2 work includes active-length/coupling trade studies, apodized gratings, more realistic strain profiles, boundary-aware/adaptive segmentation, and eventually acoustic pulse propagation.

## Local Setup

1. Install Node.js LTS
2. Install Git
3. Install the recommended VS Code extensions when prompted (ESLint, Prettier, GitHub)
4. Run `npm install`
5. Run `npm run dev`

## GitHub Pages Deployment

This project includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

After Git is installed and visible in your terminal, initialize and push the repository:

```powershell
git init
git branch -M main
git add .
git commit -m "Initial project setup"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

In the GitHub repository settings:

1. Open **Settings > Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` again if the deploy workflow does not start automatically.

If PowerShell blocks `npm`, use `npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

## Local Dev Server

```powershell
Start only if port 5173 is not already listening:
if (-not (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) {
  $proc = Start-Process -WindowStyle Hidden -FilePath npm.cmd -ArgumentList 'run','dev','--','--host','127.0.0.1' -WorkingDirectory 'C:\Users\dbutl\OneDrive\Documents\Projects\Volumetric Display\Solid State\MkII\01_Software\Simulation Tool' -PassThru
  $proc.Id
}
Stop: 
Stop-Process -Id <PID>
```
