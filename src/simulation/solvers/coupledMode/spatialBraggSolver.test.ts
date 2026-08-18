import { describe, expect, it } from 'vitest';
import type { LayerStack } from '../../layers/stack';
import {
  DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  createHybridBraggModel,
  getCouplingCoefficientPerM,
  getHybridDesignBraggWavelengthNm,
  sampleHybridBraggModel,
} from '../../structures/hybridBraggGrating';
import { sampleStrainField } from '../../perturbations/strainField';
import { applyMaterialStrainResponse } from '../../responses/strainOpticResponse';
import { solveLayerStack } from '../transferMatrix';
import {
  getUniformReflectance,
  getUniformOnResonanceReflectance,
  solveHybridBraggCoupledModePoint,
  solveHybridBraggCoupledModeSpectrum,
} from './spatialBraggSolver';

const baseDesign = {
  ...DEFAULT_HYBRID_BRAGG_DESIGN_INPUTS,
  lengthMm: 2,
  averageIndex: 1.45,
  indexModulation: 2e-4,
  gratingPeriodNm: 206.8965517,
  peakStrain: 0,
  strainCenterMm: 1,
  strainWidthMm: 0.4,
  segmentCount: 160,
};

describe('spatial Bragg coupled-mode solver', () => {
  it('matches the known uniform on-resonance reflectance limit across kappa-L values', () => {
    const model = createHybridBraggModel(baseDesign);
    const wavelengthNm = getHybridDesignBraggWavelengthNm(baseDesign);
    const targetKappaL = [0.01, 0.1, 0.5, 1, 2, 3.5];

    targetKappaL.forEach((kappaL) => {
      const indexModulation = (kappaL * wavelengthNm * 1e-9) / (Math.PI * model.grating.lengthM);
      const design = { ...baseDesign, indexModulation };
      const kappa = getCouplingCoefficientPerM(indexModulation, wavelengthNm * 1e-9);
      const result = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), wavelengthNm);
      const analytic = getUniformOnResonanceReflectance(kappa, model.grating.lengthM);

      expect(result.reflectance).toBeCloseTo(analytic, 8);
      if (kappaL <= 0.1) {
        expect(result.reflectance).toBeCloseTo(kappaL ** 2, 2);
      }
      if (kappaL > 3) {
        expect(result.reflectance).toBeGreaterThan(0.99);
      }
    });
  });

  it('matches the detuned uniform-grating closed-form spectrum symmetrically', () => {
    const model = createHybridBraggModel(baseDesign);
    const braggWavelengthNm = getHybridDesignBraggWavelengthNm(baseDesign);
    const kappa = getCouplingCoefficientPerM(baseDesign.indexModulation, braggWavelengthNm * 1e-9);
    const detuningRatios = [-2, -1, -0.5, 0, 0.5, 1, 2];

    detuningRatios.forEach((ratio) => {
      const delta = ratio * kappa;
      const wavelengthNm = wavelengthForDetuningNm(model.grating.averageIndex, model.grating.periodM, delta);
      const result = solveHybridBraggCoupledModePoint(model, wavelengthNm);
      const analytic = getUniformReflectance(kappa, delta, model.grating.lengthM);

      expect(result.reflectance).toBeCloseTo(analytic, 7);
    });

    const positive = solveHybridBraggCoupledModePoint(
      model,
      wavelengthForDetuningNm(model.grating.averageIndex, model.grating.periodM, 0.75 * kappa),
    );
    const negative = solveHybridBraggCoupledModePoint(
      model,
      wavelengthForDetuningNm(model.grating.averageIndex, model.grating.periodM, -0.75 * kappa),
    );

    expect(positive.reflectance).toBeCloseTo(negative.reflectance, 10);
  });

  it('keeps zero perturbation equivalent to the permanent grating spectrum', () => {
    const zero = solveHybridBraggCoupledModePoint(createHybridBraggModel(baseDesign), 600);
    const explicitZero = solveHybridBraggCoupledModePoint(
      createHybridBraggModel({ ...baseDesign, peakStrain: 0, strainShape: 'gaussian' }),
      600,
    );

    expect(explicitZero.reflectance).toBeCloseTo(zero.reflectance, 12);
    expect(explicitZero.transmission).toBeCloseTo(zero.transmission, 12);
  });

  it('shifts the uniform-strain Bragg condition through explicit material response', () => {
    const strainedDesign = {
      ...baseDesign,
      peakStrain: 300e-6,
      strainCenterMm: baseDesign.lengthMm / 2,
      strainWidthMm: baseDesign.lengthMm,
      strainShape: 'rectangular' as const,
    };
    const local = applyMaterialStrainResponse(
      createHybridBraggModel(strainedDesign).grating,
      createHybridBraggModel(strainedDesign).materialResponse,
      strainedDesign.peakStrain,
    );
    const unstrainedWavelengthNm = getHybridDesignBraggWavelengthNm(baseDesign);
    const shiftedWavelengthNm = local.braggWavelengthM * 1e9;
    const strainedAtOld = solveHybridBraggCoupledModePoint(createHybridBraggModel(strainedDesign), unstrainedWavelengthNm);
    const strainedAtShifted = solveHybridBraggCoupledModePoint(createHybridBraggModel(strainedDesign), shiftedWavelengthNm);

    expect(shiftedWavelengthNm).not.toBeCloseTo(unstrainedWavelengthNm, 6);
    expect(strainedAtShifted.reflectance).toBeGreaterThan(strainedAtOld.reflectance);
  });

  it('keeps rectangular and Gaussian strain sampling contracts explicit', () => {
    const rectangular = { peakStrain: 400e-6, centerM: 1e-3, widthM: 0.5e-3, shape: 'rectangular' as const };
    const gaussian = { ...rectangular, shape: 'gaussian' as const };

    expect(sampleStrainField(rectangular, rectangular.centerM)).toBe(rectangular.peakStrain);
    expect(sampleStrainField(rectangular, rectangular.centerM + rectangular.widthM / 2 + 1e-9)).toBe(0);
    expect(sampleStrainField(gaussian, gaussian.centerM)).toBeCloseTo(gaussian.peakStrain, 12);
    expect(sampleStrainField(gaussian, gaussian.centerM - gaussian.widthM / 2)).toBeCloseTo(gaussian.peakStrain / 2, 3);
    expect(sampleStrainField(gaussian, gaussian.centerM - 0.2e-3)).toBeCloseTo(
      sampleStrainField(gaussian, gaussian.centerM + 0.2e-3),
      15,
    );
  });

  it('applies localized strain only inside the prescribed rectangular region', () => {
    const design = { ...baseDesign, peakStrain: 500e-6, strainCenterMm: 1, strainWidthMm: 0.5 };
    const samples = sampleHybridBraggModel(createHybridBraggModel(design), 600e-9);
    const strainedSamples = samples.filter((sample) => sample.strain !== 0);

    expect(strainedSamples.length).toBeGreaterThan(0);
    expect(samples[0].strain).toBe(0);
    expect(samples[samples.length - 1].strain).toBe(0);
    expect(Math.min(...strainedSamples.map((sample) => sample.zM))).toBeGreaterThan(0.0007);
    expect(Math.max(...strainedSamples.map((sample) => sample.zM))).toBeLessThan(0.0013);
  });

  it('samples segmented Bragg sections with gaps and phase-reset modes', () => {
    const design = {
      ...baseDesign,
      lengthMm: 4,
      permanentGratingMode: 'segmented' as const,
      braggSectionCount: 4,
      braggSectionGapMm: 0.1,
      braggSectionPhaseMode: 'fixed-reset' as const,
      segmentCount: 400,
    };
    const samples = sampleHybridBraggModel(createHybridBraggModel(design), 600e-9);
    const braggSamples = samples.filter((sample) => sample.inBraggSection);
    const gapSamples = samples.filter((sample) => !sample.inBraggSection);
    const sectionIds = Array.from(new Set(braggSamples.map((sample) => sample.sectionId)));

    expect(sectionIds).toEqual([0, 1, 2, 3]);
    expect(gapSamples.length).toBeGreaterThan(0);
    expect(Math.max(...gapSamples.map((sample) => sample.couplingCoefficientPerM))).toBe(0);
    expect(braggSamples[0].sectionEndM! - braggSamples[0].sectionStartM!).toBeCloseTo(0.000925, 9);
    expect(samples.find((sample) => sample.sectionId === 1)?.gratingPhaseRadians).not.toBeCloseTo(
      samples.find((sample) => sample.sectionId === 0)?.gratingPhaseRadians ?? 0,
      6,
    );
  });

  it('places segmented section and gap boundaries on exact solver interval edges', () => {
    const model = createHybridBraggModel({
      ...baseDesign,
      lengthMm: 10,
      permanentGratingMode: 'segmented',
      braggSectionCount: 3,
      braggSectionGapMm: 0.17,
      braggSectionPhaseMode: 'alternating',
      segmentCount: 17,
    });
    const samples = sampleHybridBraggModel(model, 600e-9);
    const intervalEdges = new Set(samples.flatMap((sample) => [
      Number(sample.startM.toPrecision(12)),
      Number(sample.endM.toPrecision(12)),
    ]));
    const sectionLengthM = (0.01 - 2 * 0.00017) / 3;
    const expectedBoundaries = [
      0,
      sectionLengthM,
      sectionLengthM + 0.00017,
      2 * sectionLengthM + 0.00017,
      2 * sectionLengthM + 2 * 0.00017,
      3 * sectionLengthM + 2 * 0.00017,
    ].map((value) => Number(value.toPrecision(12)));

    expectedBoundaries.forEach((boundary) => {
      expect(intervalEdges.has(boundary)).toBe(true);
    });
  });

  it('keeps continuous segmented phase equivalent to the global grating when there are no gaps', () => {
    const global = solveHybridBraggCoupledModePoint(createHybridBraggModel(baseDesign), 600);
    const segmented = solveHybridBraggCoupledModePoint(
      createHybridBraggModel({
        ...baseDesign,
        permanentGratingMode: 'segmented',
        braggSectionCount: 4,
        braggSectionGapMm: 0,
        braggSectionPhaseMode: 'continuous',
      }),
      600,
    );

    expect(segmented.reflectance).toBeCloseTo(global.reflectance, 12);
  });

  it('moves the prescribed pulse position without changing the permanent grating', () => {
    const left = sampleHybridBraggModel(
      createHybridBraggModel({ ...baseDesign, peakStrain: 500e-6, strainCenterMm: 0.5 }),
      600e-9,
    );
    const right = sampleHybridBraggModel(
      createHybridBraggModel({ ...baseDesign, peakStrain: 500e-6, strainCenterMm: 1.5 }),
      600e-9,
    );
    const leftPeak = left.reduce((best, sample) => (sample.strain > best.strain ? sample : best), left[0]);
    const rightPeak = right.reduce((best, sample) => (sample.strain > best.strain ? sample : best), right[0]);

    expect(rightPeak.zM).toBeGreaterThan(leftPeak.zM);
    expect(right[0].periodM).toBeCloseTo(left[0].periodM, 15);
  });

  it('converges spatial discretization for a localized-strain spectrum', () => {
    const design = {
      ...baseDesign,
      peakStrain: 700e-6,
      strainCenterMm: 1.1,
      strainWidthMm: 0.35,
      fixedLaserWavelengthNm: 600.2,
    };
    const wavelengthsNm = range(598.5, 601.5, 0.25);
    const referenceDesign = { ...design, segmentCount: 1600 };
    const referenceSpectrum = solveHybridBraggCoupledModeSpectrum(createHybridBraggModel(referenceDesign), wavelengthsNm);
    const referencePeak = findPeakWavelength(referenceSpectrum);
    const referenceFixed = solveHybridBraggCoupledModePoint(createHybridBraggModel(referenceDesign), design.fixedLaserWavelengthNm).reflectance;

    [25, 50, 100, 200, 400, 800].forEach((segmentCount) => {
      const spectrum = solveHybridBraggCoupledModeSpectrum(createHybridBraggModel({ ...design, segmentCount }), wavelengthsNm);
      const fixed = solveHybridBraggCoupledModePoint(createHybridBraggModel({ ...design, segmentCount }), design.fixedLaserWavelengthNm).reflectance;
      const maxError = maxAbsoluteReflectanceError(spectrum, referenceSpectrum);

      expect(maxError).toBeLessThan(segmentCount < 400 ? 0.04 : 0.005);
      expect(Math.abs(fixed - referenceFixed)).toBeLessThan(segmentCount < 400 ? 0.035 : 0.004);
      expect(Math.abs(findPeakWavelength(spectrum) - referencePeak)).toBeLessThanOrEqual(0.25);
    });
  });

  it('shows TMM discretization agreement is best in the weak-modulation regime', () => {
    const wavelengthOffsetsNm = [0, 0.2, 0.8];
    const strengths = [1e-5, 1e-4, 1e-3];
    const differences = strengths.map((indexModulation) => {
      const design = { ...baseDesign, lengthMm: 0.02, indexModulation, segmentCount: 400 };
      const braggWavelengthNm = getHybridDesignBraggWavelengthNm(design);
      const cmt = wavelengthOffsetsNm.map((offset) =>
        solveHybridBraggCoupledModePoint(createHybridBraggModel(design), braggWavelengthNm + offset).reflectance,
      );
      const tmm = wavelengthOffsetsNm.map((offset) =>
        solveLayerStack(buildSinusoidalTmmStack(design, 16), {
          wavelengthNm: braggWavelengthNm + offset,
          incidentAngleDegrees: 0,
          polarization: 'TE',
        }).reflectance,
      );

      return maxAbsoluteDifference(cmt, tmm);
    });

    expect(differences[0]).toBeLessThan(0.01);
    expect(differences[1]).toBeLessThan(0.03);
    expect(differences[2]).toBeGreaterThan(differences[0]);
  });

  it('improves the TMM reference as slices per period increase', () => {
    const design = { ...baseDesign, lengthMm: 0.02, indexModulation: 1e-4, segmentCount: 400 };
    const braggWavelengthNm = getHybridDesignBraggWavelengthNm(design);
    const wavelengthsNm = [braggWavelengthNm, braggWavelengthNm + 0.2, braggWavelengthNm + 0.8];
    const cmt = wavelengthsNm.map((wavelengthNm) =>
      solveHybridBraggCoupledModePoint(createHybridBraggModel(design), wavelengthNm).reflectance,
    );
    const errors = [4, 8, 16, 32].map((slicesPerPeriod) => {
      const tmm = wavelengthsNm.map((wavelengthNm) =>
        solveLayerStack(buildSinusoidalTmmStack(design, slicesPerPeriod), {
          wavelengthNm,
          incidentAngleDegrees: 0,
          polarization: 'TE',
        }).reflectance,
      );
      return maxAbsoluteDifference(cmt, tmm);
    });

    expect(errors[3]).toBeLessThan(errors[0]);
    expect(errors[3]).toBeLessThan(0.02);
  });

  it('reveals finite-grating position dependence for a localized strain packet', () => {
    const design = { ...baseDesign, peakStrain: 800e-6, strainWidthMm: 0.3, fixedLaserWavelengthNm: 600.1 };
    const centers = [0.2, 0.5, 1, 1.5, 1.8];
    const responses = centers.map((strainCenterMm) =>
      solveHybridBraggCoupledModePoint(createHybridBraggModel({ ...design, strainCenterMm }), design.fixedLaserWavelengthNm).reflectance,
    );
    const spread = Math.max(...responses) - Math.min(...responses);

    expect(spread).toBeGreaterThan(1e-5);
    expect(spread).toBeLessThan(0.6);
  });

  it('keeps lossless matched-boundary power normalized and stable over representative extremes', () => {
    const cases = [
      { ...baseDesign, lengthMm: 20, indexModulation: 1e-3, segmentCount: 1600 },
      { ...baseDesign, lengthMm: 5, indexModulation: 1e-8, segmentCount: 400 },
      { ...baseDesign, lengthMm: 2, indexModulation: 1e-4, segmentCount: 1200 },
    ];

    cases.forEach((design) => {
      [560, getHybridDesignBraggWavelengthNm(design), 650].forEach((wavelengthNm) => {
        const result = solveHybridBraggCoupledModePoint(createHybridBraggModel(design), wavelengthNm);

        expect(Number.isFinite(result.reflectance)).toBe(true);
        expect(Number.isFinite(result.transmission)).toBe(true);
        expect(result.reflectance).toBeGreaterThanOrEqual(0);
        expect(result.reflectance).toBeLessThanOrEqual(1);
        expect(result.reflectance + result.transmission).toBeCloseTo(1, 12);
      });
    });
  });

  it('exposes finite calculated spatial forward and backward optical fields', () => {
    const result = solveHybridBraggCoupledModePoint(createHybridBraggModel(baseDesign), getHybridDesignBraggWavelengthNm(baseDesign));

    expect(result.spatialField).toHaveLength(baseDesign.segmentCount);
    result.spatialField.forEach((sample) => {
      expect(Number.isFinite(sample.forwardIntensity)).toBe(true);
      expect(Number.isFinite(sample.backwardIntensity)).toBe(true);
      expect(sample.normalizedBackwardIntensity).toBeGreaterThanOrEqual(0);
      expect(sample.normalizedBackwardIntensity).toBeLessThanOrEqual(1);
    });
    expect(Math.max(...result.spatialField.map((sample) => sample.normalizedBackwardIntensity))).toBeCloseTo(1, 12);
  });
});

function buildSinusoidalTmmStack(
  design: typeof baseDesign,
  slicesPerPeriod: number,
): LayerStack {
  const totalLengthNm = design.lengthMm * 1e6;
  const sliceCount = Math.max(1, Math.round((totalLengthNm / design.gratingPeriodNm) * slicesPerPeriod));
  const thicknessNm = totalLengthNm / sliceCount;
  const background = { id: 'hybrid-background', name: 'Hybrid background', refractiveIndex: design.averageIndex };
  return {
    incidentMedium: background,
    exitMedium: background,
    layers: Array.from({ length: sliceCount }, (_, index) => {
      const zNm = (index + 0.5) * thicknessNm;
      const refractiveIndex =
        design.averageIndex +
        design.indexModulation * Math.cos((2 * Math.PI * zNm) / design.gratingPeriodNm);
      return {
        thicknessNm,
        material: {
          id: `hybrid-reference-${index}`,
          name: `Hybrid reference ${index}`,
          refractiveIndex,
        },
      };
    }),
  };
}

function wavelengthForDetuningNm(averageIndex: number, periodM: number, detuningPerM: number): number {
  return ((2 * Math.PI * averageIndex) / (Math.PI / periodM + detuningPerM)) * 1e9;
}

function range(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) {
    values.push(Number(value.toFixed(8)));
  }
  return values;
}

function findPeakWavelength(points: { wavelengthNm: number; reflectance: number }[]): number {
  return points.reduce((best, point) => (point.reflectance > best.reflectance ? point : best), points[0]).wavelengthNm;
}

function maxAbsoluteReflectanceError(
  actual: { reflectance: number }[],
  expected: { reflectance: number }[],
): number {
  return Math.max(...actual.map((point, index) => Math.abs(point.reflectance - expected[index].reflectance)));
}

function maxAbsoluteDifference(actual: number[], expected: number[]): number {
  return Math.max(...actual.map((value, index) => Math.abs(value - expected[index])));
}
