import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssumptionsPanel } from './AssumptionsPanel';

describe('AssumptionsPanel', () => {
  it('renders the updated solver assumptions copy', () => {
    const markup = renderToStaticMarkup(<AssumptionsPanel />);

    expect(markup).toContain('Default catalog materials use nondispersive constants');
    expect(markup).toContain('Complex refractive indices and absorption are supported when provided');
    expect(markup).toContain('Air incident and exit media');
    expect(markup).toContain('Coherent planar multilayer stack');
  });
});
