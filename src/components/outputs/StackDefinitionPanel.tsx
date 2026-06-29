import type { BraggReflectorInputs } from '../../types/simulation';

type StackDefinitionPanelProps = {
  inputs: BraggReflectorInputs;
  isValid: boolean;
};

type DiagramSegment = {
  key: string;
  label: string;
  detail: string;
  kind: 'ambient' | 'high' | 'low' | 'ellipsis';
};

const MAX_VISIBLE_PERIODS = 7;
const LEADING_PERIODS = 3;
const TRAILING_PERIODS = 2;

const formatNumber = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toFixed(digits) : 'Invalid';

const formatCount = (value: number): string => (Number.isFinite(value) ? `${Math.round(value)}` : 'Invalid');

const formatOpticalThickness = (refractiveIndex: number, thicknessNm: number, wavelengthNm: number) => {
  if (!Number.isFinite(wavelengthNm) || wavelengthNm <= 0) {
    return 'Invalid';
  }

  return formatNumber((refractiveIndex * thicknessNm) / wavelengthNm, 3);
};

const createPeriodSegments = (inputs: BraggReflectorInputs, period: number): DiagramSegment[] => [
  {
    key: `h-${period}`,
    label: 'H',
    detail: `${formatNumber(inputs.highIndexThicknessNm, 1)} nm`,
    kind: 'high',
  },
  {
    key: `l-${period}`,
    label: 'L',
    detail: `${formatNumber(inputs.lowIndexThicknessNm, 1)} nm`,
    kind: 'low',
  },
];

const createLayerSegments = (inputs: BraggReflectorInputs): DiagramSegment[] => {
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

  if (inputs.periodCount <= MAX_VISIBLE_PERIODS) {
    return [
      incidentMedium,
      ...Array.from({ length: inputs.periodCount }, (_, index) =>
        createPeriodSegments(inputs, index + 1),
      ).flat(),
      exitMedium,
    ];
  }

  return [
    incidentMedium,
    ...Array.from({ length: LEADING_PERIODS }, (_, index) =>
      createPeriodSegments(inputs, index + 1),
    ).flat(),
    {
      key: 'ellipsis',
      label: '...',
      detail: `${inputs.periodCount - LEADING_PERIODS - TRAILING_PERIODS} more`,
      kind: 'ellipsis',
    },
    ...Array.from({ length: TRAILING_PERIODS }, (_, index) =>
      createPeriodSegments(inputs, inputs.periodCount - TRAILING_PERIODS + index + 1),
    ).flat(),
    exitMedium,
  ];
};

export function StackDefinitionPanel({ inputs, isValid }: StackDefinitionPanelProps) {
  const totalLayerCount = Number.isFinite(inputs.periodCount)
    ? Math.max(0, Math.round(inputs.periodCount) * 2)
    : Number.NaN;
  const totalPhysicalThicknessNm =
    inputs.periodCount * (inputs.highIndexThicknessNm + inputs.lowIndexThicknessNm);
  const highOpticalThickness = formatOpticalThickness(
    inputs.highIndexMaterial.refractiveIndex,
    inputs.highIndexThicknessNm,
    inputs.designWavelengthNm,
  );
  const lowOpticalThickness = formatOpticalThickness(
    inputs.lowIndexMaterial.refractiveIndex,
    inputs.lowIndexThicknessNm,
    inputs.designWavelengthNm,
  );
  const segments = isValid ? createLayerSegments(inputs) : [];

  return (
    <section className="stack-panel" aria-label="Bragg reflector stack definition">
      <div className="stack-panel-heading">
        <h2>Stack Definition</h2>
        <span>Air | H/L x {formatCount(inputs.periodCount)} | Air</span>
      </div>

      <div className="stack-summary-grid">
        <StackSummaryItem label="Generated layers" value={formatCount(totalLayerCount)} />
        <StackSummaryItem label="Total thickness" value={`${formatNumber(totalPhysicalThicknessNm, 1)} nm`} />
        <StackSummaryItem
          label="High layer"
          value={`n=${formatNumber(inputs.highIndexMaterial.refractiveIndex)}; d=${formatNumber(
            inputs.highIndexThicknessNm,
            1,
          )} nm`}
        />
        <StackSummaryItem
          label="Low layer"
          value={`n=${formatNumber(inputs.lowIndexMaterial.refractiveIndex)}; d=${formatNumber(
            inputs.lowIndexThicknessNm,
            1,
          )} nm`}
        />
        <StackSummaryItem label="H optical thickness" value={`${highOpticalThickness} lambda0`} />
        <StackSummaryItem label="L optical thickness" value={`${lowOpticalThickness} lambda0`} />
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
