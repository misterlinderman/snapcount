import Card from './Card';
import PlaymakerCard from './PlaymakerCard';
import type { CardVariant } from './Card';
import type { PlaymakerVisualVariant } from './gameUi.types';

export interface HandCardSlot {
  id: string;
  cardType: string;
  name: string;
  power: number;
  variant: CardVariant;
}

export interface HandProps {
  cards: HandCardSlot[];
  playmaker: {
    name: string;
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
function Hand({ cards, playmaker, onCardSelect, onPlaymakerClick, className = '' }: HandProps) {
  return (
    <div className={`flex flex-wrap items-stretch justify-center gap-2 sm:gap-3 ${className}`}>
      {cards.map((c) => (
        <Card
          key={c.id}
          cardType={c.cardType}
          name={c.name}
          power={c.power}
          variant={c.variant}
          onClick={onCardSelect ? () => onCardSelect(c.id) : undefined}
        />
      ))}
      <PlaymakerCard
        name={playmaker.name}
        affinityLabel={playmaker.affinityLabel}
        variant={playmaker.variant}
        onClick={onPlaymakerClick}
      />
    </div>
  );
}

export default Hand;
