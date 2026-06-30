# Solid State Volumetric Display Simulator

Author: Dylan Butler
Last Updated 6/29/26

## Project Description

Browser-based optics simulation platform for solid-state volumetric display design.

Utilizes Transfer Matrix Method (TMM) solver to simulate [Bragg Reflectors](https://www.rp-photonics.com/bragg_mirrors.html) and their performance metrics. Built with TypeScript, React, Vite, and Plotly. Metrics will be used to develop a novel volumetric display prototype.

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
