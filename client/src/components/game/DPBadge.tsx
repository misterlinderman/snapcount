export type DPBadgeSize = 'sm' | 'md' | 'lg';

export interface DPBadgeProps {
  value: number;
  size?: DPBadgeSize;
}

const SIZES: Record<DPBadgeSize, { px: number; py: number; fontSize: number }> = {
  sm: { px: 6, py: 3, fontSize: 10 },
  md: { px: 10, py: 5, fontSize: 13 },
  lg: { px: 14, py: 7, fontSize: 16 },
};

function DPBadge({ value, size = 'md' }: DPBadgeProps): JSX.Element {
  const s = SIZES[size];
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full"
      style={{
        background: 'var(--gold-subtle)',
        border: '1px solid var(--gold-dim)',
        padding: `${s.py}px ${s.px}px`,
      }}
    >
      <span style={{ fontSize: s.fontSize - 1, color: 'var(--gold)' }} aria-hidden>
        ⬡
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: s.fontSize,
          color: 'var(--gold)',
        }}
      >
        {value} DP
      </span>
    </div>
  );
}

export default DPBadge;
