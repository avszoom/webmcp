export function ProgressRing({ percentage, label }: { percentage: number; label: string }) {
  return (
    <div
      className="progress-ring"
      style={{ '--progress': `${percentage * 3.6}deg` } as React.CSSProperties}
      aria-label={`${label}: ${percentage}%`}
    >
      <div><strong>{percentage}%</strong><span>complete</span></div>
    </div>
  )
}
