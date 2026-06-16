import { MATERIAL_CATALOG } from '../materials/catalog';
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
};
