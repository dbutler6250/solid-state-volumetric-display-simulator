import { describe, expect, it } from 'vitest';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../structures/hybridBraggGrating';
import {
  calculateEffectiveOpticalResponseWidth,
  calculateOpticalContrast,
  calculateMovingPulseMetrics,
  solveFixedLaserPulseResponse,
  solveHybridStaticSpectrum,
  solveMovingPulseExperiment,
  type FixedLaserPulsePoint,
} from './hybridBraggExperiments';

describe('hybrid Bragg experiments', () => {
  it('exposes static spectra and fixed-laser pulse-position responses headlessly', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      peakStrain: 250e-6,
      fixedLaserWavelengthNm: 600,
    };
    const spectrum = solveHybridStaticSpectrum(design, [599, 600, 601]);
    const fixedLaser = solveFixedLaserPulseResponse(design, [2, 5, 8]);

    expect(spectrum).toHaveLength(3);
    expect(fixedLaser).toHaveLength(3);
    expect(fixedLaser.every((point) => point.reflectance >= 0 && point.reflectance <= 1)).toBe(true);
  });

  it('guards contrast when the off state is numerically near zero', () => {
    expect(calculateOpticalContrast(0.2, 0).contrast).toBeNull();
    expect(calculateOpticalContrast(0.2, 0.01).contrast).toBeCloseTo(20);
  });

  it('keeps a zero-strain moving response equal to the static baseline', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      peakStrain: 0,
      pulseSweepStartMm: 0,
      pulseSweepEndMm: 2,
      pulseSweepPointCount: 5,
    };
    const result = solveMovingPulseExperiment(design);

    expect(result.points).toHaveLength(5);
    result.points.forEach((point) => {
      expect(point.reflectance).toBeCloseTo(result.metrics.staticReflectance, 12);
      expect(point.enhancement).toBeCloseTo(0, 12);
    });
    expect(result.metrics.effectiveWidth.status).toBe('no-meaningful-enhancement');
  });

  it('reports clipped nominal pulse overlap at grating boundaries', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 10,
      strainWidthMm: 2,
      peakStrain: 300e-6,
    };
    const [left, center, right] = solveFixedLaserPulseResponse(design, [0.5, 5, 9.75]);

    expect(left.nominalSupportStartMm).toBeCloseTo(-0.5);
    expect(left.clippedSupportStartMm).toBe(0);
    expect(left.nominalOverlapMm).toBeCloseTo(1.5);
    expect(center.nominalOverlapMm).toBeCloseTo(2);
    expect(right.clippedSupportEndMm).toBeCloseTo(10);
    expect(right.nominalOverlapMm).toBeCloseTo(1.25);
  });

  it('preserves requested position samples for rectangular and Gaussian perturbations', () => {
    const base = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 4,
      strainWidthMm: 0.8,
      peakStrain: 500e-6,
      pulseSweepStartMm: 0.4,
      pulseSweepEndMm: 3.6,
      pulseSweepPointCount: 9,
    };

    const rectangular = solveMovingPulseExperiment({ ...base, strainShape: 'rectangular' });
    const gaussian = solveMovingPulseExperiment({ ...base, strainShape: 'gaussian' });

    expect(rectangular.points.map((point) => point.strainCenterMm)).toEqual(gaussian.points.map((point) => point.strainCenterMm));
    expect(rectangular.points[0].strainCenterMm).toBeCloseTo(0.4);
    expect(rectangular.points[rectangular.points.length - 1].strainCenterMm).toBeCloseTo(3.6);
    expect(gaussian.strainShape).toBe('gaussian');
    expect(gaussian.strainWidthMm).toBeCloseTo(0.8);
  });

  it('calculates moving-pulse metrics with guarded ratios and uniformity', () => {
    const points = [
      makePoint(0, 0.1),
      makePoint(1, 0.4),
      makePoint(2, 0.2),
    ];
    const metrics = calculateMovingPulseMetrics(points, 0.05);
    const zeroBaseline = calculateMovingPulseMetrics(points, 0);

    expect(metrics.staticReflectance).toBe(0.05);
    expect(metrics.peakReflectance).toBe(0.4);
    expect(metrics.peakPositionMm).toBe(1);
    expect(metrics.peakEnhancement).toBeCloseTo(0.35);
    expect(metrics.peakGain).toBeCloseTo(8);
    expect(metrics.minReflectance).toBe(0.1);
    expect(metrics.uniformity).toBeCloseTo(0.25);
    expect(zeroBaseline.peakGain).toBeNull();
  });

  it('classifies effective optical response width only for a dominant peak', () => {
    const singlePeak = calculateEffectiveOpticalResponseWidth(
      [makePoint(0, 0), makePoint(1, 1), makePoint(2, 0)],
      0,
    );
    const multiPeak = calculateEffectiveOpticalResponseWidth(
      [makePoint(0, 0), makePoint(1, 1), makePoint(2, 0.1), makePoint(3, 0.9), makePoint(4, 0)],
      0,
    );

    expect(singlePeak.status).toBe('single-peak');
    expect(singlePeak.widthMm).toBeCloseTo(1);
    expect(multiPeak.status).toBe('multiple-comparable-peaks');
    expect(multiPeak.widthMm).toBeNull();
  });
});

function makePoint(strainCenterMm: number, reflectance: number): FixedLaserPulsePoint {
  return {
    strainCenterMm,
    reflectance,
    enhancement: reflectance,
    nominalSupportStartMm: strainCenterMm - 0.5,
    nominalSupportEndMm: strainCenterMm + 0.5,
    clippedSupportStartMm: Math.max(0, strainCenterMm - 0.5),
    clippedSupportEndMm: strainCenterMm + 0.5,
    nominalOverlapMm: 1,
  };
}
