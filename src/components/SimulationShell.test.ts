import { describe, expect, it } from 'vitest';
import { OUTPUT_TABS } from './SimulationShell';

describe('simulation shell output tabs', () => {
  it('places heatmap immediately after parameter sweep', () => {
    expect(OUTPUT_TABS).toEqual([
      'spectrum',
      'parameter-sweep',
      'heatmap',
      'stack-definition',
      'reflectance-volume',
      'stl-slicer',
    ]);
  });
});
