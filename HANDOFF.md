# Handoff

## Latest Task

- Refined the shared input model so `Input mode` now controls editable state while inactive values stay visible as reference.
- Added a resolver layer that propagates acoustic inputs into the solver-facing stack values, stack definition, and parameter-sweep defaults.
- Kept the acoustic generator as a convenience layer that seeds and updates the shared stack state without removing the manual/optical workflows.
- Removed the stale helper copy from the thickness readouts and cleaned up the acoustic/stack mode wording.
- Added tests for the resolver behavior plus the existing acoustic stack generation coverage.

## Verification

- `npm.cmd run test` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.

## Browser Verification

- Verified the input-mode selector, shared read-only reference values, acoustic resolver sync, and stack definition updates on desktop Chrome.
- Verified the acoustic tab remains selectable on mobile Chrome.

## Notes

- The acoustic generator now feeds the shared solver-facing stack state when active, but manual and optical workflows remain available.
- Remaining follow-up is the broader tab redesign to reduce duplication further if you want the acoustic workflow to become the dominant path visually.
