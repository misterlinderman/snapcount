import FieldStrip from './FieldStrip';

export interface FieldProps {
  /** Absolute yard line 0–100 (engine field position). */
  ballYard: number;
  className?: string;
}

function clampYard(y: number): number {
  return Math.max(0, Math.min(100, y));
}

/**
 * Alpha field strip plus numeric yard ladder (ticks 0–100).
 */
function Field({ ballYard, className = '' }: FieldProps): JSX.Element {
  const pct = clampYard(ballYard);
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className={`w-full ${className}`}>
      <FieldStrip
        ballPosition={pct}
        height={72}
        className="rounded-sm border sm:h-20"
        style={{ borderColor: 'var(--field-green-line)' }}
      />

      <div className="relative mt-1 h-4 w-full text-[9px] sm:text-[10px]" aria-hidden>
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0 -translate-x-1/2 tabular-nums"
            style={{ left: `${t}%`, color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Field;
