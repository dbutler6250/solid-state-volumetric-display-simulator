import type { QuarterWaveStackInputs } from '../types/simulation';

type StackConfigExport = {
  schema: 'ssvds-stack-config-v1';
  app: 'solid-state-volumetric-display-simulator';
  exportedAt: string;
  structureType: 'quarter-wave-stack';
  units: {
    wavelength: 'nm';
    angle: 'deg';
  };
  inputs: {
    highIndexMaterial: QuarterWaveStackInputs['highIndexMaterial'];
    lowIndexMaterial: QuarterWaveStackInputs['lowIndexMaterial'];
    periodCount: number;
    designWavelengthNm: number;
    incidentAngleDegrees: number;
    polarization: QuarterWaveStackInputs['polarization'];
    wavelengthStartNm?: number;
    wavelengthEndNm?: number;
    wavelengthPointCount?: number;
  };
};

export function exportStackConfigJson(inputs: QuarterWaveStackInputs): string {
  const payload: StackConfigExport = {
    schema: 'ssvds-stack-config-v1',
    app: 'solid-state-volumetric-display-simulator',
    exportedAt: new Date().toISOString(),
    structureType: 'quarter-wave-stack',
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
