# Volumetric Display Physics & Architecture Research

## Purpose

This document consolidates the independently reviewed research archive for the Volumetric Display project. It is intended as a durable technical reference for physical architecture decisions and for the Simulation Tool roadmap.

The working concept is a solid transparent medium in which a driven acoustic field produces a spatially and temporally varying refractive index through the photoelastic effect. Projected light then interacts with that dynamic index structure through coherent wave coupling.

The most important conceptual correction from the research is that the system should not primarily be modeled as light undergoing an enormous number of microscopic total-internal-reflection events. The more appropriate high-level description is:

\[
\boxed{
\text{electrical drive}
\rightarrow
\text{acoustic strain field}
\rightarrow
\Delta n(\mathbf r,t)
\rightarrow
\text{coherent optical mode coupling}
}
\]

The central feasibility questions are therefore whether the acoustic field can provide:

- the required optical momentum transfer,
- sufficient coupling strength,
- adequate phase coherence over the interaction length,
- acceptable acoustic and optical losses,
- and a useful angular radiance distribution for viewing.

---

## 1. Status Categories Used in This Document

### Established physics

Results that follow from standard optics, acoustics, or acousto-optic theory and were supported by the reviewed research.

### Engineering assumptions

Useful approximations or simplified models that are valid only under stated conditions and should not be mistaken for universal results.

### Architecture hypotheses

Plausible design directions for the volumetric display that remain unproven for this specific implementation.

### Open research questions

Issues that materially affect feasibility and require further analysis, simulation, or experiment.

---

# 2. Established Physics

## 2.1 Acoustic strain can modulate optical refractive index

An acoustic wave produces strain in a transparent solid. Through the photoelastic/elasto-optic effect, this strain changes the dielectric response and refractive index.

A simplified scalar representation is

\[
n(\mathbf r,t)=n_0+\Delta n(\mathbf r,t).
\]

For a traveling sinusoidal acoustic field,

\[
\boxed{
n(z,t)=n_0+\Delta n_0\cos(Kz-\Omega t)
}
\]

with

\[
K=\frac{2\pi}{\Lambda_a},
\qquad
\Omega=2\pi f_a,
\qquad
\Lambda_a=\frac{v_a}{f_a}.
\]

A commonly useful scalar approximation for the photoelastic index perturbation is

\[
\boxed{
\Delta n\sim-\frac12 n^3 p S
}
\]

where:

- \(n\) is refractive index,
- \(p\) is an effective photoelastic coefficient,
- \(S\) is strain.

The full physical treatment is tensorial and depends on acoustic mode, crystal orientation, optical polarization, and propagation geometry.

---

## 2.2 Weak refractive-index modulation can still produce strong coherent coupling

A small \(\Delta n\) is not by itself fatal to the concept. In a uniform, lossless Bragg-grating model at exact resonance, a useful coupled-mode result is

\[
\boxed{
R_{\text{peak}}=\tanh^2(\kappa L)
}
\]

where:

- \(\kappa\) is the optical coupling coefficient,
- \(L\) is the coherent interaction length.

For a weak sinusoidal grating, \(\kappa\) scales approximately as

\[
\boxed{
\kappa\propto\frac{\Delta n}{\lambda}
}
\]

with additional geometry, polarization, and modal-overlap factors.

In the weak-grating limit,

\[
\kappa L\ll1,
\]

so

\[
\tanh(\kappa L)\approx\kappa L
\]

and therefore

\[
\boxed{
R\approx(\kappa L)^2.
}
\]

If

\[
L=N\Lambda,
\]

then the weak-coupling scaling initially gives approximately

\[
\boxed{
R\propto N^2
}
\]

provided phase coherence and phase matching are maintained.

The physically meaningful strength parameter is therefore approximately

\[
\boxed{\kappa L}
\]

rather than \(\Delta n\) or period count alone.

---

## 2.3 Bragg scattering is coherent and directional

An ideal periodic refractive-index structure has discrete spatial Fourier components. Optical scattering from the periodic structure obeys momentum-selection conditions of the form

\[
\boxed{
\mathbf k_{\text{out}}=\mathbf k_{\text{in}}+m\mathbf K
}
\]

where:

- \(\mathbf k_{\text{in}}\) is the incident optical wave vector,
- \(\mathbf k_{\text{out}}\) is an allowed scattered optical wave vector,
- \(\mathbf K\) is the grating wave vector,
- \(m\) is diffraction order.

An ideal Bragg grating therefore does not intrinsically produce diffuse reflection. It coherently couples optical energy into allowed guided, diffracted, backward, radiation, or polarization modes according to symmetry, momentum matching, and modal overlap.

For this project, the preferred description is

\[
\boxed{
\text{coherent, mode-selective Bragg scattering}
}
\]

rather than simply "specular reflection."

---

## 2.4 Large interaction length cannot compensate for arbitrary phase mismatch

Increasing period count can compensate for weak coupling only after phase matching is satisfied.

A useful mismatch quantity is

\[
\boxed{
\Delta\mathbf k=
\mathbf k_{\text{out}}-
\mathbf k_{\text{in}}-
 m\mathbf K.
}
\]

A long grating remains useful only if accumulated mismatch remains sufficiently small. Schematically,

\[
\boxed{
|\Delta k|L\lesssim 1
}
\]

for strong coherent accumulation near the ideal phase-matched condition.

Therefore:

\[
\boxed{
\text{large }N\text{ can compensate for weak }\kappa,
\text{ but not arbitrary }\Delta k.
}
\]

This is one of the project's central design rules.

---

## 2.5 Coherence length matters as much as physical period count

A realistic acoustic index field can be represented as

\[
\boxed{
\Delta n(z,t)=A(z)\cos[Kz+\phi(z)-\Omega t].
}
\]

The total reflected/scattered amplitude from many sections can be represented schematically as

\[
\boxed{
A_r=\sum_{m=1}^{N}a_m e^{i\phi_m}.
}
\]

For ideal phase coherence,

\[
|A_r|\propto N,
\]

leading to the approximate weak-coupling scaling

\[
R\propto N^2.
\]

If phase errors become effectively random, the coherent amplitude scaling can collapse toward approximately

\[
|A_r|\sim\sqrt N
\]

statistically rather than \(N\).

The architecture must therefore distinguish

\[
\boxed{
N_{\text{physical}}\neq N_{\text{coherent}}
}
\]

in a nonideal device.

Potential coherence limits include:

- acoustic attenuation,
- acoustic dispersion,
- transducer phase error,
- frequency instability,
- thermal gradients,
- material inhomogeneity,
- acoustic reflections from boundaries,
- finite optical beam dimensions,
- optical wavefront curvature.

---

## 2.6 A traveling acoustic grating exchanges both momentum and energy with light

Unlike a static dielectric grating,

\[
n(z)=n_0+\Delta n\cos Kz,
\]

a traveling acoustic grating is time dependent:

\[
\boxed{
n(z,t)=n_0+\Delta n\cos(Kz-\Omega t).
}
\]

The optical interaction can therefore satisfy both

\[
\boxed{
\mathbf k_{\text{out}}=\mathbf k_{\text{in}}\pm\mathbf K
}
\]

and

\[
\boxed{
\omega_{\text{out}}=\omega_{\text{in}}\pm\Omega.
}
\]

Thus a traveling acoustic grating generally produces an optical frequency shift of approximately

\[
\boxed{
\Delta f=\pm f_a.
}
\]

A standing acoustic wave should instead be treated as a superposition of counterpropagating acoustic components.

---

# 3. Total Internal Reflection: Useful but Secondary

## 3.1 TIR remains possible for very small index contrast

At a sharp interface with

\[
n_1>n_2,
\]

the critical angle is

\[
\boxed{
\theta_c=\sin^{-1}\left(\frac{n_2}{n_1}\right).
}
\]

Let

\[
n_1=n+\Delta n,
\qquad
n_2=n,
\qquad
\Delta n\ll n.
\]

Define the small angle from grazing incidence

\[
\delta=90^\circ-\theta_c.
\]

Then approximately

\[
\boxed{
\delta\approx\sqrt{\frac{2\Delta n}{n}}
}
\]

in radians.

Therefore arbitrarily small positive index contrast can theoretically permit TIR, but the angular acceptance collapses toward grazing incidence as \(\Delta n\rightarrow0\).

This establishes an important distinction:

\[
\boxed{
\text{existence of TIR}\neq\text{strong optical confinement}.
}
\]

---

## 3.2 Evanescent penetration depth controls practical confinement

Under TIR, the electromagnetic field extends into the lower-index region. For a simple planar interface,

\[
\boxed{
\kappa_e=
 k_0\sqrt{n_1^2\sin^2\theta_i-n_2^2}
}
\]

with

\[
k_0=\frac{2\pi}{\lambda_0}.
\]

The corresponding amplitude penetration depth is

\[
\boxed{
\delta_E=
\frac{\lambda_0}
{2\pi\sqrt{n_1^2\sin^2\theta_i-n_2^2}}.
}
\]

Near the critical angle,

\[
\delta_E\rightarrow\infty.
\]

This reinforces that very weak index contrast can give mathematically valid TIR while still producing weak spatial confinement.

A useful engineering criterion for a physical cladding or surrounding region is of the form

\[
\boxed{
t_{\text{clad}}\gtrsim m\delta_E
}
\]

for an application-specific attenuation factor \(m\), rather than assuming a universal cladding thickness.

---

## 3.3 Telecom fiber dimensions are not optical minimums

Common telecom fibers use a 125-\(\mu\text{m}\) outer glass diameter, but this is primarily a standardized mechanical and interconnection geometry rather than a universal electromagnetic requirement.

For a cylindrical weak-guidance structure, more meaningful quantities include numerical aperture

\[
\boxed{
NA=\sqrt{n_{\text{core}}^2-n_{\text{clad}}^2}
}
\]

and, for \(\Delta n\ll n\),

\[
\boxed{
NA\approx\sqrt{2n\Delta n}.
}
\]

The normalized frequency is

\[
\boxed{
V=\frac{2\pi a}{\lambda_0}
\sqrt{n_{\text{core}}^2-n_{\text{clad}}^2}
}
\]

or approximately

\[
\boxed{
V\approx\frac{2\pi a}{\lambda_0}\sqrt{2n\Delta n}.
}
\]

These are more relevant than importing conventional fiber-cladding dimensions into the acoustic architecture.

---

## 3.4 Reflection-count models are only rough ray-optics diagnostics

For a straight step-index fiber treated as a meridional ray system, with \(\alpha\) measured from the fiber axis,

\[
\boxed{
N\approx\frac{L\tan\alpha}{d}
}
\]

is a useful geometrical estimate for core-boundary encounters over length \(L\) and core diameter \(d\).

This is not a suitable primary model for wavelength-scale acoustic index structures, guided optical modes, or coherent Bragg gratings. The project should not use "number of TIR reflections" as a principal design metric.

---

# 4. Direct Visible-Light Backreflection and the Acoustic Frequency Problem

## 4.1 First-order backreflection requires a very short grating period

For exact optical reversal,

\[
\mathbf k_{\text{out}}=-\mathbf k_{\text{in}}.
\]

The grating must therefore supply approximately

\[
K=2k.
\]

Using

\[
K=\frac{2\pi}{\Lambda_a},
\qquad
k=\frac{2\pi n}{\lambda_0},
\]

gives

\[
\boxed{
\Lambda_a=\frac{\lambda_0}{2n}.
}
\]

For example, with

\[
\lambda_0=532\text{ nm},
\qquad
n=1.5,
\]

\[
\Lambda_a\approx177\text{ nm}.
\]

If

\[
v_a=5000\text{ m/s},
\]

then

\[
\boxed{
f_a=\frac{v_a}{\Lambda_a}\approx28\text{ GHz}.
}
\]

This is a fundamental momentum-matching result for the assumed first-order collinear backreflection geometry, not merely an implementation inconvenience.

---

## 4.2 Why ordinary AOMs deflect instead of backreflect

Ordinary AOMs use much longer acoustic wavelengths, often on the order of tens of micrometers. Their grating momentum is therefore far smaller than the optical momentum needed for complete reversal.

In a simple small-angle AO geometry,

\[
\boxed{
\theta_D\approx\frac{\lambda_0 f_a}{v_a}.
}
\]

Thus moderate RF frequencies naturally produce modest angular deflection rather than retroreflection.

This explains the difference between conventional AOM behavior and first-order fiber-Bragg-like backreflection.

---

# 5. Higher-Order / Integer-Multiple Bragg Hypothesis

## 5.1 Established result for discrete multilayers

For a conventional discrete quarter-wave Bragg reflector at normal incidence,

\[
\boxed{
nd=\frac{\lambda_0}{4}
}
\]

for first-order quarter-wave thickness.

Odd multiples preserve the relevant optical phase relation:

\[
\boxed{
nd=(2m+1)\frac{\lambda_0}{4},
\qquad
m=0,1,2,\ldots
}
\]

This allows discrete optical layers to be made thicker while retaining the design-wavelength phase relation.

---

## 5.2 This result cannot automatically be transferred to a sinusoidal acoustic grating

A rectangular or piecewise multilayer structure contains higher spatial Fourier harmonics. A perfect sinusoidal acoustic modulation,

\[
\Delta n(z)=\Delta n_0\cos Kz,
\]

contains primarily the spatial components at

\[
\pm K.
\]

A rectangular periodic structure contains harmonics such as

\[
K,\ 3K,\ 5K,\ldots
\]

with amplitudes determined by its Fourier series.

Higher-order optical scattering can schematically satisfy

\[
\boxed{
2k\approx mK.
}
\]

However, a large harmonic order is useful only if the real acoustic index waveform contains a sufficiently strong spatial Fourier component at \(mK\).

### Current status

The hypothesis that an odd-integer-multiple acoustic period can substantially reduce the required fundamental acoustic frequency while preserving useful visible-light backreflection is **unresolved**.

The correct research question is:

\[
\boxed{
\text{What spatial Fourier component supplies the required optical momentum, and how strong is it?}
}
\]

This is the highest-priority unresolved physics question in the archive.

---

# 6. Angular Selectivity and Viewing Geometry

## 6.1 Strong volume Bragg coupling is naturally directional

An ideal volume Bragg grating is angularly selective. Its diffraction efficiency has a finite response

\[
\eta(\Delta\theta),
\]

rather than operating at one mathematical delta-function angle, but longer/thicker high-efficiency gratings generally produce narrower angular acceptance.

This creates a central tradeoff:

\[
\boxed{
L\uparrow
\Rightarrow
\begin{cases}
\text{stronger coherent coupling}\\
\text{narrower angular acceptance}
\end{cases}
}
\]

Therefore a very long grating that solves weak coupling may simultaneously become highly directional.

---

## 6.2 A directional Bragg reflector is not automatically a wide-angle voxel

The display ultimately requires an angular radiance distribution

\[
\boxed{
I_{\text{voxel}}(\theta,\phi).
}
\]

A single high-efficiency Bragg channel naturally produces a narrow output angular distribution rather than Lambertian emission.

Directionality is beneficial for optical routing but can be harmful for a naked-eye voxel that must be visible from many positions.

A future system requirement should therefore define a target viewing solid angle

\[
\Omega_{\text{view}}
\]

and compare it against the angular coverage of one Bragg channel.

For small horizontal and vertical angular spans,

\[
\boxed{
\Omega_{\text{view}}
\approx
\Delta\theta_x\Delta\theta_y
}
\]

with angles in radians.

A rough channel-count estimate is

\[
\boxed{
N_{\text{views}}\sim\frac{\Omega_{\text{view}}}{\Omega_B}
}
\]

subject to overlap and actual response shape.

---

## 6.3 Wide-angle strategies that remain plausible

### Multiple simultaneous acoustic/grating modes

Generate multiple grating vectors

\[
\mathbf K_1,\mathbf K_2,\ldots,\mathbf K_M
\]

so that multiple output channels are simultaneously available.

### Time-multiplexed viewing directions

Use a time-varying grating vector

\[
\mathbf K=\mathbf K(t)
\]

and scan viewing directions rapidly relative to visual integration.

### Separate selection from emission

Use Bragg interaction for localization or routing, followed by a second process that provides the desired angular distribution:

\[
\boxed{
\text{projector}
\rightarrow
\text{Bragg selection/coupling}
\rightarrow
\text{localized optical energy}
\rightarrow
\text{wide-angle emission/scattering mechanism}
\rightarrow
\text{viewer}
}
\]

No particular secondary emission mechanism has yet been established.

---

## 6.4 Strategies that should not be treated as solved

- **Chirping** can broaden spectral or angular acceptance, but does not automatically create diffuse wide-angle emission.
- **Random disorder** broadens angular scattering by sacrificing coherent efficiency and should not be assumed to be a free solution.
- **An input diffuser** broadens the incident angular spectrum, but a narrow Bragg structure still acts as an angular filter and can reject most of that power.
- **PDLC** represents a substantially different material and scattering architecture, not a minor modification of the present solid acoustic-grating concept.

---

# 7. Multi-Tone RF and Acoustic Field Synthesis

## 7.1 Multiple RF tones can create multiple acoustic spatial frequencies

A multi-tone drive can be represented as

\[
V(t)=\sum_j V_j\cos(2\pi f_j t+\phi_j).
\]

In the small-signal linear regime, the resulting acoustic/index field can be approximated as

\[
\boxed{
\Delta n(\mathbf r,t)=
\sum_j
\Delta n_j
\cos(
\mathbf K_j\cdot\mathbf r-
\Omega_j t+
\phi_j
).
}
\]

with

\[
\boxed{
K_j=\frac{2\pi f_j}{v_a}.
}
\]

This provides a physically plausible route to dynamically multiplexed acousto-optic channels.

---

## 7.2 Frequency control changes grating magnitude, not automatically direction

For a fixed transducer/acoustic propagation geometry, changing frequency changes

\[
|\mathbf K|
\]

but does not necessarily change

\[
\hat{\mathbf K}.
\]

Therefore:

\[
\boxed{
f\rightarrow|\mathbf K|}
\]

is generally valid, while

\[
\boxed{f\not\Rightarrow\hat{\mathbf K}}
\]

without additional geometry or mode effects.

A single transducer may therefore provide one-dimensional angular steering but may be insufficient for broad two-dimensional viewing-zone control.

---

## 7.3 Acoustic phased-array control is a plausible architecture hypothesis

A transducer array with controlled relative phases may permit control over acoustic propagation direction as well as frequency.

Conceptually:

- RF frequency controls \(|\mathbf K|\),
- transducer geometry and phase control \(\hat{\mathbf K}\),
- amplitude and time dependence control the spatiotemporal grating strength.

A generalized drive could be represented as

\[
\boxed{
s_{\text{RF}}(t)=
\sum_j A_j(t)
\cos[2\pi f_j(t)t+\phi_j(t)].
}
\]

This remains a design hypothesis, not an established final architecture.

---

# 8. Acoustic Transit Time and Projection Synchronization

## 8.1 The acoustic volume cannot reconfigure instantaneously

A drive change propagates through the medium at acoustic velocity. For propagation length \(L\),

\[
\boxed{
t_{\text{transit}}=\frac{L}{v_a}.
}
\]

For a frequency-swept drive, the local acoustic frequency can be thought of approximately as a delayed copy of the drive history:

\[
\boxed{
f(z,t)\approx f_{\text{drive}}\left(t-\frac{z}{v_a}\right).
}
\]

Thus a temporal waveform maps into a spatial acoustic structure through finite sound velocity.

---

## 8.2 Timing error maps directly to depth error

If acoustic motion is used as a volumetric coordinate,

\[
\boxed{z=v_at.}
\]

A timing error \(\Delta t\) therefore gives

\[
\boxed{\Delta z=v_a\Delta t.}
\]

Example:

for

\[
v_a=3400\text{ m/s},
\]

\[
\Delta t=1\ \mu\text{s}
\]

corresponds to

\[
\Delta z=3.4\text{ mm}.
\]

For a desired axial uncertainty of

\[
\Delta z=100\ \mu\text{m},
\]

the timing requirement would be approximately

\[
\Delta t\approx29\text{ ns}.
\]

These numbers are illustrative and scale directly with the selected material velocity and target voxel depth.

---

## 8.3 Projection pattern rate may be a primary bottleneck

If consecutive depth slices are separated by \(\Delta z\), then

\[
\boxed{
\Delta t=\frac{\Delta z}{v_a}
}
\]

and the required optical pattern rate is

\[
\boxed{
f_{\text{pattern}}=\frac{v_a}{\Delta z}.
}
\]

For

\[
v_a=3400\text{ m/s},
\]

and

\[
\Delta z=1\text{ mm},
\]

\[
f_{\text{pattern}}=3.4\text{ MHz}.
\]

For

\[
\Delta z=100\ \mu\text{m},
\]

\[
\boxed{f_{\text{pattern}}=34\text{ MHz}.}
\]

These are arbitrary full-pattern update rates, not individual micromirror switching rates. A conventional full-frame DLP architecture may therefore become a serious throughput constraint at high axial resolution.

Potential architectural responses include lower axial resolution, shorter acoustic travel distance, sparse updates, subframe encoding, line scanning, or a different optical-addressing scheme. These remain design options rather than conclusions.

---

# 9. Material Selection

## 9.1 No optimum glass has yet been established

Heavy flint glasses such as SF57 or SF6 remain candidates, but the research did not establish them as the optimum medium.

A commonly used acousto-optic figure of merit has the approximate form

\[
\boxed{
M_2=\frac{n^6p_{\text{eff}}^2}{\rho v_a^3}.
}
\]

Therefore high refractive index helps strongly through \(n^6\), but material performance also depends on:

- effective photoelastic coefficient \(p_{\text{eff}}\),
- density \(\rho\),
- relevant acoustic velocity \(v_a\),
- acoustic attenuation \(\alpha_a(f)\),
- optical absorption,
- dispersion,
- thermal properties,
- practical availability and cost.

### Architecture implication

Material selection should be comparative and data driven. The project should maintain a material catalog rather than hard-code a single preferred glass.

---

# 10. Acoustic Transducer Options

## 10.1 Conductive-film Lorentz-force actuation is physically plausible

A conventional Lorentz-force EMAT requires a conducting region. The force density is

\[
\boxed{
\mathbf f_L=\mathbf J\times\mathbf B.
}
\]

A nonconductive glass or crystal cannot directly support the required eddy current, but a thin conductive film on the dielectric can act as the driven element and transfer elastic motion into the substrate.

This is physically legitimate, but such a system is more accurately treated as a Lorentz-force thin-film acoustic actuator coupled to a dielectric than as a conventional bulk EMAT.

---

## 10.2 PCB geometry does not impose a universal MHz ceiling

Meander-line pitch can select an acoustic spatial wavelength, but acoustic frequency is governed by

\[
\boxed{f=\frac{v_{\text{phase}}}{\lambda_a}.}
\]

PCB fabrication resolution alone does not define a universal 1-5 MHz upper limit. Real limits arise from conductor pitch, RF impedance, parasitics, skin/proximity effects, achievable current, lift-off, acoustic mode selection, attenuation, and substrate geometry.

Nevertheless, ordinary PCB-EMAT architectures appear poorly matched to a direct-visible-backreflection design if that design genuinely requires multi-GHz or tens-of-GHz acoustics.

---

## 10.3 Skin depth is relevant to conductive-film designs

For a conductor,

\[
\boxed{
\delta_s=\sqrt{\frac{2}{\omega\mu\sigma}}
}
\]

where \(\omega=2\pi f\), \(\mu\) is permeability, and \(\sigma\) is conductivity.

At high frequency, the relation between conductive-film thickness and skin depth affects induced-current distribution and transduction behavior.

---

## 10.4 Acoustic impedance must be modeled rather than assumed catastrophic

For longitudinal waves,

\[
\boxed{Z=\rho v_L.}
\]

For a simple normally incident interface, the pressure-amplitude reflection coefficient is

\[
\boxed{
r_p=\frac{Z_2-Z_1}{Z_2+Z_1}
}
\]

and the ideal transmitted power fraction is

\[
\boxed{
T=\frac{4Z_1Z_2}{(Z_1+Z_2)^2}.
}
\]

A thin metal/bond/glass stack cannot be judged solely from bulk impedance mismatch. Film thickness relative to acoustic wavelength and multilayer phase must also be considered.

---

## 10.5 Thin-film piezoelectric transducers are currently the stronger high-frequency candidate

The research supports keeping thin-film piezoelectric transduction, including AlN-family devices, as a stronger candidate than a conventional PCB EMAT for the high-frequency branch of the project.

A simplified piezoelectric relation is

\[
\boxed{S=dE}
\]

with the full constitutive equations required for realistic tensorial modeling.

Thin-film piezoelectric structures do not automatically solve the macroscopic multi-GHz acoustic-field problem, but they are more naturally compatible with compact high-frequency excitation than PCB EMATs.

### Current architecture posture

Retain at least three transducer branches for comparison:

1. PCB/bulk EMAT for lower-frequency experimentation,
2. conductive thin-film Lorentz actuator,
3. integrated thin-film piezoelectric transducer or array.

No final transducer selection is established.

---

# 11. Engineering Assumptions and Model Boundaries

The following assumptions recur in the simplified equations above and should remain explicit.

## Optical

- Linear, lossless or weakly lossy dielectric unless otherwise stated.
- Scalar refractive index where anisotropy is neglected.
- Plane-wave or guided-mode approximations depending on solver.
- Ideal periodicity for analytic Bragg expressions.
- Exact resonance for \(R_{\text{peak}}=\tanh^2(\kappa L)\).
- Weak modulation for simple proportionality \(\kappa\propto\Delta n/\lambda\).

## Acoustic

- Linear elasticity and small-signal superposition for multi-tone fields.
- Single phase velocity when writing \(\Lambda_a=v_a/f_a\).
- Acoustic attenuation, dispersion, reflections, and finite-aperture effects neglected unless explicitly modeled.

## TIR / waveguide approximations

- Sharp planar interfaces for critical-angle and evanescent-depth equations.
- Weak-guidance approximation for \(NA\approx\sqrt{2n\Delta n}\).
- Meridional geometrical rays only for the simple fiber reflection-count estimate.

## Display timing

- A single dominant acoustic propagation velocity for \(z=v_at\).
- Projection pattern changes treated as synchronized with the local acoustic state.
- Pattern-rate examples are illustrative rather than current hardware specifications.

---

# 12. Proposed High-Level Architecture

The most defensible architecture emerging from the research is:

\[
\boxed{
\begin{array}{c}
\text{high-speed RF synthesis}\\
\downarrow\\
\text{thin-film piezoelectric transducer / array}\\
\downarrow\\
\text{controlled longitudinal acoustic field}\\
\downarrow\\
\text{photoelastic }\Delta n(\mathbf r,t)\\
\downarrow\\
\text{phase-matched coherent optical coupling}\\
\downarrow\\
\text{angular multiplexing / scanning / secondary emission}\\
\downarrow\\
\text{viewer}
\end{array}
}
\]

This is a **design hypothesis**, not a finalized architecture.

The most important conceptual change from the original TIR-oriented intuition is that the acoustic medium should be treated as a **programmable volumetric diffraction structure**, not primarily as a moving set of microscopic reflecting interfaces.

---

# 13. Simulation Tool Implications

The current TypeScript/React Simulation Tool and its transfer-matrix foundation remain useful. The research suggests extending the solver architecture in stages rather than replacing the existing TMM model.

## 13.1 Solver A — Explicit optical multilayer TMM

Use for:

- quarter-wave stacks,
- rectangular gratings,
- finite layered structures,
- TE/TM behavior,
- angle and wavelength spectra.

This is the correct model for explicit piecewise-constant optical stacks.

---

## 13.2 Solver B — Uniform coupled-mode grating solver

Needed for very long weak gratings where constructing thousands to millions of explicit layers is unnecessary or numerically inefficient.

Candidate inputs:

\[
\Delta n,\quad
\Lambda,\quad
N,\quad
L,\quad
\lambda,\quad
\theta.
\]

Candidate derived quantities:

\[
\kappa,\quad
\kappa L,\quad
\Delta k,\quad
\Delta kL,\quad
R,\quad
T.
\]

A grating-strength metric

\[
\boxed{S=\kappa L}
\]

would be useful for period-count and coupling sweeps.

---

## 13.3 Solver C — Fourier / higher-order grating model

This solver is essential for resolving the integer-multiple hypothesis.

It should compare spatial Fourier spectra for:

- sinusoidal index modulation,
- rectangular modulation,
- intentionally distorted acoustic waveforms,
- waveforms with higher harmonics.

The central output is the strength of the spatial Fourier component capable of satisfying

\[
2k\approx mK.
\]

This should be developed before treating low-frequency higher-order visible backreflection as feasible.

---

## 13.4 Solver D — Acoustic/material model

Candidate inputs:

\[
f_a,\quad
v_a,\quad
\rho,\quad
p_{ij},\quad
\alpha_a(f),\quad
P_a,
\]

plus mode/polarization and geometry as the model matures.

Candidate outputs:

\[
\Lambda_a,\quad
M_2,\quad
S,\quad
\Delta n.
\]

The longer-term goal should be to derive

\[
\boxed{
\Delta n=f(P_{\text{acoustic}},\rho,v,p,n,\text{geometry})
}
\]

rather than treating \(\Delta n\) only as a free optical input.

---

## 13.5 Solver E — Acoustic timing model

The simulator should derive

\[
\boxed{t_{\text{transit}}=\frac{L}{v_a}}
\]

and

\[
\boxed{\Delta z=v_a\Delta t}
\]

as well as

\[
\boxed{f_{\text{pattern}}=\frac{v_a}{\Delta z}}.
\]

These quantities connect acoustic architecture directly to projector timing and volumetric resolution.

---

## 13.6 Solver F — Angular/viewing model

Display feasibility ultimately requires angular response rather than only spectral reflectance.

A general target quantity would resemble

\[
\boxed{
\eta(
\lambda,
\theta_{\text{in}},
\phi_{\text{in}},
\theta_{\text{out}},
\phi_{\text{out}}
).
}
\]

Near-term useful outputs include:

- Bragg angle,
- output angle,
- angular FWHM,
- viewing-zone width,
- number of angular channels,
- target-mode efficiency versus unwanted-mode power.

The existing parameter-sweep and heatmap architecture is well suited to plots such as:

\[
\lambda\times\theta,
\]

\[
L\times\Delta\theta,
\]

\[
N\times\text{angular bandwidth},
\]

and eventually

\[
f_a\times f_{\text{RF-span}}\rightarrow\text{available steering angle}.
\]

---

## 13.7 Future nonideal/disorder model

The simulator should eventually distinguish among:

- desired coherent reflected/diffracted power,
- coherent coupling into unwanted radiation modes,
- disorder-induced diffuse scattering.

Useful future fields include

\[
A(z),\quad
\phi(z),\quad
\sigma_A,\quad
\sigma_\phi,\quad
L_{\text{coh}}.
\]

The current 1D TMM model represents the ideal laterally infinite coherent limit and therefore contains no diffuse-scattering channel. That limitation should remain explicit.

---

# 14. Current Conclusions by Confidence Level

## Strongly supported

- Acoustic strain can create optical refractive-index modulation.
- Many weak coherent interactions can produce strong Bragg coupling.
- Increasing coherent interaction length can compensate for weak \(\Delta n\).
- Phase/momentum matching is mandatory.
- Ideal Bragg scattering is coherent and directional rather than intrinsically diffuse.
- RF frequency can dynamically control acousto-optic diffraction/deflection.
- Large physical period count is useful only to the extent that acoustic and optical phase coherence are preserved.

## Plausible and worth developing

- Very long weak acoustic gratings as high-coupling structures.
- Multi-tone RF control for multiple simultaneous diffraction channels.
- Acoustic phased-array control for broader directional control.
- Time-multiplexed viewing directions.
- Thin-film piezoelectric excitation of the optical medium.
- Acoustic propagation time as a dynamic volumetric coordinate.
- A two-stage architecture separating coherent Bragg selection from wide-angle viewer-facing emission.

## Not yet established

- Strong visible-light backreflection at moderate acoustic frequency through high-order/integer-multiple operation.
- Million-period coherent interaction in a macroscopic driven glass block.
- Wide-angle naked-eye viewing from the Bragg interaction alone.
- SF57, SF6, or any other specific glass as the optimum prototype material.
- A conventional DLP system meeting the required arbitrary full-pattern update rate for fine axial resolution.
- A conventional PCB EMAT as a viable final high-frequency transducer.

---

# 15. Highest-Priority Open Research Questions

## 15.1 Can higher-order acoustic Bragg coupling materially reduce the required acoustic frequency?

This is the highest-priority unresolved physics question.

Determine whether a realistic longitudinal acoustic waveform in a transparent solid can generate a sufficiently strong spatial Fourier harmonic to couple visible light using a much lower fundamental acoustic frequency.

Required outputs include:

- harmonic amplitude versus order,
- optical coupling coefficient versus order,
- required strain/\(\Delta n\),
- achievable reflectivity versus interaction length,
- sensitivity to waveform distortion and acoustic loss.

Until this is answered, the architecture remains split between moderate-frequency acoustics and direct first-order visible backreflection requiring multi-GHz to tens-of-GHz acoustic frequency.

---

## 15.2 What acoustic \(\Delta n\) is realistically achievable in candidate materials?

Obtain reliable material data for

\[
p_{ij},\quad
\rho,\quad
v_a,\quad
M_2,\quad
\alpha_a(f),\quad
n(\lambda),
\]

then derive realistic strain, index modulation, and coupling coefficient rather than relying on arbitrary \(\Delta n\) inputs.

---

## 15.3 What coherent interaction length is physically sustainable?

Determine the practical limits set by:

- acoustic attenuation,
- acoustic dispersion,
- phase noise,
- boundary reflections,
- thermal gradients,
- material nonuniformity,
- optical beam geometry.

This question determines whether very large period counts are actually useful.

---

## 15.4 What angular radiance distribution does the display actually require?

Define whether the target product is:

- single-user directional,
- tracked-viewer,
- limited viewing-zone,
- multi-user,
- or approximately omnidirectional.

The answer strongly affects whether narrow coherent Bragg channels are an advantage or a limitation.

---

## 15.5 Can the optical projector meet the required timing bandwidth?

Evaluate real projector/pattern-generation hardware against

\[
\boxed{f_{\text{pattern}}=\frac{v_a}{\Delta z}.}
\]

This should be evaluated before committing to high axial resolution or a moving-acoustic-plane architecture.

---

## 15.6 Which transducer technology can generate the required acoustic field?

Compare at least:

- PCB/bulk EMAT,
- conductive-film Lorentz actuation,
- integrated thin-film piezoelectric transducers,
- phased-array variants where directional control is required.

Comparison should include usable frequency, acoustic mode, aperture, strain amplitude, bandwidth, efficiency, heating, and manufacturability.

---

# 16. Research Direction

The archive does not invalidate the volumetric-display concept. It narrows the problem to a more rigorous set of conditions.

The strongest supported idea is:

\[
\boxed{
\text{dynamic acoustic fields can create programmable coherent optical structures in a solid medium.}
}
\]

The hardest current problem is:

\[
\boxed{
\text{supplying enough acoustic spatial momentum for the desired visible-light geometry.}
}
\]

Large period count addresses weak coupling through

\[
\kappa L,
\]

but does not solve momentum mismatch

\[
\Delta k.
\]

Even after strong coherent coupling is achieved, the project must still solve:

\[
\boxed{
\text{viewing-angle distribution}
+
\text{acoustic coherence}
+
\text{transducer bandwidth}
+
\text{projector timing}.
}
\]

The next physics investigation should focus on the higher-order acoustic-Bragg question before assuming that the architecture can remain in the tens-to-hundreds-of-MHz acoustic regime.

---

# 17. First-Pass Open Research Investigation Update

This section records findings from the first focused investigation performed after consolidation of the research archive. It is intended to preserve the earlier research trail while updating the status of several previously unresolved questions.

## 17.1 Higher-order Bragg coupling is real but is strongly constrained for weak sinusoidal modulation

The earlier discussion in Section 5 correctly identified that a purely sinusoidal refractive-index grating contains only its fundamental spatial Fourier component explicitly. However, a Fourier-spectrum-only interpretation is incomplete.

A sinusoidal periodic medium can exhibit higher-order Bragg resonances through sequential coupling among intermediate spatial harmonics even when the index profile does not contain an explicit Fourier component at the final momentum-transfer wavevector. Extended coupled-wave and Floquet treatments show that, for a weak singly periodic dielectric perturbation with normalized magnitude \(\eta\), the effective coupling coefficient for Bragg order \(N\) decreases rapidly with perturbation strength and scales schematically as

\[
\boxed{
\chi_N\propto\eta^N
}
\]

with order-dependent numerical factors.

For weak photoelastic modulation,

\[
\eta\sim\frac{\Delta\epsilon}{\epsilon}
\approx\frac{2\Delta n}{n}.
\]

Because \(|\Delta n|\ll n\) in the regime presently contemplated, sequential high-order coupling becomes rapidly weaker with increasing order.

### Updated status of the integer-multiple hypothesis

**Supported with qualification:** higher-order Bragg interaction is physically real and does not strictly require an explicit high-order Fourier harmonic in the grating profile.

**Strongly constrained:** using very high Bragg order as the principal mechanism for reducing the fundamental acoustic frequency appears unfavorable for a weak sinusoidal photoelastic grating because the effective coupling decreases rapidly with order.

A different mechanism is possible if the acoustic waveform itself becomes nonsinusoidal and contains a real spatial harmonic at the required wavevector. In that case the harmonic can provide direct coupling. However, if the fundamental acoustic frequency is \(f_1\) and the required component is the \(N\)-th harmonic,

\[
f_N=Nf_1.
\]

The high-order spatial harmonic must therefore still physically exist at approximately the frequency and wavevector demanded by optical momentum conservation. Lowering the electrical or acoustic fundamental does not by itself eliminate the need to generate and sustain the high-\(K\) component.

### Architecture implication

The discrete odd-quarter-wave multilayer analogy should not be treated as a straightforward route around the visible-light acoustic momentum requirement.

A more useful follow-up question is whether nonlinear or engineered acoustic structures can generate the required high-spatial-frequency component locally with useful amplitude, efficiency, and thermal performance.

### Simulator implication

The proposed higher-order solver should distinguish between:

1. **direct harmonic coupling**, where the acoustic/index waveform explicitly contains the spatial Fourier component that supplies the required optical momentum; and
2. **sequential higher-order coupling**, where multiple coupling steps produce an \(N\)-th-order Bragg resonance.

A Fourier-spectrum diagnostic remains useful for the first case, but a Floquet, extended coupled-wave, or rigorous coupled-wave model is required to represent the second case reliably.

---

## 17.2 Acoustic intensity can be linked directly to strain and refractive-index modulation

For a longitudinal traveling plane wave in the linear-elastic regime, the time-averaged acoustic intensity can be written approximately as

\[
\boxed{
I_a=\frac12\rho v_a^3S^2
}
\]

where:

- \(I_a\) is acoustic intensity in W/m\(^2\),
- \(\rho\) is material density in kg/m\(^3\),
- \(v_a\) is longitudinal acoustic phase velocity in m/s,
- \(S\) is strain amplitude.

Therefore,

\[
\boxed{
S=\sqrt{\frac{2I_a}{\rho v_a^3}}.
}
\]

Combining this with the scalar photoelastic approximation

\[
\Delta n\approx-\frac12n^3p_{\text{eff}}S
\]

gives

\[
\boxed{
|\Delta n|
\approx
\frac12 n^3|p_{\text{eff}}|
\sqrt{\frac{2I_a}{\rho v_a^3}}.
}
\]

This relationship provides a direct bridge between an acoustic power-density model and the optical \(\Delta n\) used by the grating solver.

### Important assumptions

This equation assumes:

- a longitudinal plane wave,
- linear elasticity,
- a single acoustic phase velocity,
- a scalar effective photoelastic coefficient,
- negligible attenuation across the local calculation region,
- and no nonlinear acoustic or thermal limitation.

It should therefore be treated as a useful first-order engineering model rather than a universal material law.

### Simulator implication

The acoustic/material solver should eventually accept acoustic intensity directly or derive it from launched acoustic power and effective acoustic aperture:

\[
\boxed{
I_a\approx\frac{P_a}{A_a}.
}
\]

Candidate material and device inputs should therefore include

\[
P_a,\quad
A_a,\quad
\rho,\quad
v_a,\quad
p_{ij},\quad
n,\quad
\alpha_a(f),
\]

plus transducer efficiency and geometry as the model matures.

---

## 17.3 Acoustic attenuation limits the useful coherent interaction length

Large physical grating length is useful only while the acoustic modulation remains sufficiently strong and phase coherent.

If the acoustic amplitude decays approximately as

\[
\boxed{
A(z)=A_0e^{-\alpha_a z},
}
\]

and optical coupling is proportional to the local index modulation, then a corresponding position-dependent coupling coefficient can be written as

\[
\boxed{
\kappa(z)=\kappa_0e^{-\alpha_a z}.
}
\]

The accumulated coupling strength is then

\[
\boxed{
\int_0^L\kappa(z)\,dz
=
\frac{\kappa_0}{\alpha_a}
\left(1-e^{-\alpha_aL}\right).
}
\]

For

\[
L\gg\frac{1}{\alpha_a},
\]

the accumulated coupling approaches

\[
\boxed{
\frac{\kappa_0}{\alpha_a}
}
\]

rather than continuing to grow as \(\kappa_0L\).

This establishes a more useful design distinction:

\[
\boxed{
L_{\text{physical}}\neq L_{\text{effective}}.
}
\]

The effective interaction length may be limited by acoustic attenuation, phase coherence, optical beam geometry, finite aperture, boundary effects, or other nonidealities.

### Current evidence and confidence

Hypersonic attenuation measurements in ordinary glasses indicate that acoustic lifetimes can become short in the multi-GHz regime. Representative silica Brillouin linewidths imply acoustic propagation lengths that can be much shorter than the millimeter-to-centimeter interaction lengths suggested by weak-grating optical calculations.

The exact result is strongly dependent on material, acoustic frequency, temperature, mode, and geometry. No universal numerical coherence length should yet be adopted for the project.

### Architecture implication

The concept of obtaining arbitrarily strong coupling merely by increasing the number of periods is not physically valid once attenuation or phase decoherence makes additional periods ineffective.

This elevates distributed acoustic generation, standing-wave/resonant architectures, lower-loss crystalline media, and other methods of maintaining local acoustic amplitude to important follow-up research topics.

### Simulator implication

Future coupled-mode calculations should replace a purely physical interaction length with an attenuation- and coherence-aware coupling integral. Useful future quantities include

\[
L_{\text{att}},\quad
L_{\text{coh}},\quad
L_{\text{eff}},\quad
\int\kappa(z)\,dz.
\]

---

## 17.4 Complete backreflection is the most demanding optical momentum-transfer geometry

The previous first-order backreflection result can be generalized to arbitrary angular deflection.

For elastic optical magnitudes \(|\mathbf k_{\text{in}}|\approx|\mathbf k_{\text{out}}|=k\), and an angle \(\Theta\) between the incident and output optical directions, the required grating momentum magnitude is

\[
\boxed{
q=|\mathbf k_{\text{out}}-\mathbf k_{\text{in}}|
=2k\sin\frac{\Theta}{2}.
}
\]

Using

\[
k=\frac{2\pi n}{\lambda_0}
\]

and

\[
q=\frac{2\pi f_a}{v_a},
\]

gives the approximate acoustic frequency requirement

\[
\boxed{
f_a(\Theta)=
\frac{2nv_a}{\lambda_0}
\sin\frac{\Theta}{2}.
}
\]

The familiar direct-backreflection result is recovered when

\[
\Theta=180^\circ,
\]

for which

\[
\boxed{
f_{\text{back}}=\frac{2nv_a}{\lambda_0}.}
\]

For smaller optical direction changes, the required acoustic frequency decreases substantially.

### Architecture implication

The question

\[
\boxed{
\text{Does voxel formation actually require direct }180^\circ\text{ optical reversal?}
}
\]

should now be treated as a highest-priority architecture question.

A system that uses moderate-angle coherent coupling only for spatial selection or routing, followed by a separate viewer-facing emission or scattering process, may reduce the required acoustic wavevector much more effectively than attempting extremely high-order Bragg backreflection.

This strengthens the motivation for the two-stage architecture already identified in Section 6.3:

\[
\text{coherent selection}
\rightarrow
\text{localized optical energy}
\rightarrow
\text{viewer-facing emission}.
\]

---

## 17.5 Updated first-pass research priorities

The first focused investigation changes the relative priority of the remaining research questions.

### P0 — Fundamental feasibility

1. **Determine whether direct optical backreflection is actually required by the display architecture.** Compare acoustic momentum and frequency requirements across practical optical deflection angles.
2. **Determine realistic frequency-dependent acoustic attenuation and coherence length in candidate transparent materials.** This controls whether weak coupling can be compensated by interaction length.
3. **Determine realistic \(\Delta n\) from achievable acoustic intensity, aperture, duty cycle, and transducer efficiency.**

### P1 — Device architecture

4. **Compare candidate materials using both acousto-optic coupling and acoustic loss.** The conventional \(M_2\) figure of merit alone is insufficient if the usable interaction length is attenuation limited.
5. **Investigate distributed, resonant, and standing-wave acoustic generation.** These architectures may reduce dependence on long single-pass hypersonic propagation.
6. **Establish experimentally demonstrated transducer bounds across the required frequency range.** Relevant quantities include mode, aperture, strain, efficiency, bandwidth, and thermal load.

### P2 — Display implementation

7. Define the required viewing-zone radiance distribution.
8. Evaluate projector/pattern-generation timing after the acoustic spatial architecture is better constrained.

---

## 17.6 Updated Simulation Tool roadmap implications

The existing TMM solver remains appropriate for explicit layered optical structures, but the research now suggests the following additions or refinements when physics development resumes:

### Directly implementable relations

\[
\boxed{
f_{\text{back}}=\frac{2nv_a}{\lambda_0}}
\]

\[
\boxed{
f_a(\Theta)=
\frac{2nv_a}{\lambda_0}
\sin\frac{\Theta}{2}}
\]

\[
\boxed{
S=\sqrt{\frac{2I_a}{\rho v_a^3}}}
\]

\[
\boxed{
|\Delta n|
\approx
\frac12n^3|p_{\text{eff}}|
\sqrt{\frac{2I_a}{\rho v_a^3}}}
\]

and, for an exponentially attenuated grating,

\[
\boxed{
\kappa_{\text{integrated}}
=
\frac{\kappa_0}{\alpha_a}
\left(1-e^{-\alpha_aL}\right).
}
\]

### Material-catalog properties

Candidate properties should include

\[
\rho,\quad
v_L,\quad
p_{ij},\quad
n(\lambda,T),\quad
\alpha_a(f,T).
\]

### Useful future parameter sweeps and heatmaps

\[
I_a\times L_{\text{eff}}\rightarrow R,
\]

\[
f_a\times\alpha_a\rightarrow L_{\text{att}},
\]

\[
\Theta\times\lambda\rightarrow f_a,
\]

and

\[
\Delta n\times\alpha_a\rightarrow R_{\max}.
\]

### Higher-order solver refinement

A Fourier-spectrum model alone should not be treated as a complete higher-order Bragg solver. Direct coupling from explicit acoustic harmonics can be evaluated through Fourier content, while sequential higher-order Bragg coupling requires a multiwave Floquet, extended coupled-wave, or rigorous coupled-wave treatment.

---

## 17.7 Current integrated feasibility posture

The broad physical concept remains supported:

\[
\boxed{
\text{acoustic field}
\rightarrow
\Delta n(\mathbf r,t)
\rightarrow
\text{programmable coherent optical coupling}
}
\]

The first focused investigation does not invalidate that concept.

It does, however, weaken a more specific architecture assumption:

\[
\boxed{
\text{weak photoelastic modulation}
+
\text{very large period count}
+
\text{high-order Bragg operation}
}
\]

should not currently be assumed to provide strong visible backreflection at moderate acoustic frequency.

The dominant coupled feasibility chain is now:

\[
\boxed{
\begin{array}{c}
\text{desired optical direction change}\\
\downarrow\\
\text{required acoustic momentum }K\\
\downarrow\\
\text{required acoustic frequency}\\
\downarrow\\
\text{frequency-dependent attenuation and available strain}\\
\downarrow\\
L_{\text{effective}}\text{ and }\Delta n\\
\downarrow\\
\text{achievable optical coupling}
\end{array}
}
\]

The next research batch should therefore prioritize optical deflection geometry, frequency-dependent material attenuation, and practical hypersonic acoustic generation before optimizing projector timing or wide-angle viewing details.
