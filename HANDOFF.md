# Handoff

## Latest Task

- Fixed the absorption convention by negating the user-entered extinction coefficient when converting materials into the solver's complex refractive-index form.
- Added a regression test proving positive `k` reduces transmission instead of acting like gain.
- Branch: `issue-6-complex-refractive-index`.

## Verification

- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Notes

- `transferMatrix.ts` keeps the complex-index solver path; the convention fix lives in `src/simulation/materials/material.ts` so UI/import/export can still use positive `k`.
