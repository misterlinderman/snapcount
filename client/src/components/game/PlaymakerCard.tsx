import type { Side } from '@/game/types';
import type { PlaymakerVisualVariant } from './gameUi.types';
import PlaymakerSilhouette from './PlaymakerSilhouette';

export interface PlaymakerCardProps {
  name: string;
  position: string;
  side: Side;
  /** e.g. 1.5 → shown as ×1.5 */
  multiplier: number;
  /** Short affinity line, e.g. "Pass S · Run In" */
  affinityLabel: string;
  variant: PlaymakerVisualVariant;
  onClick?: () => void;
  className?: string;
}

function formatMult(m: number): string {
  const s = Number.isInteger(m) ? String(m) : String(m);
  return `${s}×`;
}

function PlaymakerCard({
  name,
  position,
  side,
  multiplier,
  affinityLabel,
  variant,
  onClick,
  className = '',
}: PlaymakerCardProps): JSX.Element {
  const isSelected = variant === 'selected';
  const interactive = Boolean(onClick);
  const color = side === 'offense' ? 'var(--blitz-red)' : 'var(--storm-blue)';

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? isSelected : undefined}
      aria-label={interactive ? `Playmaker ${name}` : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`flex w-[5.75rem] shrink-0 flex-col rounded-[var(--radius-md)] border-2 p-2 sm:w-[5.625rem] sm:p-2 ${interactive ? 'cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--bg-deep)]' : ''} ${className}`}
      style={{
        borderColor: isSelected ? 'var(--gold)' : color,
        backgroundColor: 'var(--surface-panel)',
        boxShadow: isSelected ? 'var(--glow-gold)' : undefined,
      }}
    >
      <div
        className="mb-1.5 flex aspect-square w-full items-center justify-center rounded-[var(--radius-sm)]"
        style={{ background: 'var(--bg-raised)' }}
      >
        <PlaymakerSilhouette position={position} side={side} color={color} />
      </div>
      <div
        className="text-center text-[10px] font-bold tracking-wide"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
      >
        {position}
      </div>
      <div
        className="line-clamp-2 text-center text-[9px] leading-tight sm:text-[10px]"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}
      >
        {name}
      </div>
      <div
        className="mt-1 text-center text-xs font-bold sm:text-sm"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)' }}
      >
        {formatMult(multiplier)}
      </div>
      <p
        className="mt-1 line-clamp-2 text-[8px] leading-snug sm:text-[9px]"
        style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', color: 'var(--text-muted)' }}
      >
        {affinityLabel}
      </p>
    </div>
  );
}

export default PlaymakerCard;
