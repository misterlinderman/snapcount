/**
 * Seed or upsert game catalog into MongoDB.
 * Usage: `npm run seed` | `npm run seed:reset` (drop catalog collections first).
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Same as `src/index.ts`: load `server/.env` when run via `npm run seed` from the server package.
dotenv.config();

import { Card, Playmaker, Upgrade, MatchupMatrix } from '../models';
import { STARTER_CARDS } from '../game/seed/cards';
import { ALL_SEED_PLAYMAKERS } from '../game/seed/playmakers';
import { STARTER_UPGRADES } from '../game/seed/upgrades';
import { MATCHUP_LABELS, MATCHUP_MATRIX, MATCHUP_SEED_VERSION } from '../game/seed/matchups';
import type { SeedCard, SeedPlaymaker, SeedUpgrade } from '../game/seed/types';

interface Counts {
  added: number;
  updated: number;
}

function bump(counts: Counts, action: 'added' | 'updated'): void {
  counts[action]++;
}

async function upsertSeedCard(doc: SeedCard): Promise<'added' | 'updated'> {
  const existed = await Card.exists({ _id: doc._id });
  const { _id, ...rest } = doc;
  await Card.findOneAndUpdate({ _id }, { $set: rest }, { upsert: true, runValidators: true });
  return existed ? 'updated' : 'added';
}

async function upsertSeedPlaymaker(doc: SeedPlaymaker): Promise<'added' | 'updated'> {
  const existed = await Playmaker.exists({ _id: doc._id });
  const { _id, ...rest } = doc;
  await Playmaker.findOneAndUpdate({ _id }, { $set: rest }, { upsert: true, runValidators: true });
  return existed ? 'updated' : 'added';
}

async function upsertSeedUpgrade(doc: SeedUpgrade): Promise<'added' | 'updated'> {
  const existed = await Upgrade.exists({ _id: doc._id });
  const { _id, ...rest } = doc;
  await Upgrade.findOneAndUpdate({ _id }, { $set: rest }, { upsert: true, runValidators: true });
  return existed ? 'updated' : 'added';
}

async function runSeed(reset: boolean): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Check server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  if (reset) {
    const cols = ['cards', 'playmakers', 'upgrades', 'matchupmatrices'];
    const db = mongoose.connection.db;
    if (db) {
      for (const c of cols) {
        try {
          await db.collection(c).drop();
          console.log(`Dropped collection: ${c}`);
        } catch {
          /* collection may not exist */
        }
      }
    }
  }

  const cards: Counts = { added: 0, updated: 0 };
  for (const c of STARTER_CARDS) {
    const r = await upsertSeedCard(c);
    bump(cards, r);
    console.log(`  [Card] ${r}: ${c._id}`);
  }

  const pms: Counts = { added: 0, updated: 0 };
  for (const p of ALL_SEED_PLAYMAKERS) {
    const r = await upsertSeedPlaymaker(p);
    bump(pms, r);
    console.log(`  [Playmaker] ${r}: ${p._id}`);
  }

  const ups: Counts = { added: 0, updated: 0 };
  for (const u of STARTER_UPGRADES) {
    const r = await upsertSeedUpgrade(u);
    bump(ups, r);
    console.log(`  [Upgrade] ${r}: ${u._id}`);
  }

  const matrixExisted = await MatchupMatrix.exists({ _id: 'singleton' });
  await MatchupMatrix.findOneAndUpdate(
    { _id: 'singleton' },
    {
      $set: {
        version: MATCHUP_SEED_VERSION,
        matrix: MATCHUP_MATRIX,
        labels: MATCHUP_LABELS,
        updatedBy: 'seed',
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(
    `  [MatchupMatrix] ${matrixExisted ? 'updated' : 'added'}: singleton (v${MATCHUP_SEED_VERSION})`
  );

  console.log('\nSummary:');
  console.log(`  Cards:      ${cards.added} added, ${cards.updated} updated`);
  console.log(`  Playmakers: ${pms.added} added, ${pms.updated} updated`);
  console.log(`  Upgrades:   ${ups.added} added, ${ups.updated} updated`);
  console.log(`  Matrix:     1 document`);
}

const reset = process.argv.includes('--reset');

runSeed(reset)
  .then(() => mongoose.disconnect())
  .then(() => {
    console.log('\nSeed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    void mongoose.disconnect().finally(() => process.exit(1));
  });
