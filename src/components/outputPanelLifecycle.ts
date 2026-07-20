import type { OUTPUT_TABS } from './SimulationShell';

type OutputTab = (typeof OUTPUT_TABS)[number];

/** Keeps inactive output tab panels lightweight while preserving the ARIA tabpanel shell. */
export function shouldRenderOutputPanelContent(tab: OutputTab, activeTab: OutputTab): boolean {
  return tab === activeTab;
}
