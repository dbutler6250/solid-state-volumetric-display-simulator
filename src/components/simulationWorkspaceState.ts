import type { QuarterWaveStackInputs, ThicknessMode } from '../types/simulation';
import { DEFAULT_ACOUSTIC_DESIGN_INPUTS } from '../simulation/structures/acoustoOpticGrating';
import { getRefractiveIndexReal } from '../simulation/materials/material';

export type SimulationWorkspaceState = {
  activeMode: ThicknessMode;
  drafts: Record<ThicknessMode, QuarterWaveStackInputs>;
};

export type SimulationWorkspaceAction =
  | { type: 'update-active'; inputs: QuarterWaveStackInputs }
  | { type: 'switch-mode'; mode: ThicknessMode }
  | { type: 'import'; inputs: QuarterWaveStackInputs };

const ANALYSIS_FIELDS = [
  'incidentAngleDegrees',
  'polarization',
  'wavelengthStartNm',
  'wavelengthEndNm',
  'wavelengthPointCount',
] as const;

/** Creates independent optical, manual, and acoustic drafts with shared analysis settings. */
export function createSimulationWorkspaceState(
  inputs: QuarterWaveStackInputs,
): SimulationWorkspaceState {
  const derivedHigh =
    inputs.designWavelengthNm /
    (4 * getRefractiveIndexReal(inputs.highIndexMaterial.refractiveIndex));
  const derivedLow =
    inputs.designWavelengthNm /
    (4 * getRefractiveIndexReal(inputs.lowIndexMaterial.refractiveIndex));
  return {
    activeMode: 'derived',
    drafts: {
      derived: { ...inputs, thicknessMode: 'derived' },
      manual: {
        ...inputs,
        thicknessMode: 'manual',
        highIndexThicknessNm: inputs.highIndexThicknessNm ?? derivedHigh,
        lowIndexThicknessNm: inputs.lowIndexThicknessNm ?? derivedLow,
      },
      acoustic: {
        ...inputs,
        thicknessMode: 'acoustic',
        acousticDesign: inputs.acousticDesign ?? DEFAULT_ACOUSTIC_DESIGN_INPUTS,
      },
    },
  };
}

/** Applies atomic mode transitions while keeping editable structure drafts independent. */
export function simulationWorkspaceReducer(
  state: SimulationWorkspaceState,
  action: SimulationWorkspaceAction,
): SimulationWorkspaceState {
  if (action.type === 'switch-mode') {
    return { ...state, activeMode: action.mode };
  }

  const mode = action.type === 'import' ? action.inputs.thicknessMode ?? 'derived' : state.activeMode;
  const inputs = { ...action.inputs, thicknessMode: mode };
  const drafts = { ...state.drafts, [mode]: inputs };

  for (const draftMode of Object.keys(drafts) as ThicknessMode[]) {
    if (draftMode === mode) continue;
    const draft = { ...drafts[draftMode] };
    for (const field of ANALYSIS_FIELDS) {
      Object.assign(draft, { [field]: inputs[field] });
    }
    drafts[draftMode] = draft;
  }

  return { activeMode: mode, drafts };
}

export const getActiveInputs = (state: SimulationWorkspaceState): QuarterWaveStackInputs =>
  state.drafts[state.activeMode];
