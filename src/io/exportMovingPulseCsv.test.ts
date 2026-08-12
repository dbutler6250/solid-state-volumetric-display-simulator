import { describe, expect, it } from 'vitest';
import { DEFAULT_QUARTER_WAVE_STACK_INPUTS } from '../simulation/structures/quarterWaveStack';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../simulation/structures/hybridBraggGrating';
import { solveMovingPulseExperiment } from '../simulation/experiments/hybridBraggExperiments';
import { exportMovingPulseCsv } from './exportMovingPulseCsv';

describe('exportMovingPulseCsv', () => {
  it('exports pulse position response rows with fixed-laser metadata', () => {
    const inputs = {
      ...DEFAULT_QUARTER_WAVE_STACK_INPUTS,
      thicknessMode: 'hybrid' as const,
      hybridBraggDesign: {
        ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
        pulseSweepStartMm: 0,
        pulseSweepEndMm: 1,
        pulseSweepPointCount: 3,
      },
    };
    const result = solveMovingPulseExperiment(inputs.hybridBraggDesign);
    const csv = exportMovingPulseCsv(inputs, result);

    expect(csv).toContain('# schema: ssvds-moving-pulse-csv-v1');
    expect(csv).toContain('# laserWavelengthNm: 600');
    expect(csv).toContain('# staticReflectance:');
    expect(csv).toContain('perturbation_parameter,reflectance,enhancement,nominal_overlap_mm,clipped_support_start_mm,clipped_support_end_mm');
    expect(csv.trim().split('\n').slice(-3).map((line) => line.split(',')[0])).toEqual(['0', '0.5', '1']);
  });
});

