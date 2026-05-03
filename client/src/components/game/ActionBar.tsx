export type ActionBarMode = 'snap' | 'next-play';

export interface ActionBarProps {
  mode: ActionBarMode;
  onRedraw: () => void;
  /** Redraw control label (e.g. includes DP cost). */
  redrawLabel?: string;
  /** When false, user can tap Redraw (e.g. not only on next-play). */
  redrawDisabled?: boolean;
  onSnap?: () => void;
  onNextPlay?: () => void;
  showFieldGoal?: boolean;
  onFieldGoal?: () => void;
  fieldGoalDisabled?: boolean;
  /** When true, primary snap action is inactive (e.g. need selection). */
  snapDisabled?: boolean;
  /** When true, Next Play is inactive (e.g. TD reward must be chosen first). */
  nextPlayDisabled?: boolean;
  className?: string;
}

const btnBase =
  'min-h-12 min-w-[44px] flex-1 rounded border px-4 py-3 text-sm font-semibold transition-opacity sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--cream)] disabled:cursor-not-allowed disabled:opacity-45';

/**
 * Sticky bottom bar: Redraw + Snap, or Redraw (disabled) + Next Play.
 */
function ActionBar({
  mode,
  onRedraw,
  redrawLabel = 'Redraw (1 DP)',
  redrawDisabled: redrawDisabledProp,
  onSnap,
  onNextPlay,
  showFieldGoal = false,
  onFieldGoal,
  fieldGoalDisabled = false,
  snapDisabled = false,
  nextPlayDisabled = false,
  className = '',
}: ActionBarProps) {
  const redrawDisabled = redrawDisabledProp ?? mode === 'next-play';

  return (
    <div
      className={`sticky bottom-0 z-40 border-t ${className}`}
      style={{
        borderColor: 'var(--rule)',
        backgroundColor: 'var(--white)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[var(--shell-max-width)] flex-wrap gap-3 px-[var(--shell-pad-x)] py-3"
        role="toolbar"
        aria-label="Play actions"
      >
        <button
          type="button"
          className={btnBase}
          style={{
            fontFamily: 'var(--font-serif)',
            borderColor: 'var(--rule)',
            color: 'var(--ink)',
            backgroundColor: redrawDisabled ? 'var(--cream)' : 'var(--white)',
          }}
          disabled={redrawDisabled}
          onClick={onRedraw}
        >
          {redrawLabel}
        </button>

        {mode === 'snap' && showFieldGoal ? (
          <button
            type="button"
            className={btnBase}
            style={{
              fontFamily: 'var(--font-serif)',
              borderColor: 'var(--rule)',
              color: 'var(--ink)',
              backgroundColor: fieldGoalDisabled ? 'var(--cream)' : 'var(--white)',
            }}
            disabled={fieldGoalDisabled}
            onClick={onFieldGoal}
          >
            Field goal
          </button>
        ) : null}

        {mode === 'snap' ? (
          <button
            type="button"
            className={btnBase}
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--blue)',
              color: 'var(--white)',
              backgroundColor: 'var(--blue)',
            }}
            disabled={snapDisabled}
            onClick={onSnap}
          >
            Snap
          </button>
        ) : (
          <button
            type="button"
            className={btnBase}
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--green-turf)',
              color: 'var(--white)',
              backgroundColor: 'var(--green-field)',
            }}
            disabled={nextPlayDisabled}
            onClick={onNextPlay}
          >
            Next Play
          </button>
        )}
      </div>
    </div>
  );
}

export default ActionBar;
