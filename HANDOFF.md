# Handoff

## Latest Task

- Added JSON setup export for Phase 2 via `src/io/exportBraggConfigJson.ts` and wired an `Export Setup` button into `SimulationShell`.
- Added the CSV schema metadata line `# schema: ssvds-results-csv-v1` and renamed the chart control group aria-label to `Chart Controls`.

## Verification

- `npm.cmd run test` passed
- `npm.cmd run lint` passed
- `npm.cmd run build` passed

## Notes

- Added Vitest coverage for the JSON export contract and the CSV schema/version comment.
- Build still reports the pre-existing Vite chunk-size warning.
