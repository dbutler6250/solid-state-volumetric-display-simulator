import type { BraggReflectorInputs } from '../types/simulation';

type BraggConfigExport = {
  schema: 'ssvds-bragg-config-v1';
  app: 'solid-state-volumetric-display-simulator';
  exportedAt: string;
  structureType: 'quarter-wave-bragg-reflector';
  units: {
    wavelength: 'nm';
    angle: 'deg';
  };
  inputs: {
    highIndexMaterial: BraggReflectorInputs['highIndexMaterial'];
    lowIndexMaterial: BraggReflectorInputs['lowIndexMaterial'];
    periodCount: number;
    designWavelengthNm: number;
    incidentAngleDegrees: number;
    polarization: BraggReflectorInputs['polarization'];
    wavelengthStartNm?: number;
    wavelengthEndNm?: number;
    wavelengthPointCount?: number;
  };
};

export function exportBraggConfigJson(inputs: BraggReflectorInputs): string {
  const payload: BraggConfigExport = {
    schema: 'ssvds-bragg-config-v1',
    app: 'solid-state-volumetric-display-simulator',
    exportedAt: new Date().toISOString(),
    structureType: 'quarter-wave-bragg-reflector',
    units: {
      wavelength: 'nm',
      angle: 'deg',
    },
    inputs: {
      highIndexMaterial: inputs.highIndexMaterial,
      lowIndexMaterial: inputs.lowIndexMaterial,
      periodCount: inputs.periodCount,
      designWavelengthNm: inputs.designWavelengthNm,
      incidentAngleDegrees: inputs.incidentAngleDegrees,
      polarization: inputs.polarization,
      wavelengthStartNm: inputs.wavelengthStartNm,
      wavelengthEndNm: inputs.wavelengthEndNm,
      wavelengthPointCount: inputs.wavelengthPointCount,
    },
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
