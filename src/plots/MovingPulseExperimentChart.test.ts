import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MovingPulseExperimentResult } from '../simulation/experiments/hybridBraggExperiments';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../simulation/structures/hybridBraggGrating';
import { MovingPulseExperimentChart } from './MovingPulseExperimentChart';

describe('MovingPulseExperimentChart', () => {
  it('labels periodic field response metrics as phase values', () => {
    const result = makeResult('traveling-sinusoid');
    const markup = renderToStaticMarkup(
      createElement(MovingPulseExperimentChart, {
        result,
        design: { ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS, strainShape: 'traveling-sinusoid' },
        progress: null,
      }),
    );

    expect(markup).toContain('Peak phase');
    expect(markup).toContain('Phase step');
    expect(markup).toContain('Phase std dev');
    expect(markup).not.toContain('Peak position');
    expect(markup).not.toContain('Position step');
  });
});

function makeResult(strainShape: MovingPulseExperimentResult['strainShape']): MovingPulseExperimentResult {
  return {
    laserWavelengthNm: 600,
    staticBraggWavelengthNm: 600.01,
    strainWidthMm: 1,
    strainShape,
    segmentCount: 20,
    positionStepMm: Math.PI / 4,
    points: [
      makePoint(0, 0.1),
      makePoint(Math.PI / 4, 0.2),
      makePoint(Math.PI / 2, 0.12),
    ],
    metrics: {
      staticReflectance: 0.05,
      peakReflectance: 0.2,
      peakEnhancement: 0.15,
      peakGain: 4,
      peakPositionMm: Math.PI / 4,
      minReflectance: 0.1,
      minPositionMm: 0,
      meanReflectance: 0.14,
      standardDeviationReflectance: 0.04,
      uniformity: 0.5,
      effectiveWidth: { status: 'single-peak', widthMm: 0.5, halfMaximumEnhancement: 0.075 },
      localization: {
        primaryPeak: { positionMm: Math.PI / 4, enhancement: 0.15, reflectance: 0.2 },
        secondaryPeak: null,
        peakDominance: null,
        secondaryPeakRatio: null,
        localizedFraction: 0.8,
        boundaryDominated: false,
        interiorPeakEnhancement: 0.15,
        responseClassification: 'periodic-multi-plane',
        oscillationCollapseCandidate: false,
      },
    },
  };
}

function makePoint(strainCenterMm: number, reflectance: number): MovingPulseExperimentResult['points'][number] {
  return {
    strainCenterMm,
    reflectance,
    enhancement: reflectance - 0.05,
    nominalSupportStartMm: strainCenterMm - 0.1,
    nominalSupportEndMm: strainCenterMm + 0.1,
    clippedSupportStartMm: strainCenterMm - 0.1,
    clippedSupportEndMm: strainCenterMm + 0.1,
    nominalOverlapMm: 0.2,
  };
}
