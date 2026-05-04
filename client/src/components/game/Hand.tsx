import Card from './Card';
import PlaymakerCard from './PlaymakerCard';
import type { CardVariant } from './Card';
import type { PlaymakerVisualVariant } from './gameUi.types';
import type { Side } from '@/game/types';

export interface HandCardSlot {
  id: string;
  cardType: string;
  name: string;
  power: number;
  variant: CardVariant;
  basePower?: number;
  rarity?: string;
}

export interface HandProps {
  cards: HandCardSlot[];
  /** User's hand side for card borders + route diagrams. */
  handRole: 'offense' | 'defense';
  playmaker: {
    name: string;
    position: string;
    side: Side;
    multiplier: number;
    affinityLabel: string;
    variant: PlaymakerVisualVariant;
  };
  onCardSelect?: (id: string) => void;
  onPlaymakerClick?: () => void;
  className?: string;
}

/**
 * Row of four play cards plus playmaker slot (mobile-friendly wrap).
 */
function Hand({ cards, handRole, playmaker, onCardSelect, onPlaymakerClick, className = '' }: HandProps): JSX.Element {
  return (
    <div className={`flex flex-wrap items-stretch justify-center gap-2 sm:gap-3 ${className}`}>
      {cards.map((c) => (
        <Card
          key={c.id}
          cardType={c.cardType}
          name={c.name}
          power={c.power}
          variant={c.variant}
          role={handRole}
          basePower={c.basePower}
          rarity={c.rarity}
          onClick={onCardSelect ? () => onCardSelect(c.id) : undefined}
        />
      ))}
      <PlaymakerCard
        name={playmaker.name}
        position={playmaker.position}
        side={playmaker.side}
        multiplier={playmaker.multiplier}
        affinityLabel={playmaker.affinityLabel}
        variant={playmaker.variant}
        onClick={onPlaymakerClick}
      />
    </div>
  );
}

export default Hand;
