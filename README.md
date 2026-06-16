# Solid State Volumetric Display Simulator

Browser-based optics simulation platform for solid-state volumetric display design.

Version 1 is scoped to a Transfer Matrix Method Bragg reflector simulator built with
TypeScript, React, Vite, and Plotly.

## Local Setup

1. Install Node.js LTS.
2. Install Git.
3. Install the recommended VS Code extensions when prompted.
4. Run `npm install`.
5. Run `npm run dev`.

Three.js is intentionally not included in Version 1.

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
