import type { GameCardTypeSlug } from './gameUi.types';
import { badgeClassForCardType, shortTypeLabel } from './gameUi.types';

export type CardVariant = 'selectable' | 'selected' | 'cpu-hidden' | 'cpu-revealed';

export interface CardProps {
  cardType: GameCardTypeSlug | string;
  name: string;
  /** Effective or base power; use string for "?" when hidden. */
  power: number | string;
  variant: CardVariant;
  onClick?: () => void;
  className?: string;
}

function Card({ cardType, name, power, variant, onClick, className = '' }: CardProps) {
  const badgeClass = badgeClassForCardType(cardType);
  const hidden = variant === 'cpu-hidden';
  const isSelected = variant === 'selected';
  const lightFace = variant === 'selectable' || isSelected || variant === 'cpu-revealed';

  const borderColor =
    isSelected ? 'var(--gold)' : hidden ? 'var(--muted)' : 'var(--rule)';
  const bg = hidden ? 'var(--ink2)' : 'var(--white)';
  const opacity = hidden ? 0.92 : 1;

  const interactive = Boolean(onClick) && (variant === 'selectable' || isSelected || variant === 'cpu-revealed');

  const powerDisplay = hidden ? '?' : power;

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? isSelected : undefined}
      aria-label={interactive ? `${name}, power ${powerDisplay}` : undefined}
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
      className={`flex min-h-[5.5rem] min-w-[4.5rem] flex-1 flex-col rounded border p-2 shadow-sm sm:min-h-[6.25rem] sm:min-w-[5.25rem] sm:p-2.5 ${interactive ? 'cursor-pointer transition-shadow hover:brightness-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--cream)]' : ''} ${className}`}
      style={{
        borderColor,
        backgroundColor: bg,
        opacity,
        borderWidth: isSelected ? 2 : 1,
        boxShadow: isSelected ? '0 0 0 1px var(--gold-mid)' : undefined,
        color: lightFace ? 'var(--ink)' : 'var(--cream)',
      }}
    >
      <div className="mb-1.5 flex items-start justify-between gap-1">
        <span className={`game-card-badge ${badgeClass}`} style={hidden ? { opacity: 0.5 } : undefined}>
          {hidden ? '—' : shortTypeLabel(cardType)}
        </span>
      </div>
      <p
        className="mb-1 min-h-[2.25rem] flex-1 text-left text-xs leading-tight sm:text-sm"
        style={{
          fontFamily: 'var(--font-playfair)',
          fontStyle: 'italic',
          color: lightFace ? 'var(--ink)' : 'var(--cream)',
        }}
      >
        {hidden ? 'Hidden' : name}
      </p>
      <div className="mt-auto flex items-end justify-between border-t pt-1.5" style={{ borderColor: 'var(--rule)' }}>
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: lightFace ? 'var(--muted)' : 'var(--cream)' }}
        >
          Pwr
        </span>
        <span
          className="text-lg font-semibold tabular-nums sm:text-xl"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            color: lightFace ? 'var(--ink)' : 'var(--gold-mid)',
          }}
        >
          {powerDisplay}
        </span>
      </div>
    </div>
  );
}

export default Card;
