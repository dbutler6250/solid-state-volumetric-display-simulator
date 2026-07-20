export type ChartProgress = {
  completed: number;
  total: number;
};

type ChartProgressOverlayProps = {
  label: string;
  progress: ChartProgress | null;
};

/** Displays calculation progress inside chart frames without covering Plotly controls. */
export function ChartProgressOverlay({ label, progress }: ChartProgressOverlayProps) {
  if (!progress) return null;

  const total = Math.max(0, progress.total);
  const completed = Math.min(Math.max(0, progress.completed), total);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="chart-progress-overlay" role="status" aria-live="polite">
      <div className="chart-progress-copy">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <progress max={100} value={percent} aria-label={label} />
    </div>
  );
}
