import type { Material } from '../materials/material';

/** Represents one homogeneous optical layer in the transfer-matrix stack. */
export type OpticalLayer = {
  material: Material;
  thicknessNm: number;
};
