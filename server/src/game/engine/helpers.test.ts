import { describe, expect, it } from 'vitest';
import type { Card, GameContent, MatchupMatrix, Playmaker, Upgrade } from '../types';
import {
  chooseFromArray,
  getEffectivePower,
  getMatchupModifier,
  PLAYMAKER_MISMATCH_FACTOR,
  shuffleInPlace,
  tendencyPenaltyTriggered,
  yardsFromMargin,
} from './helpers';
import { mulberry32 } from './rng';

const emptyContent: GameContent = {
  cards: new Map(),
  playmakers: new Map(),
  matchups: { matrix: {} as MatchupMatrix['matrix'], labels: {} },
  upgrades: new Map(),
};

function card(partial: Partial<Card> & Pick<Card, '_id' | 'side' | 'type' | 'name' | 'basePower'>): Card {
  return {
    rarity: 'starter',
    isActive: true,
    ...partial,
  };
}

function pm(partial: Partial<Playmaker> & Pick<Playmaker, '_id' | 'side' | 'position' | 'name' | 'baseBoost'>): Playmaker {
  return {
    affinityTypes: [],
    rarity: 'starter',
    isActive: true,
    ...partial,
  };
}

describe('getEffectivePower', () => {
  it('applies full playmaker boost on affinity match', () => {
    const c = card({
      _id: 'slant-route',
      side: 'offense',
      type: 'pass-s',
      name: 'Slant Route',
      basePower: 5,
    });
    const qb = pm({
      _id: 'pm-o-sterling',
      side: 'offense',
      position: 'QB',
      name: 'Sterling',
      baseBoost: 1.5,
      affinityTypes: ['pass-s', 'pass-m'],
    });
    const p = getEffectivePower(c, qb, emptyContent, { powerBoost: 0, starPMBoost: 0 });
    expect(p).toBe(5 * 1.5);
  });

  it('applies mismatch factor when card type is outside affinity', () => {
    const c = card({
      _id: 'hb-dive',
      side: 'offense',
      type: 'run-in',
      name: 'HB Dive',
      basePower: 6,
    });
    const qb = pm({
      _id: 'pm-o-sterling',
      side: 'offense',
      position: 'QB',
      name: 'Sterling',
      baseBoost: 2,
      affinityTypes: ['pass-s'],
    });
    const p = getEffectivePower(c, qb, emptyContent, { powerBoost: 0, starPMBoost: 0 });
    expect(p).toBeCloseTo(6 * 2 * PLAYMAKER_MISMATCH_FACTOR);
  });

  it('adds Sweep Right + RB bonus and powerBoost before multiply', () => {
    const c = card({
      _id: 'sweep-right',
      side: 'offense',
      type: 'run-out',
      name: 'Sweep Right',
      basePower: 5,
    });
    const rb = pm({
      _id: 'pm-o-cannon',
      side: 'offense',
      position: 'RB',
      name: 'Cannon',
      baseBoost: 1.4,
      affinityTypes: ['run-out'],
    });
    const p = getEffectivePower(c, rb, emptyContent, { powerBoost: 2, starPMBoost: 0 });
    expect(p).toBe((5 + 3 + 2) * 1.4);
  });

  it('uses starPMBoost floor when affinity matches', () => {
    const c = card({
      _id: 'slant-route',
      side: 'offense',
      type: 'pass-s',
      name: 'Slant Route',
      basePower: 5,
    });
    const qb = pm({
      _id: 'pm-o-sterling',
      side: 'offense',
      position: 'QB',
      name: 'Sterling',
      baseBoost: 1.5,
      affinityTypes: ['pass-s'],
    });
    const p = getEffectivePower(c, qb, emptyContent, { powerBoost: 0, starPMBoost: 1.8 });
    expect(p).toBe(5 * 1.8);
  });

  it('applies Slant vs Blitz and Hot Route upgrade', () => {
    const off = card({
      _id: 'slant-route',
      side: 'offense',
      type: 'pass-s',
      name: 'Slant Route',
      basePower: 5,
    });
    const defCard = card({
      _id: 'safety-blitz',
      side: 'defense',
      type: 'blitz',
      name: 'Safety Blitz',
      basePower: 7,
    });
    const qb = pm({
      _id: 'pm-o-sterling',
      side: 'offense',
      position: 'QB',
      name: 'Sterling',
      baseBoost: 1,
      affinityTypes: ['pass-s'],
    });
    const hot: Upgrade = {
      _id: 'hot-route',
      baseCardId: 'slant-route',
      name: 'Hot Route',
      effect: {},
      dpCost: 1,
      isActive: true,
    };
    const base = getEffectivePower(off, qb, emptyContent, { powerBoost: 0, starPMBoost: 0 }, { defenseCard: defCard });
    const upgraded = getEffectivePower(
      off,
      qb,
      emptyContent,
      { powerBoost: 0, starPMBoost: 0 },
      { defenseCard: defCard, appliedUpgrade: hot }
    );
    expect(base).toBe((5 + 3) * 1);
    expect(upgraded).toBe((5 + 4) * 1);
  });
});

describe('getMatchupModifier', () => {
  const matrix: MatchupMatrix = {
    matrix: {
      'pass-s': {
        'run-in': 3,
        'run-out': 0,
        'pass-s': 0,
        'pass-m': 0,
        'pass-d': 0,
        option: 0,
        rogue: 0,
        'run-d': 3,
        zone: 1,
        man: -2,
        blitz: 3,
        prevent: 2,
      },
    } as MatchupMatrix['matrix'],
    labels: {},
  };

  it('returns matrix cell for known matchup', () => {
    expect(getMatchupModifier('pass-s', 'blitz', matrix)).toBe(3);
    expect(getMatchupModifier('pass-s', 'man', matrix)).toBe(-2);
  });

  it('returns 0 when offense row is missing', () => {
    expect(getMatchupModifier('rogue', 'blitz', matrix)).toBe(0);
  });

  it('returns 0 when defense column missing in row', () => {
    const sparse: MatchupMatrix = {
      matrix: {
        'run-in': { 'run-d': 0 },
      } as MatchupMatrix['matrix'],
      labels: {},
    };
    expect(getMatchupModifier('run-in', 'blitz', sparse)).toBe(0);
  });
});

describe('yardsFromMargin', () => {
  it('matches GAME_DESIGN formula at margins 1, -1, 0, 5, -5', () => {
    expect(yardsFromMargin(1)).toBe(Math.max(1, Math.round(1 * 1.2 + 2)));
    expect(yardsFromMargin(-1)).toBe(-Math.max(1, Math.round(1)));
    expect(yardsFromMargin(0)).toBe(1);
    expect(yardsFromMargin(5)).toBe(Math.max(1, Math.round(5 * 1.2 + 2)));
    expect(yardsFromMargin(-5)).toBe(-Math.max(1, Math.round(5)));
  });

  it('offense win uses 1.2 scale + 2 then rounds', () => {
    expect(yardsFromMargin(1)).toBe(Math.max(1, Math.round(1 * 1.2 + 2)));
    expect(yardsFromMargin(5)).toBe(Math.max(1, Math.round(5 * 1.2 + 2)));
  });

  it('defense win is negative with |margin| rounded', () => {
    expect(yardsFromMargin(-2.4)).toBe(-Math.max(1, Math.round(2.4)));
    expect(yardsFromMargin(-0.5)).toBe(-1);
  });

  it('tie yields 1 yard', () => {
    expect(yardsFromMargin(0)).toBe(1);
  });
});

describe('tendencyPenaltyTriggered', () => {
  it('is false when history shorter than three', () => {
    expect(tendencyPenaltyTriggered(['run-in', 'run-in'], 'run-in')).toBe(false);
  });

  it('is true only when three prior offensive types match the fourth (same type)', () => {
    expect(tendencyPenaltyTriggered(['pass-s', 'pass-s', 'pass-s'], 'pass-s')).toBe(true);
  });

  it('is false when triple does not equal next', () => {
    expect(tendencyPenaltyTriggered(['pass-s', 'pass-s', 'pass-m'], 'pass-s')).toBe(false);
  });
});

describe('chooseFromArray', () => {
  it('returns first element when rng is 0', () => {
    const rng = (): number => 0;
    expect(chooseFromArray(['a', 'b', 'c'], rng)).toBe('a');
  });

  it('returns last element when rng approaches 1', () => {
    const rng = (): number => 0.999999;
    expect(chooseFromArray(['a', 'b', 'c'], rng)).toBe('c');
  });

  it('throws on empty array', () => {
    expect(() => chooseFromArray([], () => 0.5)).toThrow(/empty array/);
  });

  it('mulberry32 is deterministic for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('shuffleInPlace', () => {
  it('permutes with mulberry32 without throwing', () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffleInPlace(arr, mulberry32(999));
    expect(arr.sort()).toEqual(copy.sort());
  });
});
