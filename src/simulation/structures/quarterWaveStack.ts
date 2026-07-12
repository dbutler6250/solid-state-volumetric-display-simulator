import type { OpticalLayer } from '../layers/layer';
import type { LayerStack } from '../layers/stack';
import { AIR, MATERIAL_CATALOG } from '../materials/catalog';
import { getRefractiveIndexReal } from '../materials/material';
import type { QuarterWaveStackInputs } from '../../types/simulation';

const getQuarterWaveThickness = (designWavelengthNm: number, refractiveIndex: number): number =>
  designWavelengthNm / (4 * refractiveIndex);

/** Default inputs that provide a valid starting stack for the UI. */
export const DEFAULT_QUARTER_WAVE_STACK_INPUTS: QuarterWaveStackInputs = {
  highIndexMaterial: MATERIAL_CATALOG[0],
  lowIndexMaterial: MATERIAL_CATALOG[1],
  periodCount: 10,
  designWavelengthNm: 600,
  incidentAngleDegrees: 0,
  polarization: 'TE',
  wavelengthStartNm: 300,
  wavelengthEndNm: 900,
  wavelengthPointCount: 500,
};

/** Builds the alternating high/low layer sequence for the solver. */
export function buildQuarterWaveStackLayers(inputs: QuarterWaveStackInputs): OpticalLayer[] {
  const highIndexThicknessNm = getQuarterWaveThickness(
    inputs.designWavelengthNm,
    getRefractiveIndexReal(inputs.highIndexMaterial.refractiveIndex),
  );
  const lowIndexThicknessNm = getQuarterWaveThickness(
    inputs.designWavelengthNm,
    getRefractiveIndexReal(inputs.lowIndexMaterial.refractiveIndex),
  );
  const layers: OpticalLayer[] = [];

  for (let period = 0; period < inputs.periodCount; period += 1) {
    layers.push(
      {
        material: inputs.highIndexMaterial,
        thicknessNm: highIndexThicknessNm,
      },
      {
        material: inputs.lowIndexMaterial,
        thicknessNm: lowIndexThicknessNm,
      },
    );
  }

  return layers;
}

/** Wraps the generated layers with air on both sides of the stack. */
export function buildQuarterWaveStack(inputs: QuarterWaveStackInputs): LayerStack {
  return {
    incidentMedium: AIR,
    layers: buildQuarterWaveStackLayers(inputs),
    exitMedium: AIR,
  };
}
