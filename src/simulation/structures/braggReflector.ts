import type { OpticalLayer } from '../layers/layer';
import type { LayerStack } from '../layers/stack';
import { AIR, MATERIAL_CATALOG } from '../materials/catalog';
import type { BraggReflectorInputs } from '../../types/simulation';

export const DEFAULT_BRAGG_REFLECTOR_INPUTS: BraggReflectorInputs = {
  highIndexMaterial: MATERIAL_CATALOG[0],
  lowIndexMaterial: MATERIAL_CATALOG[1],
  highIndexThicknessNm: 62.5,
  lowIndexThicknessNm: 103.4,
  periodCount: 8,
  designWavelengthNm: 600,
  incidentAngleDegrees: 0,
  polarization: 'TE',
  wavelengthStartNm: 300,
  wavelengthEndNm: 900,
  wavelengthPointCount: 401,
};

export function buildBraggReflectorLayers(inputs: BraggReflectorInputs): OpticalLayer[] {
  const layers: OpticalLayer[] = [];

  for (let period = 0; period < inputs.periodCount; period += 1) {
    layers.push(
      {
        material: inputs.highIndexMaterial,
        thicknessNm: inputs.highIndexThicknessNm,
      },
      {
        material: inputs.lowIndexMaterial,
        thicknessNm: inputs.lowIndexThicknessNm,
      },
    );
  }

  return layers;
}

export function buildBraggReflectorStack(inputs: BraggReflectorInputs): LayerStack {
  return {
    incidentMedium: AIR,
    layers: buildBraggReflectorLayers(inputs),
    exitMedium: AIR,
  };
}
