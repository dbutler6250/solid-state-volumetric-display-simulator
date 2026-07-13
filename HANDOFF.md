# Handoff

## Latest Task

- PR #44 / issue #43 now uses one canonical `SimulationDocument` and one shared `ResolvedStructure` for solving, Stack Definition, and result metadata.
- Fixed all six review findings:
  - only derived design-wavelength sweeps inherit analysis-range bounds; acoustic frequency and modulation retain configured bounds;
  - every acoustic sweep point is preflighted against the 4,096-slice limit, 200-point cap, and 25,000,000 aggregate layer-wavelength work cap before any spectrum runs;
  - acoustic resolution and spectrum solving are debounced, chunk-yielding, abortable, and protected from stale result ordering, while optical solving remains direct;
  - result and parameter-sweep CSV metadata comes from the canonical document plus the exact shared resolved stack and includes manual/acoustic physical geometry;
  - recentering rejects non-finite or unrepresentable reference intervals without applying invalid bounds and shows a clear UI error;
  - zero modulation is verified against an equivalent homogeneous layer across wavelength, polarization, and angle cases, with field-specific acoustic geometry/physics assertions.
- `solveResolvedStructure` is explicitly tested with supplied layers, and `StackDefinitionPanel` no longer resolves or materializes a second stack.
- Import resets stale sweep/result UI state, targets only the imported structure draft, shares analysis fields, and preserves the other drafts.
- Complex acoustic indices, schema-v1 imports, legacy Bragg imports, setup structure identity, and the fixed 0–89 degree angle sweep remain covered.

## Verification

- `npm.cmd run test` - passed (89 tests after the final focused additions).
- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `git diff --check` - passed (line-ending conversion notices only).

## Browser Verification

- Verified acoustic frequency defaults remain 500,000,000–1,500,000,000 Hz and modulation remains 0–0.004.
- Verified Reference representation constrains acoustic-period sweeps to 128 periods (4,096 slices) and excessive aggregate sweep work returns a clear error.
- Verified a 4,096-slice automatic acoustic solve remains editable and completes through the deferred path; Stack Definition reports the same 4,096 slices and resolved geometry used by the spectrum.
- Verified a roughly `1e20 nm` reference remains out of range and the recenter action reports that a safe 10–1,200 nm interval is not representable without corrupting the analysis range.
- Verified Optical → Manual → Acoustic → Optical/Manual preserves independent structure drafts while the analysis range is shared.
- Verified spectrum export controls enable for resolved manual and acoustic results; CSV content/metadata is covered by focused unit tests because programmatic Blob downloads were not captured by the in-app Browser download event.
- Verified desktop layout and 390 px width with all three output tabs visible and no horizontal document overflow.

## Remaining Limitations

- Acoustic solving is still a discretized-index TMM approximation; standing/traveling-wave dynamics and coupled-mode/Floquet physics remain future work.
- Acoustic work is cooperatively chunked on the main thread rather than moved to a Web Worker. Cancellation prevents stale commits and yielding preserves input responsiveness, but a worker remains the preferred future path for workloads beyond the enforced limits.
- Parameter sweeps remain explicit synchronous actions and are therefore guarded by per-point and aggregate limits.
