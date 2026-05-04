import SCButton from '@/components/ui/SCButton';

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

const toolbarBtn = 'min-h-12 min-w-[44px] flex-1 sm:min-h-[3rem]';

/**
 * Sticky bottom bar: Redraw + Snap, or Redraw (disabled) + Next Play (alpha SCButton).
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
}: ActionBarProps): JSX.Element {
  const redrawDisabled = redrawDisabledProp ?? mode === 'next-play';

  return (
    <div
      className={`sticky bottom-0 z-40 border-t ${className}`}
      style={{
        borderColor: 'var(--bg-border)',
        backgroundColor: 'var(--surface-panel)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[var(--shell-max-width)] flex-wrap gap-3 px-[var(--shell-pad-x)] py-3"
        role="toolbar"
        aria-label="Play actions"
      >
        <SCButton
          variant={redrawDisabled ? 'secondary' : 'ghost'}
          size="lg"
          disabled={redrawDisabled}
          onClick={onRedraw}
          className={toolbarBtn}
        >
          {redrawLabel}
        </SCButton>

        {mode === 'snap' && showFieldGoal ? (
          <SCButton
            variant="gold"
            size="lg"
            disabled={fieldGoalDisabled}
            onClick={onFieldGoal}
            className={toolbarBtn}
          >
            Field goal
          </SCButton>
        ) : null}

        {mode === 'snap' ? (
          <SCButton variant="primary" size="lg" disabled={snapDisabled} onClick={onSnap} className={toolbarBtn}>
            Snap
          </SCButton>
        ) : (
          <SCButton
            variant="field"
            size="lg"
            disabled={nextPlayDisabled}
            onClick={onNextPlay}
            className={toolbarBtn}
          >
            Next play
          </SCButton>
        )}
      </div>
    </div>
  );
}

export default ActionBar;
