import type {
  Card,
  DeckForEngine,
  GameAction,
  GameContent,
  GameEvent,
  GameState,
  HandState,
  Playmaker,
  ResolvedCard,
  RNG,
  Side,
  SnapResult,
  Team,
  Upgrade,
} from '../types';
import {
  chooseFromArray,
  cpuPickCards,
  fieldGoalMakeProbability,
  getEffectivePower,
  getMatchupModifier,
  isHailMaryCard,
  shuffleInPlace,
  tendencyPenaltyTriggered,
  yardsFromMargin,
} from './helpers';

export type ReducerResult = { state: GameState; events: GameEvent[] };

const PLAYS_PER_QUARTER = 8;

/** Deep-pass INT when margin is strictly worse than −5 (e.g. −6 or lower for integer margins). */
const INT_PASS_MARGIN_THRESHOLD = -5;

/** Strip or big defensive win on an inside/outside run → fumble at the spot (after play yards). */
const FUMBLE_RUN_MARGIN_CAP = -8;

function driveDir(team: Team): 1 | -1 {
  return team === 'red' ? 1 : -1;
}

function flipPossession(team: Team): Team {
  return team === 'red' ? 'blue' : 'red';
}

function userOffenseSide(state: GameState): boolean {
  return state.possession === state.playerSide;
}

function matchupLabelKey(off: string, def: string): string {
  return `${off}|${def}`;
}

function dealSide(side: Side, content: GameContent, rng: RNG): HandState {
  const pool = [...content.cards.values()]
    .filter((c) => c.side === side && c.isActive)
    .map((c) => c._id);
  shuffleInPlace(pool, rng);
  const cards = pool.slice(0, Math.min(4, pool.length));
  const pmPool = [...content.playmakers.values()]
    .filter((p) => p.side === side && p.isActive)
    .map((p) => p._id);
  if (pmPool.length === 0) {
    throw new Error(`dealSide: no active playmakers for ${side}`);
  }
  return {
    cards,
    playmaker: chooseFromArray(pmPool, rng),
    selectedCardId: undefined,
    selectedPM: undefined,
  };
}

function assertInHand(hand: HandState, cardId: string, playmakerId: string): void {
  if (!hand.cards.includes(cardId)) {
    throw new Error('resolveSnap/select: card not in hand');
  }
  if (hand.playmaker !== playmakerId) {
    throw new Error('resolveSnap/select: playmaker does not match hand');
  }
}

function buildResolved(
  card: Card,
  playmaker: Playmaker,
  effectiveBeforeMatchup: number,
  matchupModifier: number,
  role: 'offense' | 'defense'
): ResolvedCard {
  const finalPower =
    role === 'offense' ? effectiveBeforeMatchup + matchupModifier : effectiveBeforeMatchup - matchupModifier;
  return {
    cardId: card._id,
    side: card.side,
    type: card.type,
    name: card.name,
    playmakerId: playmaker._id,
    basePower: card.basePower,
    effectivePower: effectiveBeforeMatchup,
    finalPower,
  };
}

function dealSideFromDeck(side: Side, content: GameContent, deck: DeckForEngine, rng: RNG): HandState {
  const rows = side === 'offense' ? deck.offense : deck.defense;
  const pool: string[] = [];
  for (const row of rows) {
    const c = content.cards.get(row.cardId);
    if (!c || c.side !== side || !c.isActive) {
      continue;
    }
    const n = Math.max(1, row.count);
    for (let i = 0; i < n; i++) {
      pool.push(row.cardId);
    }
  }
  shuffleInPlace(pool, rng);
  const cards = pool.slice(0, Math.min(4, pool.length));
  const pmIds = side === 'offense' ? deck.offPlaymakers : deck.defPlaymakers;
  const pmPool = pmIds.filter((id) => {
    const p = content.playmakers.get(id);
    return p && p.side === side && p.isActive;
  });
  if (pmPool.length === 0) {
    throw new Error(`dealSideFromDeck: no active playmakers for ${side} in deck`);
  }
  return {
    cards,
    playmaker: chooseFromArray(pmPool, rng),
    selectedCardId: undefined,
    selectedPM: undefined,
  };
}

export function dealHand(state: GameState, content: GameContent, rng: RNG, deck?: DeckForEngine): ReducerResult {
  if (state.gameWinner !== null) {
    return { state, events: [] };
  }
  const uOff = userOffenseSide(state);
  const userSide: Side = uOff ? 'offense' : 'defense';
  const cpuSide: Side = uOff ? 'defense' : 'offense';
  const hand = deck
    ? dealSideFromDeck(userSide, content, deck, rng)
    : dealSide(userSide, content, rng);
  const cpu = deck ? dealSideFromDeck(cpuSide, content, deck, rng) : dealSide(cpuSide, content, rng);
  return {
    state: { ...state, hand, cpu },
    events: [],
  };
}

export function selectCard(state: GameState, cardId: string): ReducerResult {
  if (!state.hand.cards.includes(cardId)) {
    throw new Error('selectCard: card not in hand');
  }
  return {
    state: { ...state, hand: { ...state.hand, selectedCardId: cardId } },
    events: [],
  };
}

export function selectPM(state: GameState, playmakerId: string): ReducerResult {
  if (state.hand.playmaker !== playmakerId) {
    throw new Error('selectPM: playmaker not in hand');
  }
  return {
    state: { ...state, hand: { ...state.hand, selectedPM: playmakerId } },
    events: [],
  };
}

export function redraw(state: GameState, content: GameContent, rng: RNG, deck?: DeckForEngine): ReducerResult {
  if (state.gameWinner !== null) {
    return { state, events: [] };
  }
  if (state.pendingAdvance !== null) {
    throw new Error('redraw: resolve the current play first');
  }
  if (state.redrawUsedThisPossession) {
    throw new Error('redraw: only one redraw per possession');
  }
  if (state.dp < 1) {
    throw new Error('redraw: insufficient DP');
  }
  return dealHand(
    { ...state, dp: state.dp - 1, redrawUsedThisPossession: true },
    content,
    rng,
    deck
  );
}

function upgradePlayed(
  deck: DeckForEngine | undefined,
  content: GameContent,
  cardId: string,
  isUsersCard: boolean,
  userOnOffense: boolean
): Upgrade | undefined {
  if (!deck) {
    return undefined;
  }
  const rowSide: Side = isUsersCard === userOnOffense ? 'offense' : 'defense';
  const rows = rowSide === 'offense' ? deck.offense : deck.defense;
  const row = rows.find((r) => r.cardId === cardId);
  if (!row?.upgradeId) {
    return undefined;
  }
  return content.upgrades.get(row.upgradeId);
}

export function resolveSnap(
  state: GameState,
  _action: Extract<GameAction, { type: 'SNAP' }>,
  content: GameContent,
  rng: RNG,
  deck?: DeckForEngine
): ReducerResult {
  if (state.gameWinner !== null) {
    return { state, events: [] };
  }
  if (state.pendingAdvance !== null) {
    throw new Error('resolveSnap: advance pending play first');
  }
  const cid = state.hand.selectedCardId;
  const pmid = state.hand.selectedPM;
  if (cid === undefined || pmid === undefined) {
    throw new Error('resolveSnap: select card and playmaker first');
  }
  assertInHand(state.hand, cid, pmid);

  const offenseIsUser = userOffenseSide(state);
  const cpuPlay = cpuPickCards(
    state.cpu,
    state.hand,
    !offenseIsUser,
    content,
    rng,
    state.perGameBuffs
  );
  assertInHand(state.cpu, cpuPlay.cardId, cpuPlay.playmakerId);

  let offCard: Card;
  let offPM: Playmaker;
  let defCard: Card;
  let defPM: Playmaker;

  if (offenseIsUser) {
    offCard = content.cards.get(cid)!;
    offPM = content.playmakers.get(pmid)!;
    defCard = content.cards.get(cpuPlay.cardId)!;
    defPM = content.playmakers.get(cpuPlay.playmakerId)!;
  } else {
    offCard = content.cards.get(cpuPlay.cardId)!;
    offPM = content.playmakers.get(cpuPlay.playmakerId)!;
    defCard = content.cards.get(cid)!;
    defPM = content.playmakers.get(pmid)!;
  }

  if (!offCard || !defCard || !offPM || !defPM) {
    throw new Error('resolveSnap: unknown catalog id');
  }

  const offUpgrade = offenseIsUser
    ? upgradePlayed(deck, content, cid, true, true)
    : upgradePlayed(deck, content, cpuPlay.cardId, false, false);
  const defUpgrade = offenseIsUser
    ? upgradePlayed(deck, content, cpuPlay.cardId, false, true)
    : upgradePlayed(deck, content, cid, true, false);

  let offenseEff = getEffectivePower(offCard, offPM, content, state.perGameBuffs, {
    defenseCard: defCard,
    appliedUpgrade: offUpgrade,
  });
  if (isHailMaryCard(offCard)) {
    offenseEff = rng() < 0.5 ? 20 : 0;
  }

  const defenseEff = getEffectivePower(defCard, defPM, content, state.perGameBuffs, {
    appliedUpgrade: defUpgrade,
  });

  const matchupModifier = getMatchupModifier(offCard.type, defCard.type, content.matchups);
  const offFinalRaw = offenseEff + matchupModifier;
  const defFinalRaw = defenseEff - matchupModifier;
  let margin = offFinalRaw - defFinalRaw;

  if (offCard.type === 'option') {
    margin += chooseFromArray([-3, 0, 3], rng);
  }

  let yards = yardsFromMargin(margin);
  if (tendencyPenaltyTriggered(state.lastThreeTypes, offCard.type)) {
    yards -= 5;
  }

  const label =
    content.matchups.labels[matchupLabelKey(offCard.type, defCard.type)] ?? '';

  const offenseResolved = buildResolved(offCard, offPM, offenseEff, matchupModifier, 'offense');
  const defenseResolved = buildResolved(defCard, defPM, defenseEff, matchupModifier, 'defense');

  const interception =
    offCard.type === 'pass-d' && margin < INT_PASS_MARGIN_THRESHOLD && !isHailMaryCard(offCard);
  const fumble =
    !interception &&
    (offCard.type === 'run-in' || offCard.type === 'run-out') &&
    margin <= FUMBLE_RUN_MARGIN_CAP;

  const events: GameEvent[] = [];
  events.push({
    type: 'PLAY_RESOLVED',
    offense: offenseResolved,
    defense: defenseResolved,
    matchupLabel: label,
    yards,
  });

  let scoreRed = state.scoreRed;
  let scoreBlue = state.scoreBlue;
  let ballYard = state.ballYard;
  let possession = state.possession;
  let down = state.down;
  let yardsToGo = state.yardsToGo;
  let quarter = state.quarter;
  let totalDowns = state.totalDowns + 1;
  let gameWinner: Team | null = state.gameWinner;
  const lastThreeTypes = [...state.lastThreeTypes, offCard.type].slice(-3);

  const offensiveTeam = state.possession;
  const los = state.ballYard;
  const dir = driveDir(offensiveTeam);

  if (!interception && !fumble) {
    ballYard = los + dir * yards;
    const td = touchdownFromYardLine(ballYard, offensiveTeam);
    if (td) {
      if (offensiveTeam === 'red') scoreRed += 7;
      else scoreBlue += 7;
      events.push({ type: 'TOUCHDOWN', team: offensiveTeam });
      possession = flipPossession(offensiveTeam);
      ballYard = 50;
      down = 1;
      yardsToGo = 10;
    } else {
      const convert = margin >= 0 && yards >= yardsToGo;
      if (state.down === 4 && !convert) {
        events.push({ type: 'TURNOVER_ON_DOWNS' });
        possession = flipPossession(offensiveTeam);
        down = 1;
        yardsToGo = 10;
      } else if (margin >= 0) {
        if (yards >= yardsToGo) {
          down = 1;
          yardsToGo = 10;
          events.push({ type: 'FIRST_DOWN' });
        } else {
          down = clampDown(state.down + 1);
          yardsToGo = Math.max(1, yardsToGo - yards);
        }
      } else {
        if (state.down === 4) {
          events.push({ type: 'TURNOVER_ON_DOWNS' });
          possession = flipPossession(offensiveTeam);
          down = 1;
          yardsToGo = 10;
        } else {
          down = clampDown(state.down + 1);
          yardsToGo = Math.min(99, yardsToGo + Math.abs(yards));
        }
      }
    }
  } else if (interception) {
    const np = flipPossession(offensiveTeam);
    possession = np;
    ballYard = los + driveDir(np) * 15;
    events.push({ type: 'INTERCEPTION', spotYard: ballYard });
    down = 1;
    yardsToGo = 10;
  } else if (fumble) {
    ballYard = los + dir * yards;
    events.push({ type: 'FUMBLE', spotYard: ballYard });
    possession = flipPossession(offensiveTeam);
    down = 1;
    yardsToGo = 10;
  }

  if (totalDowns >= PLAYS_PER_QUARTER && gameWinner === null) {
    events.push({ type: 'QUARTER_END', quarter });
    totalDowns = 0;
    if (quarter === 4) {
      const winner: Team = scoreRed > scoreBlue ? 'red' : 'blue';
      gameWinner = winner;
      events.push({ type: 'GAME_END', winner });
    } else {
      quarter = clampQuarter(quarter + 1);
    }
  }

  const filmStudyActive =
    offCard._id.toLowerCase().includes('film-study') || offCard.name.includes('Film Study');

  const snapResult: SnapResult = {
    offense: offenseResolved,
    defense: defenseResolved,
    matchupModifier,
    matchupLabel: label,
    margin,
    yards,
    events: [...events],
  };

  const nextState: GameState = {
    ...state,
    scoreRed,
    scoreBlue,
    ballYard,
    possession,
    down,
    yardsToGo,
    quarter,
    totalDowns,
    hand: { ...state.hand, selectedCardId: undefined, selectedPM: undefined },
    cpu: { ...state.cpu, selectedCardId: undefined, selectedPM: undefined },
    pendingAdvance: snapResult,
    filmStudyActive,
    lastThreeTypes,
    gameWinner,
    redrawUsedThisPossession: possession !== state.possession ? false : state.redrawUsedThisPossession,
    pendingDeckAdds: state.pendingDeckAdds,
  };

  return { state: nextState, events };
}

function clampDown(d: number): 1 | 2 | 3 | 4 {
  if (d <= 1) return 1;
  if (d >= 4) return 4;
  return d as 1 | 2 | 3 | 4;
}

function clampQuarter(q: number): 1 | 2 | 3 | 4 {
  if (q <= 1) return 1;
  if (q >= 4) return 4;
  return q as 1 | 2 | 3 | 4;
}

function touchdownFromYardLine(ballYard: number, offense: Team): boolean {
  if (offense === 'red') return ballYard >= 95;
  return ballYard <= 5;
}

function fgResolved(side: Side, name: string): ResolvedCard {
  return {
    cardId: 'field-goal',
    side,
    type: 'rogue',
    name,
    playmakerId: 'field-goal',
    basePower: 0,
    effectivePower: 0,
    finalPower: 0,
  };
}

export function resolveFieldGoal(
  state: GameState,
  _content: GameContent,
  rng: RNG,
  _deck?: DeckForEngine
): ReducerResult {
  if (state.gameWinner !== null) {
    return { state, events: [] };
  }
  if (state.pendingAdvance !== null) {
    throw new Error('field_goal: advance pending play first');
  }
  if (!userOffenseSide(state)) {
    throw new Error('field_goal: user must be on offense');
  }
  if (state.down !== 4) {
    throw new Error('field_goal: 4th down only');
  }

  const offensiveTeam = state.possession;
  const dist = offensiveTeam === 'red' ? 100 - state.ballYard : state.ballYard;
  const made = dist <= 45 ? true : rng() < fieldGoalMakeProbability(dist);

  let scoreRed = state.scoreRed;
  let scoreBlue = state.scoreBlue;
  let ballYard = state.ballYard;
  let possession = state.possession;
  const down: 1 | 2 | 3 | 4 = 1;
  const yardsToGo = 10;
  const events: GameEvent[] = [];

  if (made) {
    if (offensiveTeam === 'red') scoreRed += 3;
    else scoreBlue += 3;
    events.push({ type: 'FIELD_GOAL_GOOD', team: offensiveTeam });
    possession = flipPossession(offensiveTeam);
    ballYard = 50;
  } else {
    events.push({ type: 'FIELD_GOAL_MISS' });
    possession = flipPossession(offensiveTeam);
  }

  let totalDowns = state.totalDowns + 1;
  let quarter = state.quarter;
  let gameWinner: Team | null = state.gameWinner;

  if (totalDowns >= PLAYS_PER_QUARTER && gameWinner === null) {
    events.push({ type: 'QUARTER_END', quarter });
    totalDowns = 0;
    if (quarter === 4) {
      const winner: Team = scoreRed > scoreBlue ? 'red' : 'blue';
      gameWinner = winner;
      events.push({ type: 'GAME_END', winner });
    } else {
      quarter = clampQuarter(quarter + 1);
    }
  }

  const snapResult: SnapResult = {
    offense: fgResolved('offense', made ? `Good — ${dist} yd FG` : `Miss — ${dist} yd attempt`),
    defense: fgResolved('defense', '—'),
    matchupModifier: 0,
    matchupLabel: made ? 'Field goal good (+3)' : 'Field goal no good — turnover',
    margin: 0,
    yards: made ? 3 : 0,
    events,
    playKind: 'field_goal',
    fieldGoal: { made, distanceYards: dist },
  };

  return {
    state: {
      ...state,
      scoreRed,
      scoreBlue,
      ballYard,
      possession,
      down,
      yardsToGo,
      quarter,
      totalDowns,
      hand: { ...state.hand, selectedCardId: undefined, selectedPM: undefined },
      cpu: { ...state.cpu, selectedCardId: undefined, selectedPM: undefined },
      pendingAdvance: snapResult,
      redrawUsedThisPossession: false,
      gameWinner,
    },
    events,
  };
}

export function nextPlay(state: GameState, content: GameContent, rng: RNG, deck?: DeckForEngine): ReducerResult {
  if (state.pendingAdvance === null) {
    return { state, events: [] };
  }
  const cleared = { ...state, pendingAdvance: null };
  if (cleared.gameWinner !== null) {
    return { state: cleared, events: [] };
  }
  return dealHand(cleared, content, rng, deck);
}

/** TD reward ids from the post-score overlay (deck adds queue for Locker only). */
export type TDRewardId = 'td-power-boost-2' | 'td-star-pm' | 'td-dp-1' | 'td-hail-mary-card';

export function pickTDReward(state: GameState, rewardId: string): ReducerResult {
  switch (rewardId as TDRewardId) {
    case 'td-power-boost-2':
      return {
        state: {
          ...state,
          perGameBuffs: {
            ...state.perGameBuffs,
            powerBoost: state.perGameBuffs.powerBoost + 2,
          },
        },
        events: [],
      };
    case 'td-star-pm':
      return {
        state: {
          ...state,
          perGameBuffs: {
            ...state.perGameBuffs,
            starPMBoost: Math.max(state.perGameBuffs.starPMBoost, 1.8),
          },
        },
        events: [],
      };
    case 'td-dp-1':
      return {
        state: { ...state, dp: state.dp + 1 },
        events: [],
      };
    case 'td-hail-mary-card':
      if (!state.pendingDeckAdds.includes('hail-mary')) {
        return {
          state: {
            ...state,
            pendingDeckAdds: [...state.pendingDeckAdds, 'hail-mary'],
          },
          events: [],
        };
      }
      return { state, events: [] };
    default:
      throw new Error(`pickTDReward: unknown reward ${rewardId}`);
  }
}

export function reduceGame(
  state: GameState,
  action: GameAction,
  content: GameContent,
  rng: RNG,
  deck?: DeckForEngine
): ReducerResult {
  switch (action.type) {
    case 'COIN_TOSS_PICK': {
      const playerSide: Team = action.side === 'offense' ? state.possession : flipPossession(state.possession);
      return { state: { ...state, playerSide }, events: [] };
    }
    case 'DEAL_HAND':
      return dealHand(state, content, rng, deck);
    case 'SELECT_CARD':
      return selectCard(state, action.cardId);
    case 'SELECT_PM':
      return selectPM(state, action.playmakerId);
    case 'REDRAW':
      return redraw(state, content, rng, deck);
    case 'FIELD_GOAL':
      return resolveFieldGoal(state, content, rng, deck);
    case 'SNAP':
      return resolveSnap(state, action, content, rng, deck);
    case 'NEXT_PLAY':
      return nextPlay(state, content, rng, deck);
    case 'PICK_TD_REWARD':
      return pickTDReward(state, action.rewardId);
    default:
      return { state, events: [] };
  }
}
