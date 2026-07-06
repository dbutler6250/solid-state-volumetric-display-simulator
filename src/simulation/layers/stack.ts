import type { Material } from '../materials/material';
import type { OpticalLayer } from './layer';

/** Describes the full incident-layer-exit stack passed to the solver. */
export type LayerStack = {
  incidentMedium: Material;
  layers: OpticalLayer[];
  exitMedium: Material;
};
