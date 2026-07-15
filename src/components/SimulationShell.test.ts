import { describe, expect, it } from 'vitest';
import { OUTPUT_TABS } from './SimulationShell';

describe('simulation shell output tabs', () => {
  it('omits the standalone heatmap tab', () => {
    expect(OUTPUT_TABS).toEqual([
      'spectrum',
      'parameter-sweep',
      'stack-definition',
      'reflectance-volume',
      'stl-slicer',
    ]);
  });
});
