import type { QuarterWaveStackInputs } from '../../types/simulation';
import { formatRefractiveIndex } from '../../simulation/materials/material';
import { getResolvedStackInputs } from '../../simulation/structures/quarterWaveStack';

type StackDefinitionPanelProps = {
  inputs: QuarterWaveStackInputs;
  isValid: boolean;
};

type DiagramSegment = {
  key: string;
  label: string;
  detail: string;
  kind: 'ambient' | 'high' | 'low' | 'ellipsis';
};

const MAX_VISIBLE_PERIODS = 3;
const LEADING_PERIODS = 1;
const TRAILING_PERIODS = 1;

const formatNumber = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toFixed(digits) : 'Invalid';

const formatCount = (value: number): string => (Number.isFinite(value) ? `${Math.round(value)}` : 'Invalid');

const formatMaterialLabel = (name: string, refractiveIndex: QuarterWaveStackInputs['highIndexMaterial']['refractiveIndex']): string =>
  `${name}${name === 'Custom' ? ' material' : ''} (${formatRefractiveIndex(refractiveIndex)})`;

const createPeriodSegments = (
  highIndexThicknessNm: number,
  lowIndexThicknessNm: number,
  period: number,
): DiagramSegment[] => [
  {
    key: `h-${period}`,
    label: 'H',
    detail: `${formatNumber(highIndexThicknessNm, 1)} nm`,
    kind: 'high',
  },
  {
    key: `l-${period}`,
    label: 'L',
    detail: `${formatNumber(lowIndexThicknessNm, 1)} nm`,
    kind: 'low',
  },
];

/** Builds a compact layer sequence for the stack preview. */
const createLayerSegments = (inputs: QuarterWaveStackInputs): DiagramSegment[] => {
  const { highIndexThicknessNm, lowIndexThicknessNm, periodCount } = getResolvedStackInputs(inputs);
  const incidentMedium: DiagramSegment = {
    key: 'incident',
    label: 'Air',
    detail: 'n=1',
    kind: 'ambient',
  };
  const exitMedium: DiagramSegment = {
    key: 'exit',
    label: 'Air',
    detail: 'n=1',
    kind: 'ambient',
  };

  if (periodCount <= MAX_VISIBLE_PERIODS) {
    return [
      incidentMedium,
      ...Array.from({ length: periodCount }, (_, index) =>
        createPeriodSegments(highIndexThicknessNm, lowIndexThicknessNm, index + 1),
      ).flat(),
      exitMedium,
    ];
  }

  return [
    incidentMedium,
    ...Array.from({ length: LEADING_PERIODS }, (_, index) =>
      createPeriodSegments(highIndexThicknessNm, lowIndexThicknessNm, index + 1),
    ).flat(),
    {
      key: 'ellipsis',
      label: '...',
      detail: `${periodCount - LEADING_PERIODS - TRAILING_PERIODS} periods hidden`,
      kind: 'ellipsis',
    },
    ...Array.from({ length: TRAILING_PERIODS }, (_, index) =>
      createPeriodSegments(
        highIndexThicknessNm,
        lowIndexThicknessNm,
        periodCount - TRAILING_PERIODS + index + 1,
      ),
    ).flat(),
    exitMedium,
  ];
};

/** Shows the derived stack geometry and a concise layer diagram. */
export function StackDefinitionPanel({ inputs, isValid }: StackDefinitionPanelProps) {
  const thicknessMode = inputs.thicknessMode ?? 'derived';
  const resolvedStackInputs = getResolvedStackInputs(inputs);
  const { highIndexThicknessNm, lowIndexThicknessNm } = resolvedStackInputs;
  const totalLayerCount = Number.isFinite(resolvedStackInputs.periodCount)
    ? Math.max(0, Math.round(resolvedStackInputs.periodCount) * 2)
    : Number.NaN;
  const totalPhysicalThicknessNm = resolvedStackInputs.periodCount * (highIndexThicknessNm + lowIndexThicknessNm);
  const segments = isValid ? createLayerSegments(inputs) : [];

  return (
    <section className="stack-panel" aria-label="Quarter-wave stack definition">
      <div className="stack-panel-heading">
        <h2>Stack Definition</h2>
        <span>Air | H/L x {formatCount(resolvedStackInputs.periodCount)} | Air</span>
      </div>
      <div className="stack-panel-subtitle">
        <span className={`mode-pill mode-pill-${thicknessMode}`}>
          {thicknessMode === 'derived'
            ? 'Optical'
            : thicknessMode === 'manual'
              ? 'Manual'
              : 'Acoustic'}
        </span>
        <span>
          {thicknessMode === 'derived'
            ? 'Quarter-wave values follow the design wavelength.'
            : thicknessMode === 'manual'
              ? 'Thicknesses are editable.'
              : 'Acoustic inputs drive the stack thicknesses.'}
        </span>
      </div>

      <div className="stack-summary-grid">
        <StackSummaryItem label="Generated layers" value={formatCount(totalLayerCount)} />
        <StackSummaryItem label="Total thickness" value={`${formatNumber(totalPhysicalThicknessNm, 1)} nm`} />
        <StackSummaryItem
          label="High layer"
          value={formatMaterialLabel(
            inputs.highIndexMaterial.name,
            inputs.highIndexMaterial.refractiveIndex,
          )}
        />
        <StackSummaryItem
          label="Low layer"
          value={formatMaterialLabel(
            inputs.lowIndexMaterial.name,
            inputs.lowIndexMaterial.refractiveIndex,
          )}
        />
        <StackSummaryItem label="H optical thickness" value={`d=${formatNumber(highIndexThicknessNm, 1)} nm`} />
        <StackSummaryItem label="L optical thickness" value={`d=${formatNumber(lowIndexThicknessNm, 1)} nm`} />
      </div>

      {isValid ? (
        <div className="stack-diagram" aria-label="Layer sequence diagram">
          {segments.map((segment) => (
            <div className={`stack-segment stack-segment-${segment.kind}`} key={segment.key}>
              <strong>{segment.label}</strong>
              <span>{segment.detail}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="stack-diagram-placeholder">
          The stack diagram will update when the inputs are valid.
        </div>
      )}

      {thicknessMode === 'acoustic' ? (
        <AcousticStackOutputs inputs={inputs} />
      ) : null}
    </section>
  );
}

/** Shows acoustic-derived quantities beside the resolved stack geometry. */
function AcousticStackOutputs({ inputs }: { inputs: QuarterWaveStackInputs }) {
  const design = inputs.acousticDesign;
  const summary = getResolvedStackInputs(inputs).acousticSummary;

  if (!design) {
    return null;
  }

  return (
    <section className="stack-panel acoustic-stack-outputs" aria-label="Acoustic stack outputs">
      <div className="stack-panel-heading">
        <h2>Acoustic Outputs</h2>
        <span>Derived from the active acoustic input mode.</span>
      </div>
      <div className="stack-summary-grid">
        <StackSummaryItem label="Acoustic medium" value={design.acousticMaterial.name} />
        <StackSummaryItem label="Velocity" value={`${design.acousticVelocityMps.toFixed(0)} m/s`} />
        <StackSummaryItem label="Frequency" value={`${(design.acousticFrequencyHz / 1e9).toFixed(3)} GHz`} />
        <StackSummaryItem label="Driven periods" value={`${Math.round(design.acousticPeriodCount)}`} />
        <StackSummaryItem label="Bragg order" value={`${Math.round(design.braggOrder)}`} />
        <StackSummaryItem label="Representation" value={design.acousticRepresentationMode} />
        <StackSummaryItem
          label="Acoustic wavelength"
          value={summary ? `${formatNumber(summary.acousticWavelengthNm, 2)} nm` : 'Invalid'}
        />
        <StackSummaryItem
          label="Resolved design wavelength"
          value={summary ? `${formatNumber(summary.braggWavelengthNm, 2)} nm` : 'Invalid'}
        />
        <StackSummaryItem
          label="Acoustic period length"
          value={summary ? `${formatNumber(summary.periodLengthNm, 2)} nm` : 'Invalid'}
        />
        <StackSummaryItem
          label="Predicted Bragg wavelength"
          value={summary ? `${formatNumber(summary.braggWavelengthNm, 2)} nm` : 'Invalid'}
        />
        <StackSummaryItem
          label="Total length"
          value={summary ? `${formatNumber(summary.totalLengthNm, 2)} nm` : 'Invalid'}
        />
        <StackSummaryItem
          label="Estimated layers"
          value={summary ? formatCount(summary.estimatedLayers) : 'Invalid'}
        />
      </div>
      <div className="acoustic-future-modes">
        <div className="stack-summary-item">
          <span>Standing-wave</span>
          <strong>Planned</strong>
          <small>Future mode stub for fixed-node acoustic gratings.</small>
        </div>
        <div className="stack-summary-item">
          <span>Traveling-wave</span>
          <strong>Planned</strong>
          <small>Future mode stub for propagating acoustic gratings.</small>
        </div>
        <div className="stack-summary-item">
          <span>Coupled-mode / Floquet</span>
          <strong>Planned</strong>
          <small>Future solver path stub for higher-fidelity analysis.</small>
        </div>
      </div>
    </section>
  );
}

function StackSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
