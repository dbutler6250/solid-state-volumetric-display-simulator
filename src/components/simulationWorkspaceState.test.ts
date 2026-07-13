import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import {
  createSimulationWorkspaceState,
  getActiveInputs,
  simulationWorkspaceReducer,
} from './simulationWorkspaceState';

describe('simulation workspace state', () => {
  it('preserves optical and manual drafts across an acoustic round trip', () => {
    let state = createSimulationWorkspaceState(DEFAULT_QUARTER_WAVE_STACK_INPUTS);
    state = simulationWorkspaceReducer(state, {
      type: 'update-active',
      inputs: { ...getActiveInputs(state), designWavelengthNm: 532, periodCount: 17 },
    });
    state = simulationWorkspaceReducer(state, { type: 'switch-mode', mode: 'manual' });
    state = simulationWorkspaceReducer(state, {
      type: 'update-active',
      inputs: {
        ...getActiveInputs(state),
        designWavelengthNm: 710,
        periodCount: 6,
        highIndexThicknessNm: 83,
        lowIndexThicknessNm: 121,
      },
    });
    state = simulationWorkspaceReducer(state, { type: 'switch-mode', mode: 'acoustic' });
    state = simulationWorkspaceReducer(state, {
      type: 'update-active',
      inputs: {
        ...getActiveInputs(state),
        acousticDesign: {
          ...getActiveInputs(state).acousticDesign!,
          acousticFrequencyHz: 2e9,
        },
      },
    });
    state = simulationWorkspaceReducer(state, { type: 'switch-mode', mode: 'derived' });
    expect(getActiveInputs(state)).toMatchObject({ designWavelengthNm: 532, periodCount: 17 });
    state = simulationWorkspaceReducer(state, { type: 'switch-mode', mode: 'manual' });
    expect(getActiveInputs(state)).toMatchObject({
      designWavelengthNm: 710,
      periodCount: 6,
      highIndexThicknessNm: 83,
      lowIndexThicknessNm: 121,
    });
  });
});
