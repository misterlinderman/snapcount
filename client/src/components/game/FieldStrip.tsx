import type { CSSProperties } from 'react';

export interface FieldStripProps {
  ballPosition: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const YARDS = [10, 20, 30, 40, 50, 40, 30, 20, 10];

/**
 * Alpha design system field strip: end zones, alternating stripes, gold ball chip.
 */
function FieldStrip({ ballPosition, height = 80, className = '', style }: FieldStripProps): JSX.Element {
  const pct = Math.max(0, Math.min(100, ballPosition));

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        height,
        background: 'var(--field-bg)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-[8%] border-r-2"
        style={{ background: 'var(--field-end-red)', borderColor: 'var(--blitz-red)' }}
      >
        <div
          className="flex h-full items-center justify-center text-[10px] font-black opacity-70"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--blitz-red)',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            letterSpacing: '0.1em',
          }}
        >
          BLITZ
        </div>
      </div>
      <div
        className="absolute right-0 top-0 h-full w-[8%] border-l-2"
        style={{ background: 'var(--field-end-blue)', borderColor: 'var(--storm-blue)' }}
      >
        <div
          className="flex h-full items-center justify-center text-[10px] font-black opacity-70"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--storm-blue)',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            letterSpacing: '0.1em',
          }}
        >
          STORM
        </div>
      </div>

      {YARDS.map((y, i) => (
        <div
          key={i}
          className="pointer-events-none absolute top-0 flex h-full w-px flex-col justify-between"
          style={{
            left: `${8 + (i * 84) / 8}%`,
            background: 'var(--field-line)',
          }}
        >
          <div
            className="pl-0.5 pt-0.5 text-[9px]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--yard-marker)' }}
          >
            {y}
          </div>
          <div
            className="pl-0.5 pb-0.5 text-[9px]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--yard-marker)' }}
          >
            {y}
          </div>
        </div>
      ))}

      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={`s-${i}`}
          className="absolute top-0 h-full"
          style={{
            left: `${8 + (i * 84) / 8}%`,
            width: `${84 / 8}%`,
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}
        />
      ))}

      <div
        className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${8 + pct * 0.84}%` }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 sm:h-8 sm:w-8"
          style={{
            background: 'var(--bg-void)',
            borderColor: 'var(--gold)',
            boxShadow: 'var(--glow-gold)',
          }}
        >
          <span
            className="text-[9px] font-black tabular-nums"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}
          >
            {Math.round(pct)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FieldStrip;
