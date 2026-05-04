import type { GameCardTypeSlug } from './gameUi.types';
import { badgeClassForCardType, playCardSubtypeLabel, shortTypeLabel } from './gameUi.types';
import { RouteDiagramDefense, RouteDiagramOffense, RouteDiagramRogue } from './RouteDiagrams';

export type CardVariant = 'selectable' | 'selected' | 'cpu-hidden' | 'cpu-revealed';

export interface CardProps {
  cardType: GameCardTypeSlug | string;
  name: string;
  /** Effective or base power; use string for "?" when hidden. */
  power: number | string;
  variant: CardVariant;
  /** User's current hand side — sets border + diagram family. */
  role: 'offense' | 'defense';
  basePower?: number;
  /** Catalog rarity for top accent bar. */
  rarity?: string;
  onClick?: () => void;
  className?: string;
}

function rarityAccentColor(cardType: string, rarity?: string): string {
  if (cardType === 'rogue') return 'var(--rarity-rogue)';
  if (rarity === 'rare' || rarity === 'legendary') return 'var(--rarity-rare)';
  if (rarity === 'uncommon') return 'var(--rarity-uncommon)';
  return 'var(--rarity-common)';
}

function Card({
  cardType,
  name,
  power,
  variant,
  role,
  basePower,
  rarity,
  onClick,
  className = '',
}: CardProps): JSX.Element {
  const badgeClass = badgeClassForCardType(cardType);
  const hidden = variant === 'cpu-hidden';
  const isSelected = variant === 'selected';
  const isRogue = cardType === 'rogue';

  const teamBorder = isRogue ? 'var(--rogue-purple)' : role === 'offense' ? 'var(--blitz-red)' : 'var(--storm-blue)';
  const borderColor = isSelected ? 'var(--gold)' : teamBorder;
  const bg = hidden ? 'var(--bg-raised)' : 'var(--surface-panel)';
  const opacity = hidden ? 0.92 : 1;

  const interactive = Boolean(onClick) && (variant === 'selectable' || isSelected || variant === 'cpu-revealed');

  const powerDisplay = hidden ? '?' : power;
  const baseDisplay = hidden ? '—' : basePower ?? (typeof power === 'number' ? power : power);
  const accent = rarityAccentColor(cardType, rarity);
  const showRareChip = (rarity === 'rare' || rarity === 'legendary') && !hidden;
  const subtype = playCardSubtypeLabel(cardType);

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
      className={`relative flex min-h-[7.5rem] min-w-[4.75rem] flex-1 flex-col gap-1 rounded-[var(--radius-lg)] border-2 p-2 sm:min-h-[8.25rem] sm:min-w-[5.5rem] sm:gap-1.5 sm:p-2.5 ${interactive ? 'cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[var(--glow-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--bg-deep)]' : ''} ${className}`}
      style={{
        borderColor,
        backgroundColor: bg,
        opacity,
        boxShadow: isSelected ? 'var(--glow-gold)' : undefined,
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="absolute left-2 right-2 top-0 h-0.5 rounded-sm"
        style={{ background: accent }}
        aria-hidden
      />

      <div className="mt-1 flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className={`game-card-badge shrink-0 ${badgeClass}`} style={hidden ? { opacity: 0.4 } : undefined}>
            {hidden ? '—' : shortTypeLabel(cardType)}
          </span>
          <div
            className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase leading-none tracking-wide sm:text-xs"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {hidden ? '•••' : name}
          </div>
          {isRogue && !hidden ? (
            <span className="shrink-0 text-[7px] font-bold tracking-widest" style={{ color: 'var(--rarity-rogue)' }}>
              ROGUE
            </span>
          ) : null}
          {showRareChip ? (
            <span className="shrink-0 text-[7px] font-bold tracking-widest" style={{ color: 'var(--rarity-rare)' }}>
              RARE
            </span>
          ) : null}
        </div>
        <div
          className="text-[8px] uppercase tracking-wider sm:text-[10px]"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}
        >
          {hidden ? '—' : subtype}
        </div>
      </div>

      <div
        className="flex min-h-[2.25rem] flex-1 items-center justify-center rounded sm:min-h-[3.5rem]"
        style={{ background: 'var(--bg-deep)', borderRadius: 'var(--radius-sm)' }}
      >
        {hidden ? (
          <span className="text-xs text-[var(--text-muted)]">?</span>
        ) : isRogue ? (
          <RouteDiagramRogue cardName={name} compact />
        ) : role === 'offense' ? (
          <RouteDiagramOffense cardType={cardType} compact />
        ) : (
          <RouteDiagramDefense cardType={cardType} compact />
        )}
      </div>

      <div className="mt-0.5 flex items-end justify-between">
        <div
          className="text-xl font-black tabular-nums leading-none sm:text-3xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          {powerDisplay}
        </div>
        <div className="text-right">
          <div
            className="text-[7px] uppercase tracking-wider sm:text-[9px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Base
          </div>
          <div
            className="text-[9px] font-semibold tabular-nums sm:text-xs"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}
          >
            {baseDisplay}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Card;
