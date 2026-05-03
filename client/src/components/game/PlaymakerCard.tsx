import type { PlaymakerVisualVariant } from './gameUi.types';

export interface PlaymakerCardProps {
  name: string;
  /** Short affinity line, e.g. "Pass S · Run In" */
  affinityLabel: string;
  variant: PlaymakerVisualVariant;
  onClick?: () => void;
  className?: string;
}

function PlaymakerCard({ name, affinityLabel, variant, onClick, className = '' }: PlaymakerCardProps) {
  const isSelected = variant === 'selected';
  const interactive = Boolean(onClick);

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
      className={`flex min-h-[5.5rem] min-w-[5.5rem] max-w-[7rem] flex-col rounded border-2 p-2 shadow-sm sm:min-h-[6.25rem] sm:min-w-[6.5rem] sm:max-w-[8rem] sm:p-2.5 ${interactive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--cream)]' : ''} ${className}`}
      style={{
        borderColor: isSelected ? 'var(--gold)' : 'var(--gold-mid)',
        backgroundColor: 'var(--white)',
        backgroundImage: isSelected
          ? 'linear-gradient(180deg, var(--white) 0%, rgba(184,148,47,0.12) 100%)'
          : 'linear-gradient(180deg, var(--white) 0%, rgba(184,148,47,0.06) 100%)',
        boxShadow: isSelected ? '0 0 0 1px var(--gold)' : undefined,
      }}
    >
      <span
        className="mb-1 text-[9px] font-bold uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--gold)' }}
      >
        PM
      </span>
      <p
        className="mb-1 line-clamp-2 text-sm font-medium leading-tight sm:text-base"
        style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
      >
        {name}
      </p>
      <p
        className="mt-auto line-clamp-2 text-[10px] leading-snug sm:text-xs"
        style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--muted)' }}
      >
        {affinityLabel}
      </p>
    </div>
  );
}

export default PlaymakerCard;
