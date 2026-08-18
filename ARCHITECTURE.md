# Architecture Notes

## v1 Conceptual Model

```text
Inputs
-> specific optical structure
-> solver
-> spectrum
-> visualization
```

v1 is a useful research prototype. It established the React/Vite application shell, Plotly visualization, JSON/CSV import/export, sweep and heatmap infrastructure, quarter-wave stack modeling, TMM solving, and an acoustic index-grating comparison path.

The v1 physics model was still centered on resolving a selected structure into homogeneous layers for TMM. That remains valuable for quarter-wave studies, regression testing, and independent reference calculations.

## v2 Conceptual Model

```text
Spatial optical structure
-> physical perturbation field
-> material response
-> optical solver
-> experiment definition
-> derived metrics / visualization
```

The current leading research direction separates the permanent optical grating from the dynamic perturbation:

```text
PermanentBraggGrating
-> StrainField
-> MaterialResponse
-> SpatialCoupledModeSolver
-> Experiment
-> Outputs
```

The first v2 implementation supports a permanent uniform Bragg grating plus prescribed perturbation fields. Rectangular and Gaussian localized strain remain the legacy reference cases, and the same abstraction now also supports smooth top-hat, triangular, traveling sinusoid, standing wave, carrier-envelope packet, and two-tone superposition fields. The field changes the local period and refractive index through explicit first-order material-response logic. The coupled-mode solver samples the physical model into segments only at solver time, so future solvers can choose their own discretization.

This architecture is a guide, not a frozen API. The goal is to keep physical structure, perturbation, material response, solver, experiment setup, and metrics separable enough for unit tests, sweeps, worker execution, and later validation against TMM or measured data.

Current code boundaries:

- `structures/hybridBraggGrating.ts` owns the permanent grating model, UI-unit to SI conversion, and solver-time sampling orchestration.
- `perturbations/strainField.ts` owns dimensionless prescribed perturbation fields. Rectangular width is full width. Gaussian width is FWHM. Periodic fields are prescribed directly and are not physical actuator simulations.
- `responses/strainOpticResponse.ts` maps strain to local average index, local period, and local Bragg wavelength.
- `solvers/coupledMode/spatialBraggSolver.ts` consumes sampled local physical state and solves the scalar normal-incidence coupled-mode problem.
- `experiments/hybridBraggExperiments.ts` orchestrates spectra, fixed-laser pulse scans, and contrast metrics.

The moving active-region experiment follows the same layering:

```text
HybridBraggGrating
+ PerturbationField
+ MaterialResponse
+ SpatialBraggSolver
-> MovingPulseExperiment / FieldComparison
-> metrics / CSV / plot
```

Experiments select positions, wavelengths, and summary metrics. They do not own permanent grating physics, perturbation sampling, material response, or optical propagation formulas.

## Coupled-Mode Convention

The v2 scalar coupled-mode solver uses these conventions:

- `Delta n` is the sinusoidal peak refractive-index modulation amplitude about the average index, not peak-to-peak modulation.
- `Lambda` is the permanent grating period in meters.
- `lambda_B = 2 n_bar Lambda` is the local Bragg wavelength after strain response.
- `kappa = pi |Delta n| / lambda_B` is the weak sinusoidal grating coupling coefficient in inverse meters.
- `beta = 2 pi n_bar / lambda` is the local forward propagation constant.
- `K/2 = pi / Lambda` is the Bragg grating wave-number half-vector.
- `delta = beta - pi / Lambda` is local detuning in inverse meters. Exact local Bragg resonance has `delta = 0`.
- `A(z)` is the forward field amplitude and `B(z)` is the backward field amplitude along increasing `z` from grating entrance to exit.
- The solver assumes scalar, normal-incidence, lossless propagation with matched incident and exit media.
- Boundary conditions are `A(0) = 1` and `B(L) = 0`. The reflection amplitude is `r = -M21 / M22` from the accumulated transfer matrix. `R = |r|^2`.
- `T` is currently reported as `1 - R` under the lossless matched-boundary assumption. It is not an independently solved general transmission channel.
- Segments are piecewise-constant midpoint samples of local strain, index, period, coupling, and detuning.

For a uniform grating this convention gives:

```text
R(delta = 0) = tanh^2(kappa L)
```

and the detuned lossless uniform-grating closed form used by tests:

```text
gamma^2 = kappa^2 - delta^2
R = kappa^2 sinh^2(gamma L) /
    (gamma^2 cosh^2(gamma L) + delta^2 sinh^2(gamma L))
```

with the equivalent trigonometric form when `|delta| > kappa`.

## Validation Notes

Analytic uniform-grating tests cover `kappa L` from 0.01 to 3.5 and detuning ratios from `-2 kappa` to `+2 kappa`. The solver matches the closed forms to tight numerical tolerance and preserves spectral symmetry for ideal uniform gratings.

Localized rectangular strain converges more slowly than the uniform case because discontinuities move relative to midpoint segments. In the current validation case, 25 segments can differ from a 1600-segment reference by about 0.03 reflectance, while 400+ segments are below 0.005 max reflectance error. Use at least 400 segments for localized-strain studies until adaptive or boundary-aware segmentation exists.

TMM remains an independent numerical reference, not the solver source of truth. It converges toward the coupled-mode result as slices per grating period increase in the weak-modulation regime. Agreement degrades as modulation approaches `Delta n ~ 1e-3`, where coupled-mode assumptions, average-index treatment, finite grating termination, and discretized sinusoidal TMM sampling all become material.

The fixed-laser moving-pulse experiment reports the no-strain static baseline, peak reflectance, peak enhancement, guarded peak gain, position statistics, and an effective optical response width only when a single dominant enhancement peak exists. The prescribed strain-region width and the effective optical response width are separate quantities.

The moving-response regime map is also an experiment-layer feature. It sweeps laser detuning, prescribed strain width, permanent grating coupling, and strain shape while reusing the same fixed-laser moving-pulse solve at each cell. Classification stays transparent: peak enhancement, primary and secondary local maxima, secondary-peak ratio, localized positive-enhancement fraction, effective width, and boundary-dominated peak flags are retained as separate fields. The `single-dominant`, `multi-peak`, `broad`, `weak`, `no-enhancement`, `periodic-multi-plane`, `stationary-plane-array`, and `moving-envelope` labels are research conveniences for comparing modeled response shapes, not display-quality judgments.

The WP-v2-05 comparison helper keeps physical actuator concepts separate from prescribed fields:

```text
PhysicalActuator (future)
    -> PerturbationField
    -> MaterialResponse
    -> OpticalState
    -> Solver / Experiment
```

Current UI controls prescribe the perturbation field directly. Acoustic velocity, phase, and period parameters define ideal field snapshots; they do not yet model transducer bandwidth, cavity modes, attenuation, impedance matching, or thermo/electro-optic generation.

## Why The Change Happened

The earlier fully acoustic-grating direction made the acoustic field synonymous with optical periodicity. The newer hybrid hypothesis uses a fabricated Bragg grating for optical momentum matching and strong coupling, while a localized perturbation tunes only a region of that permanent grating. That changes the simulator requirements:

- local Bragg condition must be spatially resolved;
- permanent structure must exist with zero perturbation;
- perturbation can vary by position and eventually time;
- strain affects both grating period and refractive index;
- fixed-laser on/off contrast and active-region thickness become first-class outputs;
- TMM remains useful as an independent discretized reference solver.
## WP-v2-06 Segmented Hybrid Bragg Baseline

Hybrid Bragg permanent gratings now support two structure modes:

- `global`: the previous globally coherent uniform grating reference.
- `segmented`: multiple locally coherent Bragg sections separated optionally by unmodulated regions inside the same bulk medium.

Segmented mode tracks section count, section length, gap length, and an inter-section grating phase mode. Supported phase relationships are continuous phase, fixed phase reset, alternating phase, explicit phase sequence, and deterministic seeded pseudo-random phase. These phase modes alter the permanent grating phase relationship between sections; they do not imply temporal decoherence of the optical source.

The scalar spatial CMT solver now exposes calculated forward and backward optical amplitudes along the medium. The UI and analysis helpers use normalized backward intensity `|B(z)|^2` as the current reflection-region metric, while total reflectance remains the externally measured boundary result.

Segmented structures split solver intervals at section starts, section ends, and grating-to-gap boundaries so structural discontinuities do not sit inside a numerical cell. The nominal resolution still comes from `segmentCount`, but exact structural boundaries may add intervals.

## WP-v2-07 Optimization Foundation

Target-state optimization is an experiment-layer capability, not React component logic:

```text
ParameterizedGratingProfile
+ PhaseProfile
+ PerturbationField control state
-> MaterialResponse
-> SpatialBraggSolver
-> TargetReflectionState
-> ObjectiveMetrics / MultiStateObjectiveMetrics
-> deterministic search / study artifacts
```

`HybridCouplingProfile` supports uniform, Gaussian, raised-cosine, Tukey-like, and low-count piecewise coupling profiles. `HybridPhaseProfile` supports constant phase, global linear ramps, low-count piecewise phase zones, and alternating zones. These are sampled in `structures/hybridBraggGrating.ts` when solver intervals are created, so the solver still consumes piecewise-constant local coupling, phase, detuning, and material state.

`optimization/targetReflectionState.ts` owns `TargetReflectionState`, `ObjectiveMetrics`, multi-state aggregation, and deterministic depth-address lookup generation. It evaluates calculated normalized backward optical intensity `|B(z)|^2` against target windows and keeps target power, off-target power, strongest competitor, selectivity, reflectance, and active-region counts as separate raw outputs.

`optimization/gratingProfileSearch.ts` owns bounded candidate enumeration and ranking. The initial search intentionally uses interpretable low-dimensional profiles and same-peak / same-integrated coupling variants. It does not perform arbitrary continuous inverse design or optimize every perturbation sample independently.

## WP-v2-08 Actuator-Defined Prescribed Fields

Piezo-oriented controls remain prescribed perturbation fields, not mechanical actuator solvers:

```text
ActuatorCommand
-> PrescribedPerturbationField
-> MaterialResponse
-> PermanentGratingStructure
-> SpatialCmtSolver
-> TargetReflectionStateMetrics
```

`perturbations/strainField.ts` now supports prescribed piezo-like smooth windows, biased troughs, and actuator arrays. Array fields sum commanded neighboring windows directly so overlap is represented in the optical input instead of clipped or converted into separate optical regions.

`HybridBraggDesignInputs` stores actuator parameters in UI units: background strain bias, actuator count, pitch, active actuator index, primary command amplitude, and adjacent command amplitude. `structures/hybridBraggGrating.ts` converts those into SI strain-field parameters before the material response is sampled. The solver still receives only local strain, local grating properties, coupling, phase, and detuning samples.

Target-state evaluation accepts actuator-index control states for sequential array studies. This keeps lookup/addressability metrics shared across moving position scans, phase scans, and quasi-static actuator stepping.

Actuator arrays also carry an explicit `window` or `trough` polarity. Trough polarity applies the commanded smooth windows as local strain reductions on top of the global bias, preserving the distinction between positive local actuation and biased-background suppression.
