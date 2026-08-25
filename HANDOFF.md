# Handoff

## Repository Status

- Current branch: `main`.
- GitHub issue #70 / PR #71: merged into `main` as squash commit `7785d8b`.
- Cleanup: feature branch cleanup in progress after merge.
- PR #67 was previously squash-merged into `main` as `f68a051`.
- PR #69 was previously squash-merged into `main` as `fa886d5`.

## Latest Work

- Added `scripts/maxwellTroughRobustnessStudy.mts`.
- Added `src/simulation/validation/strainTroughRequirement.ts` and focused regression coverage.
- Generated:
  - `artifacts/issue-70/maxwell-trough-robustness-study.md`
  - `artifacts/issue-70/maxwell-trough-robustness-study.json`
- Updated `RESEARCH.md`, `ARCHITECTURE.md`, and `MILESTONES.md` for WP-v2-09D.

## Nominal Trough

- Source: `artifacts/issue-66/piezo-strain-window-study.json` at `bestTrough.design`.
- Length: `10 mm`.
- Average index: `1.45`.
- Delta n: `1e-4`.
- Grating period: `206.90 nm`.
- Laser wavelength: `600.11 nm`.
- Background strain: `0.0015`.
- Trough strain: `0`.
- Strain excursion: `0.0015`.
- Center: `5 mm`.
- Width: `0.8 mm`.
- Transition width: `0.25 mm`.

## Key Result

- Robustness: `MAXWELL-CONFIRMED TROUGH IS OPTICALLY VALID BUT TOLERANCE-LIMITED`.
- Laser compensation: `LASER TUNING DOES NOT MATERIALLY RELAX STRAIN TOLERANCES`.
- CMT-vs-Maxwell: `CMT TRACKS MAXWELL QUALITATIVELY BUT MISSTATES TOLERANCE WIDTHS`.
- Mechanical gate: `BIASED TROUGH REMAINS OPTICALLY PROMISING BUT MECHANICAL GATE REMAINS CLOSED`.

## Tolerance Table

| Parameter | Nominal | Tested useful bounds |
| --- | --- | --- |
| background strain | `0.0015` | `0.0015` to `0.0015` |
| trough strain / excursion | `0 / 0.0015` | trough strain `0` to `0` |
| trough width | `0.8 mm` | `0.8` to `0.8 mm` |
| transition width | `0.25 mm` | `0.25` to `0.32 mm` |
| position error | `0 mm` | `0` to `0 mm` |
| laser wavelength | `600.11 nm` | `600.11` to `600.11 nm` |

Sensitivity is high across the mechanical/control variables because the useful envelope is narrow. Validated useful optical scan depth is `5-5 mm` inside the `0-10 mm` physical medium under the selected samples.

## Verification Snapshot

- Baseline from `main` before branching:
  - `npx.cmd tsx scripts/piezoStrainWindowStudy.mts` - passed.
  - `npx.cmd tsx scripts/troughOpticalValidationStudy.mts` - passed.
  - `npx.cmd tsx scripts/highFidelityBraggValidationStudy.mts` - passed.
  - `npx.cmd tsx scripts/maxwellTroughSpatialValidationStudy.mts` - passed.
  - `npm.cmd run test` - passed, 34 files / 242 tests.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run build` - passed.
  - `npm.cmd run test:browser` - passed, 14 tests.
- Final branch verification:
  - `npx.cmd tsx scripts/piezoStrainWindowStudy.mts` - passed.
  - `npx.cmd tsx scripts/troughOpticalValidationStudy.mts` - passed.
  - `npx.cmd tsx scripts/highFidelityBraggValidationStudy.mts` - passed.
  - `npx.cmd tsx scripts/maxwellTroughSpatialValidationStudy.mts` - passed.
  - `npx.cmd tsx scripts/maxwellTroughRobustnessStudy.mts` - passed.
  - `npm.cmd run test` - passed, 35 files / 245 tests.
  - `npm.cmd run lint` - passed.
  - `npm.cmd run build` - passed.
  - `npm.cmd run test:browser` - passed, 14 tests.
  - In-app Browser smoke: `http://127.0.0.1:5173` loaded, one Plotly chart rendered, no console errors.

## Recommended Next Packet

Targeted Maxwell optical-envelope refinement before WP-v2-10.

Start from the required `epsilon(z)` plus the narrow Maxwell-confirmed tolerance envelope and test whether revised trough geometry, calibration assumptions, or alternate control variables can produce finite nonzero primary tolerances and a nonzero useful scan-depth span. Do not begin detailed mechanical realization yet.
