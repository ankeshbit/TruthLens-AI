interface ProgressBarProps {
  value: number; // 0–100
  color?: string;
  height?: number;
  className?: string;
}

export function ProgressBar({ value, color = 'var(--accent)', height = 4, className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`progress-track ${className}`} style={{ height }}>
      <div
        className="progress-fill"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}

// Score bar with risk coloring
import type { RiskLevel } from '../../types';

export function RiskBar({ score, level }: { score: number; level: RiskLevel }) {
  const color =
    level === 'likely_genuine'        ? 'var(--success)' :
    level === 'suspicious'            ? 'var(--warning)' :
                                        'var(--danger)';
  return <ProgressBar value={score} color={color} height={6} />;
}
