export type StatBadgeSize = 'sm' | 'md' | 'lg';

export interface StatBadgeProps {
  label: string;
  value: string;
  color?: string;
  size?: StatBadgeSize;
}

const SIZES: Record<StatBadgeSize, { label: number; value: number }> = {
  sm: { label: 9, value: 13 },
  md: { label: 10, value: 16 },
  lg: { label: 12, value: 22 },
};

function StatBadge({ label, value, color, size = 'md' }: StatBadgeProps): JSX.Element {
  const sz = SIZES[size];
  return (
    <div className="flex flex-col items-center gap-px">
      <div
        style={{
          fontSize: sz.label,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          lineHeight: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: sz.value,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: color ?? 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default StatBadge;
