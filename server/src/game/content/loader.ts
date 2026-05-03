import { Card, Playmaker, MatchupMatrix, Upgrade } from '../../models';
import type {
  Card as EngineCard,
  CardType,
  GameContent,
  MatchupMatrix as EngineMatchupMatrix,
  Playmaker as EnginePlaymaker,
  Upgrade as EngineUpgrade,
} from '../types';

const TTL_MS = 60_000;

interface CacheEntry {
  content: GameContent;
  expiresAt: number;
}

/** In-memory cache keyed by `MatchupMatrix.version` (invalidates when admins bump version). */
const cacheByVersion = new Map<number, CacheEntry>();

function pruneExpired(now: number): void {
  for (const [key, entry] of cacheByVersion) {
    if (entry.expiresAt <= now) {
      cacheByVersion.delete(key);
    }
  }
}

function leanCardToEngine(doc: EngineCard & { createdAt?: Date; updatedAt?: Date }): EngineCard {
  return {
    _id: doc._id,
    side: doc.side,
    type: doc.type,
    name: doc.name,
    basePower: doc.basePower,
    notes: doc.notes,
    rarity: doc.rarity,
    draftCost: doc.draftCost,
    isActive: doc.isActive,
  };
}

function leanPlaymakerToEngine(
  doc: EnginePlaymaker & { createdAt?: Date; updatedAt?: Date }
): EnginePlaymaker {
  return {
    _id: doc._id,
    side: doc.side,
    position: doc.position,
    name: doc.name,
    baseBoost: doc.baseBoost,
    affinityTypes: doc.affinityTypes as CardType[],
    rarity: doc.rarity,
    recruitCost: doc.recruitCost,
    specialEffect: doc.specialEffect,
    isActive: doc.isActive,
  };
}

function leanUpgradeToEngine(doc: EngineUpgrade & { createdAt?: Date; updatedAt?: Date }): EngineUpgrade {
  const bonusVs = doc.effect?.bonusVs;
  return {
    _id: doc._id,
    baseCardId: doc.baseCardId,
    name: doc.name,
    effect: {
      powerOverride: doc.effect?.powerOverride,
      bonusVs: bonusVs
        ? { type: bonusVs.type as CardType, bonus: bonusVs.bonus }
        : undefined,
      sideEffect: doc.effect?.sideEffect,
    },
    dpCost: doc.dpCost,
    isActive: doc.isActive,
  };
}

function matrixFromDoc(matrixUnknown: unknown): EngineMatchupMatrix['matrix'] {
  return matrixUnknown as EngineMatchupMatrix['matrix'];
}

function labelsFromDoc(labelsUnknown: unknown): Record<string, string> {
  if (labelsUnknown && typeof labelsUnknown === 'object' && !Array.isArray(labelsUnknown)) {
    return labelsUnknown as Record<string, string>;
  }
  return {};
}

/**
 * Loads active catalog documents into the engine bundle. Caches by matchup `version` for 60s.
 * Requires an active Mongoose connection (same as route handlers).
 */
export async function loadGameContent(): Promise<GameContent> {
  const matrixDoc = await MatchupMatrix.findById('singleton').lean();
  if (!matrixDoc) {
    throw new Error('MatchupMatrix singleton not found; run npm run seed');
  }

  const version = matrixDoc.version;
  const now = Date.now();
  pruneExpired(now);

  const cached = cacheByVersion.get(version);
  if (cached && cached.expiresAt > now) {
    return cached.content;
  }

  const [cardDocs, playmakerDocs, upgradeDocs] = await Promise.all([
    Card.find({ isActive: true }).lean(),
    Playmaker.find({ isActive: true }).lean(),
    Upgrade.find({ isActive: true }).lean(),
  ]);

  const cards = new Map<string, EngineCard>();
  for (const raw of cardDocs) {
    const c = leanCardToEngine(raw as EngineCard);
    cards.set(c._id, c);
  }

  const playmakers = new Map<string, EnginePlaymaker>();
  for (const raw of playmakerDocs) {
    const p = leanPlaymakerToEngine(raw as EnginePlaymaker);
    playmakers.set(p._id, p);
  }

  const upgrades = new Map<string, EngineUpgrade>();
  for (const raw of upgradeDocs) {
    const u = leanUpgradeToEngine(raw as EngineUpgrade);
    upgrades.set(u._id, u);
  }

  const matchups: EngineMatchupMatrix = {
    matrix: matrixFromDoc(matrixDoc.matrix),
    labels: labelsFromDoc(matrixDoc.labels),
  };

  const content: GameContent = { cards, playmakers, matchups, upgrades, matchupVersion: version };
  cacheByVersion.set(version, { content, expiresAt: now + TTL_MS });
  return content;
}

/** Call after any admin write to Card, Playmaker, MatchupMatrix, or Upgrade so the next load is fresh. */
export function invalidateContentCache(): void {
  cacheByVersion.clear();
}

/** Increments the matrix singleton version so new sessions resolve against fresh catalog; clears loader cache. */
export async function bumpMatchupMatrixVersion(updatedBy: string): Promise<number> {
  invalidateContentCache();
  const doc = await MatchupMatrix.findOneAndUpdate(
    { _id: 'singleton' },
    { $inc: { version: 1 }, $set: { updatedBy } },
    { new: true }
  ).lean();
  if (!doc) {
    throw new Error('MatchupMatrix singleton not found; run npm run seed');
  }
  return doc.version;
}
