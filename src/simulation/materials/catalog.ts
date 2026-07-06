import type { Material } from './material';

/** Default ambient medium used at the stack boundaries. */
export const AIR: Material = {
  id: 'air',
  name: 'Air',
  refractiveIndex: 1,
};

export const MATERIAL_CATALOG: Material[] = [
  {
    id: 'tio2',
    name: 'TiO2',
    refractiveIndex: 2.4,
  },
  {
    id: 'sio2',
    name: 'SiO2',
    refractiveIndex: 1.45,
  },
];
