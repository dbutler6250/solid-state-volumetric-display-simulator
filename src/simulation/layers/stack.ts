import type { Material } from '../materials/material';
import type { OpticalLayer } from './layer';

export type LayerStack = {
  incidentMedium: Material;
  layers: OpticalLayer[];
  exitMedium: Material;
};
