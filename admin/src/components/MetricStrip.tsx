import type { ReactNode } from 'react';

type Accent = 'ok' | 'warn' | 'info' | undefined;

interface MetricProps {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  accent?: Accent;
}

export function Metric({ label, value, foot, accent }: MetricProps) {
  return (
    <div className={`metric ${accent ? `accent-${accent}` : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {foot ? <div className="metric-foot">{foot}</div> : null}
    </div>
  );
}

export function MetricStrip({ children }: { children: ReactNode }) {
  return <div className="metric-strip">{children}</div>;
}
