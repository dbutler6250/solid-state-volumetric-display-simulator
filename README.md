# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated 6/29/26

## Project Description

Browser-based optics simulation platform for solid-state volumetric display design.

Uses a Transfer Matrix Method (TMM) solver to simulate quarter-wave optical stacks and their reflectance/transmission performance metrics. The simulator now also includes an acoustic generator tab that converts an acoustic drive into an equivalent discretized optical stack with derived acoustic outputs and progress-aware stack generation. Built with TypeScript, React, Vite, and Plotly. Metrics will be used to develop a novel volumetric display prototype.

## Demonstration

Screenshots to be added once development is complete.

## How To Use

Screenshots and instructions to be added once development is complete.

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
