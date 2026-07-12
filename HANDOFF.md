# Handoff

## Latest Task

- Fixed the numeric form inputs so decimal fields can be backspaced/cleared while editing, then snap back to the prior value on blur.
- Removed trailing zeros from refractive-index display values and lowered refractive-index spinner steps to `0.001`.
- Branch: `issue-6-complex-refractive-index`.

## Verification

- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Notes

- The sweep controls were left unchanged as requested.
