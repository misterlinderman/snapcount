import type { IDeckCard } from '../models/Deck';
import { STARTER_CARDS } from '../game/seed/cards';
import { STARTER_PLAYMAKERS } from '../game/seed/playmakers';

/**
 * v0.2 opening deck: all catalog cards tagged `rarity: 'starter'` plus opening playmakers per GAME_DESIGN.
 */
export function buildStarterDeckRows(): {
  offense: IDeckCard[];
  defense: IDeckCard[];
  offPlaymakers: string[];
  defPlaymakers: string[];
  cardAcquisitionOrder: string[];
} {
  const offense: IDeckCard[] = STARTER_CARDS.filter((c) => c.side === 'offense' && c.rarity === 'starter').map(
    (c) => ({ cardId: c._id, count: 1 })
  );
  const defense: IDeckCard[] = STARTER_CARDS.filter((c) => c.side === 'defense' && c.rarity === 'starter').map(
    (c) => ({ cardId: c._id, count: 1 })
  );
  const offPlaymakers = STARTER_PLAYMAKERS.filter((p) => p.side === 'offense').map((p) => p._id);
  const defPlaymakers = STARTER_PLAYMAKERS.filter((p) => p.side === 'defense').map((p) => p._id);
  const cardAcquisitionOrder = [...offense.map((r) => r.cardId), ...defense.map((r) => r.cardId)];
  return { offense, defense, offPlaymakers, defPlaymakers, cardAcquisitionOrder };
}
