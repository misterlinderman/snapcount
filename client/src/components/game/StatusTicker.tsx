export interface StatusTickerProps {
  liveLine: string;
  lastLine: string;
  className?: string;
}

/**
 * Two-row wire / ticker: LIVE + LAST PLAY.
 */
function StatusTicker({ liveLine, lastLine, className = '' }: StatusTickerProps) {
  return (
    <div
      className={`border-b ${className}`}
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex gap-2 border-b px-[var(--shell-pad-x)] py-2 sm:py-2.5"
        style={{ borderColor: 'var(--rule)' }}
      >
        <span
          className="shrink-0 pt-0.5 text-[10px] font-bold uppercase leading-none tracking-widest"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--red)' }}
        >
          Live
        </span>
        <p
          className="min-w-0 flex-1 text-sm leading-snug sm:text-base"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontStyle: 'italic' }}
        >
          {liveLine}
        </p>
      </div>
      <div className="flex gap-2 px-[var(--shell-pad-x)] py-2 sm:py-2.5">
        <span
          className="shrink-0 pt-0.5 text-[10px] font-bold uppercase leading-none tracking-widest"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--muted)' }}
        >
          Last
        </span>
        <p
          className="min-w-0 flex-1 text-sm leading-snug opacity-90 sm:text-base"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}
        >
          {lastLine}
        </p>
      </div>
    </div>
  );
}

export default StatusTicker;
