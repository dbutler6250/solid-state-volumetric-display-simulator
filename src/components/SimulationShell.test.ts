import { describe, expect, it } from 'vitest';
import { OUTPUT_TABS } from './SimulationShell';
import { shouldRenderOutputPanelContent } from './outputPanelLifecycle';

describe('simulation shell output tabs', () => {
  it('defines the research workflow tabs without a standalone heatmap tab', () => {
    expect(OUTPUT_TABS).toEqual([
      'overview',
      'spectrum',
      'moving-region',
      'parameter-sweep',
      'mechanics',
      'stack-definition',
      'reflectance-volume',
      'stl-slicer',
    ]);
  });

  it('mounts only the active output panel content', () => {
    for (const activeTab of OUTPUT_TABS) {
      const mountedTabs = OUTPUT_TABS.filter((tab) => shouldRenderOutputPanelContent(tab, activeTab));

      expect(mountedTabs).toEqual([activeTab]);
    }
  });
});
