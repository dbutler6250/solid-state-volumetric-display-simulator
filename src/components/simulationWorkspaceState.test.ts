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

  it('imports only the targeted structure draft while sharing analysis settings', () => {
    let state = createSimulationWorkspaceState(DEFAULT_QUARTER_WAVE_STACK_INPUTS);
    state = simulationWorkspaceReducer(state, { type: 'switch-mode', mode: 'manual' });
    state = simulationWorkspaceReducer(state, {
      type: 'update-active',
      inputs: {
        ...getActiveInputs(state),
        highIndexThicknessNm: 77,
        lowIndexThicknessNm: 123,
      },
    });
    state = simulationWorkspaceReducer(state, {
      type: 'import',
      inputs: {
        ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
        thicknessMode: 'acoustic',
        wavelengthStartNm: 1000,
        wavelengthEndNm: 2000,
        acousticDesign: {
          acousticMaterial: { id: 'imported', name: 'Imported glass', refractiveIndex: 1.6 },
          acousticVelocityMps: 5000,
          acousticFrequencyHz: 2e9,
          acousticPeriodCount: 5,
          braggOrder: 1,
          acousticIndexModulation: 0.001,
          acousticRepresentationMode: 'fast',
        },
      },
    });

    expect(state.activeMode).toBe('acoustic');
    expect(state.drafts.acoustic.acousticDesign?.acousticMaterial.id).toBe('imported');
    expect(state.drafts.manual).toMatchObject({
      highIndexThicknessNm: 77,
      lowIndexThicknessNm: 123,
      wavelengthStartNm: 1000,
      wavelengthEndNm: 2000,
    });
    expect(state.drafts.derived).toMatchObject({
      designWavelengthNm: DEFAULT_QUARTER_WAVE_STACK_INPUTS.designWavelengthNm,
      wavelengthStartNm: 1000,
      wavelengthEndNm: 2000,
    });
  });
});
