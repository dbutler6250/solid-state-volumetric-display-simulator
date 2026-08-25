import {
  createCoupledDifferentialArrayField,
  createLocalizedEigenstrainField,
  createMechanicallyIsolatedField,
  createShearLagCounterStrainField,
  createStiffnessEngineeredField,
  createUniformField,
  type SampledStrainField,
} from './actuatorStrainTransfer';
import { solveUniformAxialStrain, type AxialState, type HostMechanicalProperties } from './axialElasticity';
import { calculateMechanicalTargetMetrics, type MechanicalStrainTarget, type MechanicalTargetMetrics } from './mechanicalTargetMetrics';

export type MechanicalArchitectureResult = {
  architecture: string;
  abstraction: string;
  field: SampledStrainField;
  metrics: MechanicalTargetMetrics;
  requiredFreeStrain: number | null;
  requiredDisplacementM: number | null;
  requiredForceN: number | null;
  stressPa: number | null;
  classification: 'MECHANICALLY PLAUSIBLE AT REDUCED-ORDER LEVEL' | 'MECHANICALLY MARGINAL' | 'MECHANICALLY IMPLAUSIBLE UNDER TESTED ASSUMPTIONS';
  notes: string;
};

/** Evaluates the required reduced-order mechanical architectures against one sampled strain target. */
export function evaluateMechanicalArchitectures(input: {
  target: MechanicalStrainTarget;
  targetField: SampledStrainField;
  host: HostMechanicalProperties;
}): { preload: AxialState; architectures: MechanicalArchitectureResult[] } {
  const { target, targetField, host } = input;
  const excursion = target.backgroundStrain - target.troughStrain;
  const preload = solveUniformAxialStrain(target.lengthM, target.backgroundStrain, host);
  const base = {
    lengthM: target.lengthM,
    centerM: target.centerM,
    widthM: target.widthM,
    transitionWidthM: target.transitionWidthM,
    backgroundStrain: target.backgroundStrain,
    troughStrain: target.troughStrain,
  };
  const cases: Array<Omit<MechanicalArchitectureResult, 'metrics' | 'classification'> & { field: SampledStrainField }> = [
    {
      architecture: 'local force in uniform medium',
      abstraction: '1D continuous preloaded bar with a local axial force surrogate',
      field: createUniformField(target.lengthM, target.backgroundStrain),
      requiredFreeStrain: null,
      requiredDisplacementM: null,
      requiredForceN: preload.forceN,
      stressPa: preload.stressPa,
      notes: 'Static 1D axial equilibrium redistributes force globally and does not create localized relief.',
    },
    {
      architecture: 'preload + active counter-strain',
      abstraction: 'uniform preload plus local negative eigenstrain over the optical trough',
      field: createLocalizedEigenstrainField({ ...base, eigenstrain: -excursion }),
      requiredFreeStrain: -excursion,
      requiredDisplacementM: excursion * target.widthM,
      requiredForceN: preload.forceN,
      stressPa: preload.stressPa,
      notes: 'Ideal reduced-order eigenstrain directly matches the optical trough shape.',
    },
    {
      architecture: 'opposed differential actuator pair',
      abstraction: 'symmetric counter-strain pair represented as a high-transfer local eigenstrain',
      field: createLocalizedEigenstrainField({ ...base, eigenstrain: -excursion, transfer: 0.96 }),
      requiredFreeStrain: -excursion / 0.96,
      requiredDisplacementM: (excursion / 0.96) * target.widthM,
      requiredForceN: preload.forceN,
      stressPa: preload.stressPa,
      notes: 'Symmetry reduces net translation in this reduced-order abstraction but still needs high strain transfer.',
    },
    {
      architecture: 'bonded/shear-lag actuator',
      abstraction: 'local actuator free strain transferred through an exponential shear-lag length',
      field: createShearLagCounterStrainField({ ...base, actuatorFreeStrain: -excursion, transferLengthM: target.transitionWidthM / 2 }),
      requiredFreeStrain: -excursion,
      requiredDisplacementM: excursion * target.widthM,
      requiredForceN: preload.forceN,
      stressPa: preload.stressPa,
      notes: 'Requires transfer length substantially below the optical transition scale to preserve localization.',
    },
    {
      architecture: 'local stiffness engineering',
      abstraction: 'constant-force bar with locally increased EA',
      field: createStiffnessEngineeredField({ ...base, stiffnessRatio: 10 }),
      requiredFreeStrain: null,
      requiredDisplacementM: null,
      requiredForceN: preload.forceN,
      stressPa: preload.stressPa,
      notes: 'A 10x local stiffness ratio gives only partial relief; exact zero strain would require an unbounded ratio under constant force.',
    },
    {
      architecture: 'mechanically isolated zone',
      abstraction: 'local optical region coupled through compliant effective interfaces',
      field: createMechanicallyIsolatedField({ ...base, interfaceCoupling: 0.12, edgeLeakageWidthM: target.transitionWidthM }),
      requiredFreeStrain: -excursion / 0.88,
      requiredDisplacementM: (excursion / 0.88) * target.widthM,
      requiredForceN: preload.forceN * 0.88,
      stressPa: preload.stressPa * 0.88,
      notes: 'Isolation improves localization in 1D but introduces fabrication and optical-continuity risks.',
    },
    {
      architecture: 'small differential actuator array',
      abstraction: 'four mechanically coupled zones with nearest-neighbor leakage',
      field: createCoupledDifferentialArrayField({
        ...base,
        zoneCount: 4,
        pitchM: target.widthM,
        neighborCoupling: 0.18,
        activeZoneIndex: 1,
        actuatorFreeStrain: -excursion,
      }),
      requiredFreeStrain: -excursion,
      requiredDisplacementM: excursion * target.widthM,
      requiredForceN: preload.forceN,
      stressPa: preload.stressPa,
      notes: 'Array cross-coupling reduces trough depth before any detailed optimization.',
    },
  ];

  return {
    preload,
    architectures: cases.map((item) => {
      const metrics = calculateMechanicalTargetMetrics(target, targetField, item.field);
      return { ...item, metrics, classification: classify(metrics, excursion, target.transitionWidthM) };
    }),
  };
}

function classify(metrics: MechanicalTargetMetrics, excursion: number, transitionWidthM: number): MechanicalArchitectureResult['classification'] {
  const amplitudeOk = Math.abs(metrics.troughMinimumError) <= 0.12 * excursion;
  const transitionOk = Math.abs(metrics.transitionWidthErrorM) <= 0.45 * transitionWidthM;
  const leakOk = metrics.crossTalk <= 0.18;
  if (amplitudeOk && transitionOk && leakOk) return 'MECHANICALLY PLAUSIBLE AT REDUCED-ORDER LEVEL';
  if (amplitudeOk || transitionOk) return 'MECHANICALLY MARGINAL';
  return 'MECHANICALLY IMPLAUSIBLE UNDER TESTED ASSUMPTIONS';
}
