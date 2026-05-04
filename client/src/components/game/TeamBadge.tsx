export interface TeamBadgeProps {
  name: string;
  record?: string;
  score: number;
  color: string;
  logo: string;
  align?: 'left' | 'right';
}

function TeamBadge({ name, record, score, color, logo, align = 'left' }: TeamBadgeProps): JSX.Element {
  const isRight = align === 'right';
  return (
    <div className={`flex items-center gap-2 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base sm:h-10 sm:w-10 sm:text-lg"
        style={{
          background: `${color}22`,
          border: `2px solid ${color}`,
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          color,
        }}
      >
        {logo}
      </div>
      <div style={{ textAlign: isRight ? 'right' : 'left' }}>
        <div
          className="max-w-[6.5rem] truncate text-xs font-bold tracking-wide sm:max-w-[8rem] sm:text-sm"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '0.04em' }}
        >
          {name}
        </div>
        {record ? (
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {record}
          </div>
        ) : null}
      </div>
      <div
        className={`tabular-nums text-2xl font-black leading-none sm:text-4xl ${isRight ? 'mr-1' : 'ml-1'}`}
        style={{ fontFamily: 'var(--font-display)', color }}
      >
        {score}
      </div>
    </div>
  );
}

export default TeamBadge;
