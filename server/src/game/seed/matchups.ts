import type { CardType } from '../types';

/** Defensive columns in GAME_DESIGN matchup table. */
export type DefFront = 'run-d' | 'zone' | 'man' | 'blitz' | 'prevent';

/** Offense rows in the admin matchup grid (7 × defensive fronts). */
export const MATCHUP_OFFENSE_ROWS = [
  'run-in',
  'run-out',
  'pass-s',
  'pass-m',
  'pass-d',
  'option',
  'rogue',
] as const;

/** Defense columns in that grid. */
export const MATCHUP_DEFENSE_COLS: readonly DefFront[] = ['run-d', 'zone', 'man', 'blitz', 'prevent'];

export const MATCHUP_MATRIX: Record<CardType, Record<DefFront, number>> = {
  'run-in': { 'run-d': 0, zone: 4, man: 3, blitz: 1, prevent: 3 },
  'run-out': { 'run-d': -2, zone: 4, man: 2, blitz: 1, prevent: 2 },
  'pass-s': { 'run-d': 3, zone: 1, man: -2, blitz: 3, prevent: 2 },
  'pass-m': { 'run-d': 4, zone: 0, man: 1, blitz: 2, prevent: 2 },
  'pass-d': { 'run-d': 5, zone: 0, man: 2, blitz: 4, prevent: 0 },
  option: { 'run-d': 1, zone: 2, man: 1, blitz: 1, prevent: 2 },
  rogue: { 'run-d': 0, zone: 0, man: 0, blitz: 0, prevent: 0 },
  'run-d': { 'run-d': 0, zone: 0, man: 0, blitz: 0, prevent: 0 },
  zone: { 'run-d': 0, zone: 0, man: 0, blitz: 0, prevent: 0 },
  man: { 'run-d': 0, zone: 0, man: 0, blitz: 0, prevent: 0 },
  blitz: { 'run-d': 0, zone: 0, man: 0, blitz: 0, prevent: 0 },
  prevent: { 'run-d': 0, zone: 0, man: 0, blitz: 0, prevent: 0 },
};

export const MATCHUP_LABELS: Record<string, string> = {
  'pass-s|blitz': 'Screen destroys the blitz!',
  'pass-d|blitz': 'Shot play over the pressure!',
  'run-in|zone': 'Inside run eats the zone.',
  'pass-s|man': 'Quick game fights tight man.',
  'run-out|run-d': 'The edge crashes into the box.',
  'pass-m|run-d': 'Play-action wins against stacked fronts.',
  'option|run-d': 'Option freezes the linebackers.',
  'pass-d|prevent': 'Prevent keeps everything in front.',
};

export const MATCHUP_SEED_VERSION = 1;
