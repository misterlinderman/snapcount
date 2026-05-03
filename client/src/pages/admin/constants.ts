import type { CardRarity, CardType, PlaymakerRarity } from '@/game/types';

/** Offense rows shown on the admin matchup grid (7 × defensive fronts). */
export const MATCHUP_OFFENSE_ROWS: CardType[] = [
  'run-in',
  'run-out',
  'pass-s',
  'pass-m',
  'pass-d',
  'option',
  'rogue',
];

/** Defensive columns on that grid. */
export const MATCHUP_DEFENSE_COLS: CardType[] = ['run-d', 'zone', 'man', 'blitz', 'prevent'];

export const ALL_CARD_TYPES: CardType[] = [
  'run-in',
  'run-out',
  'pass-s',
  'pass-m',
  'pass-d',
  'option',
  'rogue',
  'run-d',
  'zone',
  'man',
  'blitz',
  'prevent',
];

export const CARD_RARITIES: CardRarity[] = ['starter', 'common', 'uncommon', 'rare', 'legendary'];

export const PLAYMAKER_RARITIES: PlaymakerRarity[] = ['starter', 'recruit-uncommon', 'recruit-rare'];
