// Shared Badge component
interface BadgeProps {
  variant: 'genuine' | 'suspicious' | 'manipulated' | 'neutral' | 'accent';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}

// Risk level badge
import type { RiskLevel } from '../../types';
import { RISK_LABELS } from '../../types';

export function RiskBadge({ level }: { level: RiskLevel }) {
  const variantMap: Record<RiskLevel, 'genuine' | 'suspicious' | 'manipulated'> = {
    likely_genuine:        'genuine',
    suspicious:            'suspicious',
    potentially_manipulated: 'manipulated',
  };
  return <Badge variant={variantMap[level]}>{RISK_LABELS[level]}</Badge>;
}
