import { describe, expect, it } from 'vitest';
import { DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS } from '../structures/hybridBraggGrating';
import {
  calculateEffectiveOpticalResponseWidth,
  calculateMovingResponseLocalization,
  calculateOpticalContrast,
  calculateMovingPulseMetrics,
  solveFixedLaserPulseResponse,
  solveHybridStaticSpectrum,
  solvePerturbationFieldComparison,
  solveMovingResponseRegimeMapAsync,
  solveMovingPulseExperiment,
  solveMovingPulseExperimentAsync,
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

  it('scans phase for periodic prescribed perturbation fields', () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      strainShape: 'traveling-sinusoid' as const,
      peakStrain: 250e-6,
      pulseSweepPointCount: 5,
      segmentCount: 40,
    };
    const result = solveMovingPulseExperiment(design);

    expect(result.points).toHaveLength(5);
    expect(result.points[0].strainCenterMm).toBeCloseTo(0);
    expect(result.positionStepMm).toBeCloseTo((2 * Math.PI) / 5);
    expect(result.points[result.points.length - 1].strainCenterMm).toBeLessThan(2 * Math.PI);
    expect(result.points[result.points.length - 1].strainCenterMm).toBeCloseTo((2 * Math.PI * 4) / 5);
  });

  it('compares prescribed perturbation families on one optical setup', () => {
    const result = solvePerturbationFieldComparison(
      {
        ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
        peakStrain: 300e-6,
        pulseSweepStartMm: 0,
        pulseSweepEndMm: 2,
        pulseSweepPointCount: 5,
        segmentCount: 40,
      },
      ['rectangular', 'smooth-top-hat', 'traveling-sinusoid', 'multi-tone'],
    );

    expect(result.families.map((family) => family.strainShape)).toEqual(['rectangular', 'smooth-top-hat', 'traveling-sinusoid', 'multi-tone']);
    expect(result.families.find((family) => family.strainShape === 'traveling-sinusoid')?.parameterKind).toBe('phase');
    expect(result.families.every((family) => family.peakReflectance >= 0 && family.peakReflectance <= 1)).toBe(true);
  });

  it('reports progress while solving the moving-pulse experiment asynchronously', async () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      pulseSweepStartMm: 0,
      pulseSweepEndMm: 2,
      pulseSweepPointCount: 5,
    };
    const progress: Array<{ completed: number; total: number }> = [];

    const result = await solveMovingPulseExperimentAsync(design, {
      onProgress: (nextProgress) => progress.push(nextProgress),
    });

    expect(result.points).toHaveLength(5);
    expect(progress[0]).toEqual({ completed: 0, total: 5 });
    expect(progress[progress.length - 1]).toEqual({ completed: 5, total: 5 });
  });

  it('cancels stale asynchronous moving-pulse solves', async () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      pulseSweepStartMm: 0,
      pulseSweepEndMm: 2,
      pulseSweepPointCount: 5,
    };
    const controller = new AbortController();

    const solvePromise = solveMovingPulseExperimentAsync(design, {
      signal: controller.signal,
      onProgress: (progress) => {
        if (progress.completed === 1) controller.abort();
      },
    });

    await expect(solvePromise).rejects.toMatchObject({ name: 'AbortError' });
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

  it('classifies localized enhancement shape from explicit peak metrics', () => {
    const singleDominant = calculateMovingResponseLocalization(
      [makePoint(0, 0), makePoint(1, 0.02), makePoint(2, 0.1), makePoint(3, 0.02), makePoint(4, 0), makePoint(5, 0.015), makePoint(6, 0)],
      0,
    );
    const multiPeak = calculateMovingResponseLocalization(
      [makePoint(0, 0), makePoint(1, 0.1), makePoint(2, 0), makePoint(3, 0.08), makePoint(4, 0)],
      0,
    );
    const noEnhancement = calculateMovingResponseLocalization(
      [makePoint(0, 0.2), makePoint(1, 0.2), makePoint(2, 0.2)],
      0.2,
    );

    expect(singleDominant.responseClassification).toBe('single-dominant');
    expect(singleDominant.secondaryPeakRatio).toBeCloseTo(0.15);
    expect(singleDominant.oscillationCollapseCandidate).toBe(true);
    expect(multiPeak.responseClassification).toBe('multi-peak');
    expect(multiPeak.secondaryPeakRatio).toBeCloseTo(0.8);
    expect(noEnhancement.responseClassification).toBe('no-enhancement');
  });

  it('integrates localized enhancement on the same area basis as total enhancement', () => {
    const localization = calculateMovingResponseLocalization(
      [makePoint(0, 0), makePoint(0.25, 1), makePoint(0.5, 0), makePoint(0.75, 0)],
      0,
    );

    expect(localization.localizedFraction).toBeCloseTo(0.75);
  });

  it('marks boundary-only peaks separately from interior localization', () => {
    const boundaryPoint = {
      ...makePoint(0, 0.1),
      nominalSupportStartMm: -0.5,
      clippedSupportStartMm: 0,
      nominalOverlapMm: 0.5,
    };
    const localization = calculateMovingResponseLocalization(
      [boundaryPoint, makePoint(1, 0.01), makePoint(2, 0)],
      0,
    );

    expect(localization.boundaryDominated).toBe(true);
    expect(localization.responseClassification).toBe('broad');
  });

  it('builds deterministic moving-response regime map cells with normalized widths', async () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 2,
      peakStrain: 250e-6,
      pulseSweepStartMm: 0,
      pulseSweepEndMm: 2,
      pulseSweepPointCount: 5,
      segmentCount: 60,
    };
    const result = await solveMovingResponseRegimeMapAsync(design, {
      indexModulations: [1e-4],
      strainShapes: ['rectangular'],
      strainWidthRatiosToCouplingLength: [0.25, 0.5],
      detuningValuesNm: [-0.05, 0, 0.05],
    });

    expect(result.detuningValuesNm).toEqual([-0.05, 0, 0.05]);
    expect(result.slices).toHaveLength(1);
    expect(result.slices[0].cells).toHaveLength(2);
    expect(result.slices[0].cells[0]).toHaveLength(3);
    expect(result.slices[0].cells[0][0].strainWidthToCouplingLength).toBeCloseTo(0.25);
    expect(result.summary.classificationCounts['single-dominant'] + result.summary.classificationCounts['multi-peak'] + result.summary.classificationCounts.broad + result.summary.classificationCounts.weak + result.summary.classificationCounts['no-enhancement']).toBe(6);
  });

  it('derives default detuning samples separately for each coupling slice', async () => {
    const design = {
      ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
      lengthMm: 1,
      peakStrain: 0,
      pulseSweepStartMm: 0,
      pulseSweepEndMm: 1,
      pulseSweepPointCount: 3,
      segmentCount: 20,
    };
    const result = await solveMovingResponseRegimeMapAsync(design, {
      indexModulations: [1e-5, 1e-3],
      strainShapes: ['gaussian'],
      strainWidthRatiosToCouplingLength: [0.25],
    });

    expect(result.slices).toHaveLength(2);
    expect(result.slices[0].detuningValuesNm).not.toEqual(result.slices[1].detuningValuesNm);
    expect(Math.max(...result.slices[1].detuningValuesNm)).toBeGreaterThan(Math.max(...result.slices[0].detuningValuesNm));
    expect(result.slices[0].cells[0]).toHaveLength(result.slices[0].detuningValuesNm.length);
    expect(result.slices[1].cells[0]).toHaveLength(result.slices[1].detuningValuesNm.length);
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
