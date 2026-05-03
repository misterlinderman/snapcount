import { describe, expect, it } from 'vitest';
import type { Card, CardType, GameContent, GameState } from '../types';
import { dealHand, nextPlay, pickTDReward, resolveSnap } from './reducers';
import { yardsFromMargin } from './helpers';
import { mulberry32 } from './rng';

const CARD_TYPES: CardType[] = [
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

function zeroMatrix(): GameContent['matchups'] {
  const m = {} as Record<CardType, Record<CardType, number>>;
  for (const o of CARD_TYPES) {
    const row = {} as Record<CardType, number>;
    for (const d of CARD_TYPES) row[d] = 0;
    m[o] = row;
  }
  return { matrix: m, labels: {} };
}

function c(partial: Partial<Card> & Pick<Card, '_id' | 'side' | 'type' | 'name' | 'basePower'>): Card {
  return { rarity: 'starter', isActive: true, ...partial };
}

function baseState(override: Partial<GameState> = {}): GameState {
  return {
    scoreRed: 0,
    scoreBlue: 0,
    quarter: 1,
    totalDowns: 0,
    ballYard: 50,
    possession: 'red',
    down: 1,
    yardsToGo: 10,
    playerSide: 'red',
    hand: { cards: [], playmaker: '' },
    cpu: { cards: [], playmaker: '' },
    pendingAdvance: null,
    filmStudyActive: false,
    lastThreeTypes: [],
    rogueWins: 0,
    rogueGames: 0,
    dp: 0,
    perGameBuffs: { powerBoost: 0, starPMBoost: 0 },
    pendingDeckAdds: [],
    gameWinner: null,
    redrawUsedThisPossession: false,
    ...override,
  };
}

/** Mirror + tie game: margin 0 → 1 offensive yard. */
function balanceContent(): GameContent {
  const cards = new Map<string, Card>([
    [
      'o-bal',
      c({ _id: 'o-bal', side: 'offense', type: 'run-in', name: 'Bal O', basePower: 5 }),
    ],
    [
      'd-bal',
      c({ _id: 'd-bal', side: 'defense', type: 'run-d', name: 'Bal D', basePower: 5 }),
    ],
  ]);
  const playmakers = new Map<string, import('../types').Playmaker>([
    [
      'pm-o',
      {
        _id: 'pm-o',
        side: 'offense',
        position: 'RB',
        name: 'Runner',
        baseBoost: 2,
        affinityTypes: ['run-in'],
        rarity: 'starter',
        isActive: true,
      },
    ],
    [
      'pm-d',
      {
        _id: 'pm-d',
        side: 'defense',
        position: 'LB',
        name: 'Stopper',
        baseBoost: 2,
        affinityTypes: ['run-d'],
        rarity: 'starter',
        isActive: true,
      },
    ],
  ]);
  return { cards, playmakers, matchups: zeroMatrix(), upgrades: new Map() };
}

function tieHands(): Pick<GameState, 'hand' | 'cpu'> {
  return {
    hand: {
      cards: ['o-bal'],
      playmaker: 'pm-o',
      selectedCardId: 'o-bal',
      selectedPM: 'pm-o',
    },
    cpu: { cards: ['d-bal'], playmaker: 'pm-d' },
  };
}

/** Deep pass INT vs stout defense (margin &lt; -5). */
function intContent(): GameContent {
  const cards = new Map<string, Card>([
    [
      'o-deep',
      c({ _id: 'o-deep', side: 'offense', type: 'pass-d', name: 'Deep Shot', basePower: 2 }),
    ],
    [
      'd-wall',
      c({ _id: 'd-wall', side: 'defense', type: 'zone', name: 'Wall', basePower: 40 }),
    ],
  ]);
  const playmakers = new Map<string, import('../types').Playmaker>([
    [
      'pm-o',
      {
        _id: 'pm-o',
        side: 'offense',
        position: 'QB',
        name: 'Passer',
        baseBoost: 1,
        affinityTypes: ['pass-d'],
        rarity: 'starter',
        isActive: true,
      },
    ],
    [
      'pm-d',
      {
        _id: 'pm-d',
        side: 'defense',
        position: 'S',
        name: 'Safety',
        baseBoost: 1,
        affinityTypes: ['zone'],
        rarity: 'starter',
        isActive: true,
      },
    ],
  ]);
  return { cards, playmakers, matchups: zeroMatrix(), upgrades: new Map() };
}

function intHands(): Pick<GameState, 'hand' | 'cpu'> {
  return {
    hand: {
      cards: ['o-deep'],
      playmaker: 'pm-o',
      selectedCardId: 'o-deep',
      selectedPM: 'pm-o',
    },
    cpu: { cards: ['d-wall'], playmaker: 'pm-d' },
  };
}

/** Single run-in card for tendency stacking. */
function runInContent(): GameContent {
  const cards = new Map<string, Card>([
    [
      'o-ri',
      c({ _id: 'o-ri', side: 'offense', type: 'run-in', name: 'Dive', basePower: 5 }),
    ],
    [
      'd-bal',
      c({ _id: 'd-bal', side: 'defense', type: 'run-d', name: 'Bal D', basePower: 5 }),
    ],
  ]);
  const playmakers = new Map<string, import('../types').Playmaker>([
    [
      'pm-o',
      {
        _id: 'pm-o',
        side: 'offense',
        position: 'RB',
        name: 'Runner',
        baseBoost: 2,
        affinityTypes: ['run-in'],
        rarity: 'starter',
        isActive: true,
      },
    ],
    [
      'pm-d',
      {
        _id: 'pm-d',
        side: 'defense',
        position: 'LB',
        name: 'Stopper',
        baseBoost: 2,
        affinityTypes: ['run-d'],
        rarity: 'starter',
        isActive: true,
      },
    ],
  ]);
  return { cards, playmakers, matchups: zeroMatrix(), upgrades: new Map() };
}

function runInHands(): Pick<GameState, 'hand' | 'cpu'> {
  return {
    hand: {
      cards: ['o-ri'],
      playmaker: 'pm-o',
      selectedCardId: 'o-ri',
      selectedPM: 'pm-o',
    },
    cpu: { cards: ['d-bal'], playmaker: 'pm-d' },
  };
}

describe('resolveSnap — touchdowns (GAME_DESIGN field)', () => {
  const content = balanceContent();
  const rng = mulberry32(1);

  it('Red: ball at 93 + margin-0 play (1 yd) → 94, no touchdown', () => {
    const { state } = resolveSnap(
      baseState({
        ...tieHands(),
        ballYard: 93,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 't1' },
      content,
      rng
    );
    expect(state.ballYard).toBe(94);
    expect(state.pendingAdvance?.events.some((e) => e.type === 'TOUCHDOWN')).toBe(false);
  });

  it('Red: ball at 94 + 1 offensive yard → 95, touchdown + possession flip', () => {
    const { state, events } = resolveSnap(
      baseState({
        ...tieHands(),
        ballYard: 94,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 't2' },
      content,
      rng
    );
    expect(state.ballYard).toBe(50);
    expect(state.possession).toBe('blue');
    expect(events.some((e) => e.type === 'TOUCHDOWN')).toBe(true);
    expect(state.scoreRed).toBe(7);
  });

  it('Blue: ball at 7 + 1 yard toward 0 → 6, no touchdown (need ≤5)', () => {
    const { state } = resolveSnap(
      baseState({
        ...tieHands(),
        ballYard: 7,
        possession: 'blue',
        playerSide: 'blue',
      }),
      { type: 'SNAP', playId: 't3' },
      content,
      rng
    );
    expect(state.ballYard).toBe(6);
    expect(state.pendingAdvance?.events.some((e) => e.type === 'TOUCHDOWN')).toBe(false);
  });

  it('Blue: ball at 6 + 1 yard → 5, touchdown', () => {
    const { state, events } = resolveSnap(
      baseState({
        ...tieHands(),
        ballYard: 6,
        possession: 'blue',
        playerSide: 'blue',
      }),
      { type: 'SNAP', playId: 't4' },
      content,
      rng
    );
    expect(state.ballYard).toBe(50);
    expect(events.some((e) => e.type === 'TOUCHDOWN')).toBe(true);
    expect(state.scoreBlue).toBe(7);
  });
});

describe('resolveSnap — interception (15 yards, new possession direction)', () => {
  it('pass-d with margin worse than -5: 15-yard return toward new offense goal', () => {
    const content = intContent();
    const rng = mulberry32(42);
    const { state, events } = resolveSnap(
      baseState({
        ...intHands(),
        ballYard: 50,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 'int1' },
      content,
      rng
    );
    expect(events.some((e) => e.type === 'INTERCEPTION')).toBe(true);
    const intEv = events.find((e) => e.type === 'INTERCEPTION')!;
    expect(intEv.spotYard).toBe(35);
    expect(state.ballYard).toBe(35);
    expect(state.possession).toBe('blue');
  });
});

describe('resolveSnap — 4th down failure', () => {
  it('flips possession at the new spot when offense fails to convert', () => {
    const content = balanceContent();
    const rng = mulberry32(7);
    const los = 40;
    const { state, events } = resolveSnap(
      baseState({
        ...tieHands(),
        ballYard: los,
        down: 4,
        yardsToGo: 10,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 'd4' },
      content,
      rng
    );
    expect(events.some((e) => e.type === 'TURNOVER_ON_DOWNS')).toBe(true);
    expect(state.possession).toBe('blue');
    const y = yardsFromMargin(0);
    expect(y).toBe(1);
    expect(state.ballYard).toBe(los + y);
  });
});

describe('resolveSnap — tendency (third repeat only)', () => {
  it('first three identical run types: +1 yd each; fourth applies −5 to yards', () => {
    const content = runInContent();
    const rng = mulberry32(100);
    let s = baseState({
      ...runInHands(),
      ballYard: 50,
      lastThreeTypes: [],
    });
    for (let i = 0; i < 3; i++) {
      const r = resolveSnap(s, { type: 'SNAP', playId: `r${i}` }, content, rng);
      expect(r.state.pendingAdvance?.yards).toBe(1);
      s = {
        ...r.state,
        pendingAdvance: null,
        ...runInHands(),
      };
    }
    const fourth = resolveSnap(s, { type: 'SNAP', playId: 'r3' }, content, rng);
    expect(fourth.state.pendingAdvance?.yards).toBe(-4);
  });
});

describe('resolveSnap — quarter and game end', () => {
  it('rolls quarter after exactly 8 increments of totalDowns', () => {
    const content = balanceContent();
    const rng = mulberry32(500);
    let s = baseState({
      ...tieHands(),
      quarter: 1,
      totalDowns: 0,
      ballYard: 50,
    });
    let sawQuarterEnd = false;
    for (let i = 0; i < 8; i++) {
      s = { ...s, pendingAdvance: null, ...tieHands() };
      const r = resolveSnap(s, { type: 'SNAP', playId: `q${i}` }, content, rng);
      s = r.state;
      if (r.events.some((e) => e.type === 'QUARTER_END')) sawQuarterEnd = true;
    }
    expect(sawQuarterEnd).toBe(true);
    expect(s.quarter).toBe(2);
    expect(s.totalDowns).toBe(0);
  });

  it('after 8th play of Q4, emits GAME_END and sets gameWinner', () => {
    const content = balanceContent();
    const rng = mulberry32(600);
    let s = baseState({
      ...tieHands(),
      quarter: 4,
      totalDowns: 0,
      ballYard: 50,
      scoreRed: 14,
      scoreBlue: 7,
    });
    let end: import('../types').GameEvent | undefined;
    for (let i = 0; i < 8; i++) {
      s = { ...s, pendingAdvance: null, ...tieHands() };
      const r = resolveSnap(s, { type: 'SNAP', playId: `g${i}` }, content, rng);
      s = r.state;
      end = r.events.find((e) => e.type === 'GAME_END');
    }
    expect(end?.type).toBe('GAME_END');
    if (end?.type === 'GAME_END') {
      expect(end.winner).toBe('red');
    }
    expect(s.gameWinner).toBe('red');
  });
});

describe('resolveSnap — Hail Mary and option (GAME_DESIGN specials)', () => {
  function hmContent(): GameContent {
    const cards = new Map<string, Card>([
      [
        'hail-mary',
        c({ _id: 'hail-mary', side: 'offense', type: 'rogue', name: 'Hail Mary', basePower: 10 }),
      ],
      [
        'd-soft',
        c({ _id: 'd-soft', side: 'defense', type: 'prevent', name: 'Prevent', basePower: 4 }),
      ],
      [
        'o-opt',
        c({ _id: 'o-opt', side: 'offense', type: 'option', name: 'Read Option', basePower: 7 }),
      ],
    ]);
    const playmakers = new Map<string, import('../types').Playmaker>([
      [
        'pm-o',
        {
          _id: 'pm-o',
          side: 'offense',
          position: 'QB',
          name: 'Passer',
          baseBoost: 1,
          affinityTypes: ['rogue', 'option'],
          rarity: 'starter',
          isActive: true,
        },
      ],
      [
        'pm-d',
        {
          _id: 'pm-d',
          side: 'defense',
          position: 'CB',
          name: 'Corner',
          baseBoost: 1,
          affinityTypes: ['prevent'],
          rarity: 'starter',
          isActive: true,
        },
      ],
    ]);
    return { cards, playmakers, matchups: zeroMatrix(), upgrades: new Map() };
  }

  it('Hail Mary: first rng &lt; 0.5 sets offense effective power to 20', () => {
    const content = hmContent();
    let calls = 0;
    const rng = (): number => (calls++ === 0 ? 0.2 : 0.2);
    const { state } = resolveSnap(
      baseState({
        hand: {
          cards: ['hail-mary'],
          playmaker: 'pm-o',
          selectedCardId: 'hail-mary',
          selectedPM: 'pm-o',
        },
        cpu: { cards: ['d-soft'], playmaker: 'pm-d' },
        ballYard: 50,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 'hm1' },
      content,
      rng
    );
    expect(state.pendingAdvance?.offense.effectivePower).toBe(20);
  });

  it('Hail Mary: first rng ≥ 0.5 sets offense effective power to 0', () => {
    const content = hmContent();
    let calls = 0;
    const rng = (): number => (calls++ === 0 ? 0.2 : 0.75);
    const { state } = resolveSnap(
      baseState({
        hand: {
          cards: ['hail-mary'],
          playmaker: 'pm-o',
          selectedCardId: 'hail-mary',
          selectedPM: 'pm-o',
        },
        cpu: { cards: ['d-soft'], playmaker: 'pm-d' },
        ballYard: 50,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 'hm2' },
      content,
      rng
    );
    expect(state.pendingAdvance?.offense.effectivePower).toBe(0);
  });

  it('option play adjusts margin by a value in { −3, 0, +3 }', () => {
    const content = hmContent();
    let i = 0;
    const seq = [0.1, 0.84];
    const rng = (): number => seq[i++];
    const { state } = resolveSnap(
      baseState({
        hand: {
          cards: ['o-opt'],
          playmaker: 'pm-o',
          selectedCardId: 'o-opt',
          selectedPM: 'pm-o',
        },
        cpu: { cards: ['d-soft'], playmaker: 'pm-d' },
        ballYard: 50,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 'opt1' },
      content,
      rng
    );
    const m = state.pendingAdvance?.margin ?? NaN;
    const base = 7 - 4;
    expect([-3, 0, 3]).toContain(m - base);
  });
});

describe('resolveSnap — matchup modifier applied in margin', () => {
  it('uses matrix cell so margin differs from raw power gap', () => {
    const m = zeroMatrix();
    m.matrix['pass-s']['blitz'] = 4;
    const cards = new Map<string, Card>([
      ['slant-route', c({ _id: 'slant-route', side: 'offense', type: 'pass-s', name: 'Slant Route', basePower: 10 })],
      ['d-blitz', c({ _id: 'd-blitz', side: 'defense', type: 'blitz', name: 'Blitz', basePower: 10 })],
    ]);
    const playmakers = new Map<string, import('../types').Playmaker>([
      [
        'pm-o',
        {
          _id: 'pm-o',
          side: 'offense',
          position: 'QB',
          name: 'Q',
          baseBoost: 1,
          affinityTypes: ['pass-s'],
          rarity: 'starter',
          isActive: true,
        },
      ],
      [
        'pm-d',
        {
          _id: 'pm-d',
          side: 'defense',
          position: 'LB',
          name: 'L',
          baseBoost: 1,
          affinityTypes: ['blitz'],
          rarity: 'starter',
          isActive: true,
        },
      ],
    ]);
    const content: GameContent = { cards, playmakers, matchups: m, upgrades: new Map() };
    const { state } = resolveSnap(
      baseState({
        hand: {
          cards: ['slant-route'],
          playmaker: 'pm-o',
          selectedCardId: 'slant-route',
          selectedPM: 'pm-o',
        },
        cpu: { cards: ['d-blitz'], playmaker: 'pm-d' },
        ballYard: 50,
        possession: 'red',
        playerSide: 'red',
      }),
      { type: 'SNAP', playId: 'mx' },
      content,
      mulberry32(3)
    );
    expect(state.pendingAdvance?.matchupModifier).toBe(4);
    expect(state.pendingAdvance?.margin).toBe(10);
  });
});

describe('nextPlay + pickTDReward', () => {
  it('nextPlay clears pendingAdvance and deals a new hand when game continues', () => {
    const content = balanceContent();
    const rng = mulberry32(800);
    const snapped = resolveSnap(
      baseState({ ...tieHands(), ballYard: 50 }),
      { type: 'SNAP', playId: 'n1' },
      content,
      rng
    );
    expect(snapped.state.pendingAdvance).not.toBeNull();
    const after = nextPlay(snapped.state, content, rng);
    expect(after.state.pendingAdvance).toBeNull();
    expect(after.state.hand.cards.length).toBeGreaterThan(0);
  });

  it('pickTDReward queues hail-mary once and bumps perGameBuffs', () => {
    let s = baseState();
    s = pickTDReward(s, 'td-power-boost-2').state;
    expect(s.perGameBuffs.powerBoost).toBe(2);
    s = pickTDReward(s, 'td-hail-mary-card').state;
    expect(s.pendingDeckAdds).toContain('hail-mary');
    s = pickTDReward(s, 'td-hail-mary-card').state;
    expect(s.pendingDeckAdds.filter((id) => id === 'hail-mary').length).toBe(1);
  });
});

describe('dealHand with mulberry32', () => {
  it('produces stable deals for the same seed', () => {
    const content = balanceContent();
    const a = dealHand(baseState(), content, mulberry32(900)).state;
    const b = dealHand(baseState(), content, mulberry32(900)).state;
    expect(a.hand.cards).toEqual(b.hand.cards);
    expect(a.cpu.cards).toEqual(b.cpu.cards);
  });
});
