import type { CardType } from '../types';

export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'legendary';
export type PlaymakerRarity = 'starter' | 'recruit-uncommon' | 'recruit-rare';

/** Plain shape written by seed / admin; maps to `ICard` without Mongoose fields. */
export interface SeedCard {
  _id: string;
  side: 'offense' | 'defense';
  type: CardType;
  name: string;
  basePower: number;
  notes?: string;
  rarity: CardRarity;
  draftCost?: number;
  isActive: boolean;
}

export interface SeedPlaymaker {
  _id: string;
  side: 'offense' | 'defense';
  position: string;
  name: string;
  baseBoost: number;
  affinityTypes: CardType[];
  rarity: PlaymakerRarity;
  recruitCost?: number;
  specialEffect?: string;
  isActive: boolean;
}

export interface SeedUpgrade {
  _id: string;
  baseCardId: string;
  name: string;
  effect: {
    powerOverride?: number;
    bonusVs?: { type: CardType; bonus: number };
    sideEffect?: string;
  };
  dpCost: number;
  isActive: boolean;
}
