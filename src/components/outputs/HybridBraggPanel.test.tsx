import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MAX_HYBRID_BRAGG_SECTIONS } from '../../simulation/simulationLimits';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../../simulation/structures/hybridBraggGrating';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../../simulation/structures/quarterWaveStack';
import { HybridBraggPanel } from './HybridBraggPanel';

describe('HybridBraggPanel', () => {
  it('caps segmented section input and hides explicit phase sequence from interactive controls', () => {
    const markup = renderToStaticMarkup(
      <HybridBraggPanel
        inputs={{
          ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
          thicknessMode: 'hybrid',
          hybridBraggDesign: {
            ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
            permanentGratingMode: 'segmented',
          },
        }}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain(`max="${MAX_HYBRID_BRAGG_SECTIONS}"`);
    expect(markup).toContain('Seeded pseudo-random');
    expect(markup).not.toContain('Explicit sequence');
  });

  it('exposes actuator controls for prescribed piezo array fields', () => {
    const markup = renderToStaticMarkup(
      <HybridBraggPanel
        inputs={{
          ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
          thicknessMode: 'hybrid',
          hybridBraggDesign: {
            ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
            strainShape: 'piezo-array',
          },
        }}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Prescribed piezo array');
    expect(markup).toContain('Trough center');
    expect(markup).toContain('Background strain');
    expect(markup).toContain('Active actuator');
    expect(markup).toContain('Adjacent command');
    expect(markup).toContain('Array polarity');
    expect(markup).toContain('Biased trough');
  });

  it('prioritizes detuning and progressive disclosure for the current fixed-grating workflow', () => {
    const markup = renderToStaticMarkup(
      <HybridBraggPanel
        inputs={{
          ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
          thicknessMode: 'hybrid',
          hybridBraggDesign: {
            ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
            fixedLaserWavelengthNm: 600.11,
            strainBias: 0.0015,
            peakStrain: -0.0015,
            strainShape: 'piezo-trough',
          },
        }}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Preset: Current Research Baseline');
    expect(markup).toContain('Operating point summary');
    expect(markup).toContain('Laser detuning (nm)');
    expect(markup).toContain('Core Experiment');
    expect(markup).toContain('Advanced Solver / Strain Model');
  });
});
