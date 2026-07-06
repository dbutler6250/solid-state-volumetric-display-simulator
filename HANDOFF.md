# Handoff

## Latest Task

- Added JSON setup export for Phase 2 via `src/io/exportBraggConfigJson.ts` and wired an `Export Setup` button into `SimulationShell`.
- Added the CSV schema metadata line `# schema: ssvds-results-csv-v1` and renamed the chart control group aria-label to `Chart Controls`.
- Added Phase 3 JSON setup import via `src/io/importBraggConfigJson.ts` with strict schema/app/structure validation, shared input validation reuse, and inline import errors in `SimulationShell`.
- Protected JSON setup export so invalid simulator inputs cannot be exported, disabled `Export Setup` while invalid, and surfaced a nearby guidance message while highlighted input issues remain.

## Verification

- `npm.cmd run test` passed
- `npm.cmd run lint` passed
- `npm.cmd run build` passed

## Notes

- Added Vitest coverage for the JSON export contract and the CSV schema/version comment.
- Added Vitest coverage for JSON import success and failure cases, including schema mismatch, missing inputs, invalid polarization, invalid material refractive index, invalid sweep range, and invalid point count.
- Build still reports the pre-existing Vite chunk-size warning.
