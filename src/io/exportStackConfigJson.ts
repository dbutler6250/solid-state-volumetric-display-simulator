import type { ParameterSweepSettings, QuarterWaveStackInputs } from '../types/simulation';

type StackConfigExport = {
  schema: 'ssvds-stack-config-v1';
  app: 'solid-state-volumetric-display-simulator';
  exportedAt: string;
  structureType: 'quarter-wave-stack' | 'acousto-optic-grating';
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
    thicknessMode: QuarterWaveStackInputs['thicknessMode'];
    highIndexThicknessNm?: number;
    lowIndexThicknessNm?: number;
    acousticDesign?: QuarterWaveStackInputs['acousticDesign'];
    wavelengthStartNm?: number;
    wavelengthEndNm?: number;
    wavelengthPointCount?: number;
  };
  parameterSweep?: ParameterSweepSettings;
};

export function exportStackConfigJson(
  inputs: QuarterWaveStackInputs,
  parameterSweep?: ParameterSweepSettings,
): string {
  const payload: StackConfigExport = {
    schema: 'ssvds-stack-config-v1',
    app: 'solid-state-volumetric-display-simulator',
    exportedAt: new Date().toISOString(),
    structureType:
      inputs.thicknessMode === 'acoustic' ? 'acousto-optic-grating' : 'quarter-wave-stack',
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
      thicknessMode: inputs.thicknessMode,
      highIndexThicknessNm: inputs.highIndexThicknessNm,
      lowIndexThicknessNm: inputs.lowIndexThicknessNm,
      acousticDesign: inputs.acousticDesign,
      wavelengthStartNm: inputs.wavelengthStartNm,
      wavelengthEndNm: inputs.wavelengthEndNm,
      wavelengthPointCount: inputs.wavelengthPointCount,
    },
    parameterSweep,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
