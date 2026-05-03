import type { SeedUpgrade } from './types';

/** Locker Room Track B — two DP each (GAME_DESIGN). */
export const STARTER_UPGRADES: SeedUpgrade[] = [
  {
    _id: 'power-run',
    baseCardId: 'hb-dive',
    name: 'Power Run',
    effect: { powerOverride: 8 },
    dpCost: 2,
    isActive: true,
  },
  {
    _id: 'hot-route',
    baseCardId: 'slant-route',
    name: 'Hot Route',
    effect: { bonusVs: { type: 'blitz', bonus: 4 } },
    dpCost: 2,
    isActive: true,
  },
  {
    _id: 'touch-pass',
    baseCardId: 'deep-ball',
    name: 'Touch Pass',
    effect: { sideEffect: 'remove-int-risk' },
    dpCost: 2,
    isActive: true,
  },
  {
    _id: 'all-out-blitz',
    baseCardId: 'safety-blitz',
    name: 'All-Out Blitz',
    effect: { powerOverride: 9, sideEffect: 'loss-by-7-plus-ten-yards' },
    dpCost: 2,
    isActive: true,
  },
  {
    _id: 'cover-2-robber',
    baseCardId: 'cover-2',
    name: 'Cover 2 Robber',
    effect: { powerOverride: 7, sideEffect: 'int-chance-deep-loss' },
    dpCost: 2,
    isActive: true,
  },
  {
    _id: 'tunnel-screen',
    baseCardId: 'screen-pass',
    name: 'Tunnel Screen',
    effect: { bonusVs: { type: 'blitz', bonus: 4 } },
    dpCost: 2,
    isActive: true,
  },
];
