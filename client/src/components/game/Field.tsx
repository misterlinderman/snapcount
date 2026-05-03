export interface FieldProps {
  /** Absolute yard line 0–100 (engine field position). */
  ballYard: number;
  className?: string;
}

function clampYard(y: number): number {
  return Math.max(0, Math.min(100, y));
}

/**
 * Horizontal turf strip with ball marker (`left: %`) and yard ticks.
 */
function Field({ ballYard, className = '' }: FieldProps) {
  const pct = clampYard(ballYard);
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative h-12 w-full overflow-hidden rounded-sm border sm:h-14"
        style={{
          borderColor: 'var(--green-turf)',
          background: `linear-gradient(180deg, var(--green-field) 0%, var(--green-turf) 55%, var(--green-field) 100%)`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        {/* subtle yard stripes */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 9.5%, rgba(255,255,255,0.07) 10%)',
          }}
        />

        {/* Ball marker */}
        <div
          className="absolute bottom-0 top-0 z-10 flex w-0 flex-col items-center justify-end pb-1"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className="h-0 w-0 border-x-[7px] border-b-[10px] border-x-transparent sm:border-x-8 sm:border-b-[12px]"
            style={{ borderBottomColor: 'var(--gold)' }}
            aria-hidden
          />
          <span
            className="mt-0.5 rounded px-1 py-px text-[9px] font-bold tabular-nums sm:text-[10px]"
            style={{
              backgroundColor: 'var(--ink)',
              color: 'var(--cream)',
              fontFamily: 'var(--font-playfair-sc)',
            }}
          >
            {Math.round(pct)}
          </span>
        </div>
      </div>

      {/* Yard labels */}
      <div className="relative mt-1 h-4 w-full text-[9px] sm:text-[10px]" aria-hidden>
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0 -translate-x-1/2 tabular-nums"
            style={{ left: `${t}%`, color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Field;
