import mongoose from 'mongoose';
import { Card, Playmaker, Upgrade, MatchupMatrix } from '../../models';
import { STARTER_CARDS } from '../../game/seed/cards';
import { ALL_SEED_PLAYMAKERS } from '../../game/seed/playmakers';
import { STARTER_UPGRADES } from '../../game/seed/upgrades';
import { MATCHUP_LABELS, MATCHUP_MATRIX, MATCHUP_SEED_VERSION } from '../../game/seed/matchups';
import type { SeedCard, SeedPlaymaker, SeedUpgrade } from '../../game/seed/types';

async function upsertCard(doc: SeedCard): Promise<void> {
  const { _id, ...rest } = doc;
  await Card.findOneAndUpdate({ _id }, { $set: rest }, { upsert: true, runValidators: true });
}

async function upsertPm(doc: SeedPlaymaker): Promise<void> {
  const { _id, ...rest } = doc;
  await Playmaker.findOneAndUpdate({ _id }, { $set: rest }, { upsert: true, runValidators: true });
}

async function upsertUpgrade(doc: SeedUpgrade): Promise<void> {
  const { _id, ...rest } = doc;
  await Upgrade.findOneAndUpdate({ _id }, { $set: rest }, { upsert: true, runValidators: true });
}

/** Minimal catalog so `loadGameContent()` and session flow work in integration tests. */
export async function seedTestCatalog(): Promise<void> {
  for (const c of STARTER_CARDS) {
    await upsertCard(c);
  }
  for (const p of ALL_SEED_PLAYMAKERS) {
    await upsertPm(p);
  }
  for (const u of STARTER_UPGRADES) {
    await upsertUpgrade(u);
  }
  await MatchupMatrix.findOneAndUpdate(
    { _id: 'singleton' },
    {
      $set: {
        version: MATCHUP_SEED_VERSION,
        matrix: MATCHUP_MATRIX,
        labels: MATCHUP_LABELS,
        updatedBy: 'test-seed',
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
}

export async function wipeAllCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    return;
  }
  const cols = await db.collections();
  for (const c of cols) {
    await c.deleteMany({});
  }
}
