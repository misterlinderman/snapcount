import type {
  Card,
  CardType,
  GameContent,
  HandState,
  MatchupMatrix,
  Playmaker,
  RNG,
  Upgrade,
} from '../types';

/** Mismatch: still scale the playmaker multiplier by this factor off affinity. */
export const PLAYMAKER_MISMATCH_FACTOR = 0.85;

/**
 * Optional situational inputs for card bonuses that depend on the opponent or deck upgrade.
 * @see docs/game/GAME_DESIGN.md — Card bonuses, Screen + Tunnel Screen, Slant + Hot Route vs Blitz.
 */
export interface GetEffectivePowerOptions {
  /** Defensive card already revealed / chosen (e.g. Slant vs Blitz bonus). */
  defenseCard?: Card;
  /** Upgrade slotted on this card in the active deck, if any. */
  appliedUpgrade?: Upgrade;
}

const MISMATCH_MULT = PLAYMAKER_MISMATCH_FACTOR;

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

function cardIsSweepRight(card: Card): boolean {
  return normalizeId(card._id) === 'sweep-right' || card.name.trim() === 'Sweep Right';
}

function cardIsScreenPass(card: Card): boolean {
  if (normalizeId(card._id) === 'screen-pass') return true;
  return (
    card.type === 'pass-s' &&
    (card.name.includes('Screen') || normalizeId(card._id).includes('screen'))
  );
}

function cardIsSlantRoute(card: Card): boolean {
  return normalizeId(card._id) === 'slant-route' || card.name.trim() === 'Slant Route';
}

function isQb(pm: Playmaker): boolean {
  return pm.position.trim().toUpperCase() === 'QB';
}

function isRb(pm: Playmaker): boolean {
  return pm.position.trim().toUpperCase() === 'RB';
}

function isLb(pm: Playmaker): boolean {
  return pm.position.trim().toUpperCase() === 'LB';
}

function isMlb(pm: Playmaker): boolean {
  const p = pm.position.trim().toUpperCase();
  return p === 'MLB' || p === 'MIKE';
}

function isTunnelScreenUpgrade(u: Upgrade): boolean {
  const id = normalizeId(u._id);
  return id === 'tunnel-screen' || u.name.includes('Tunnel Screen');
}

function isHotRouteUpgrade(u: Upgrade): boolean {
  const id = normalizeId(u._id);
  return id === 'hot-route' || u.name.includes('Hot Route');
}

function cardBonuses(
  card: Card,
  playmaker: Playmaker,
  options: GetEffectivePowerOptions
): number {
  let bonus = 0;

  if (cardIsSweepRight(card) && isRb(playmaker)) {
    bonus += 3;
  }

  if (cardIsScreenPass(card) && isQb(playmaker)) {
    let b = 3;
    if (options.appliedUpgrade && isTunnelScreenUpgrade(options.appliedUpgrade)) {
      b = 4;
    }
    bonus += b;
  }

  if (cardIsSlantRoute(card) && options.defenseCard?.type === 'blitz') {
    let b = 3;
    if (options.appliedUpgrade && isHotRouteUpgrade(options.appliedUpgrade)) {
      b = 4;
    }
    bonus += b;
  }

  if (card.side === 'defense' && card.type === 'blitz' && isLb(playmaker)) {
    bonus += 1;
  }

  if (card.side === 'defense' && card.type === 'run-d' && isMlb(playmaker)) {
    bonus += 2;
  }

  return bonus;
}

function playmakerMultiplier(
  card: Card,
  playmaker: Playmaker,
  perGameBuffs: { starPMBoost: number }
): number {
  const affinity = playmaker.affinityTypes.includes(card.type);
  let mult = affinity ? playmaker.baseBoost : playmaker.baseBoost * MISMATCH_MULT;
  if (affinity && perGameBuffs.starPMBoost > 0) {
    mult = Math.max(mult, perGameBuffs.starPMBoost);
  }
  return mult;
}

/**
 * `(base_power + card_bonuses + power_boost) × playmaker_mult`
 * Card bonuses and affinity rule per docs/game/GAME_DESIGN.md.
 *
 * @param content Reserved for future catalog lookups; pass game content from the route.
 */
export function getEffectivePower(
  card: Card,
  playmaker: Playmaker,
  content: GameContent,
  perGameBuffs: { powerBoost: number; starPMBoost: number },
  options: GetEffectivePowerOptions = {}
): number {
  void content;
  const bonuses = cardBonuses(card, playmaker, options);
  const inner = card.basePower + bonuses + perGameBuffs.powerBoost;
  const mult = playmakerMultiplier(card, playmaker, perGameBuffs);
  return inner * mult;
}

export function getMatchupModifier(
  offCardType: CardType,
  defCardType: CardType,
  matrix: MatchupMatrix
): number {
  const row = matrix.matrix[offCardType] as Record<CardType, number> | undefined;
  if (row == null) return 0;
  const v = row[defCardType];
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

export function yardsFromMargin(margin: number): number {
  if (margin > 0) {
    return Math.max(1, Math.round(margin * 1.2 + 2));
  }
  if (margin < 0) {
    return -Math.max(1, Math.round(Math.abs(margin)));
  }
  return 1;
}

/** True only when the last three offensive types are all the same as `next` (tendency / False Start). */
export function tendencyPenaltyTriggered(lastThreeTypes: CardType[], next: CardType): boolean {
  if (lastThreeTypes.length !== 3) return false;
  return lastThreeTypes[0] === next && lastThreeTypes[1] === next && lastThreeTypes[2] === next;
}

export function chooseFromArray<T>(arr: readonly T[], rng: RNG): T {
  if (arr.length === 0) {
    throw new Error('chooseFromArray: empty array');
  }
  const i = Math.floor(rng() * arr.length);
  const idx = Math.min(arr.length - 1, Math.max(0, i));
  return arr[idx]!;
}

/** Fisher–Yates; mutates `arr` in place. */
export function shuffleInPlace<T>(arr: T[], rng: RNG): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

export function fieldGoalMakeProbability(distanceYards: number): number {
  if (distanceYards <= 45) {
    return 1;
  }
  const p = 0.88 - (distanceYards - 45) * 0.034;
  return Math.max(0.12, Math.min(0.88, p));
}

/** Weighted pick; each weight floored at 0.01 so every candidate stays reachable. */
export function chooseWeightedByWeights<T>(items: readonly T[], weights: readonly number[], rng: RNG): T {
  if (items.length === 0) {
    throw new Error('chooseWeightedByWeights: empty items');
  }
  if (items.length !== weights.length) {
    throw new Error('chooseWeightedByWeights: length mismatch');
  }
  const w = weights.map((x) => Math.max(0.01, x));
  const sum = w.reduce((a, b) => a + b, 0);
  let roll = rng() * sum;
  for (let i = 0; i < items.length; i++) {
    roll -= w[i]!;
    if (roll <= 0) {
      return items[i]!;
    }
  }
  return items[items.length - 1]!;
}

function expectedMatchupForCpuPick(
  cpuCard: Card,
  opponentHand: HandState,
  content: GameContent,
  cpuOnOffense: boolean
): number {
  const m = content.matchups.matrix;
  let sum = 0;
  let n = 0;
  for (const oid of opponentHand.cards) {
    const oc = content.cards.get(oid);
    if (!oc) continue;
    if (cpuOnOffense) {
      if (oc.side !== 'defense') continue;
      const mod = m[cpuCard.type]?.[oc.type];
      if (mod === undefined) continue;
      sum += mod;
      n++;
    } else {
      if (oc.side !== 'offense') continue;
      const mod = m[oc.type]?.[cpuCard.type];
      if (mod === undefined) continue;
      sum += mod;
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

export function isHailMaryCard(card: Card): boolean {
  const id = normalizeId(card._id);
  return id === 'hail-mary' || card.name.includes('Hail Mary');
}

/**
 * CPU v0.3: weighted random among dealt cards — weight = effective power + mean matchup vs user hand.
 */
export function cpuPickCards(
  cpuHand: HandState,
  opponentHand: HandState,
  cpuOnOffense: boolean,
  content: GameContent,
  rng: RNG,
  perGameBuffs: { powerBoost: number; starPMBoost: number }
): { cardId: string; playmakerId: string } {
  const pm = content.playmakers.get(cpuHand.playmaker);
  if (!pm) {
    throw new Error('cpuPickCards: CPU playmaker not in catalog');
  }
  const candidates: Card[] = [];
  for (const id of cpuHand.cards) {
    const c = content.cards.get(id);
    if (c) candidates.push(c);
  }
  if (candidates.length === 0) {
    throw new Error('cpuPickCards: no cards in CPU hand');
  }
  const weights = candidates.map((c) => {
    const p = getEffectivePower(c, pm, content, perGameBuffs, {});
    const exp = expectedMatchupForCpuPick(c, opponentHand, content, cpuOnOffense);
    return p + exp;
  });
  const pick = chooseWeightedByWeights(candidates, weights, rng);
  return { cardId: pick._id, playmakerId: cpuHand.playmaker };
}
