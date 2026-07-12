# Handoff

## Latest Task

- Moved the derived layer thickness values out of the material rows and into the H/L optical-thickness rows in the stack definition summary.
- Removed the fractional-`λ` suffix from the optical-thickness display in that summary.
- Branch: `issue-7-stack-definition-cleanup`.

## Verification

- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Notes

- Scope stayed within the stack definition section.
