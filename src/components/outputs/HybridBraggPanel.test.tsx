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
    expect(markup).toContain('Bias strain');
    expect(markup).toContain('Active actuator');
    expect(markup).toContain('Adjacent command');
  });
});
