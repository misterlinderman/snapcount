import { createError } from '../../middleware/errorHandler';
import { loadGameContent } from './loader';
import type { GameContent } from '../types';

/**
 * Same as `loadGameContent`, but turns missing MatchupMatrix singleton into HTTP 503
 * so session routes don't surface raw 500s when the DB is not seeded.
 */
export async function loadGameContentForApi(): Promise<GameContent> {
  try {
    return await loadGameContent();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('singleton not found') || msg.includes('MatchupMatrix')) {
      throw createError(
        'Game catalog is not loaded. From the repo root run: npm run seed (MongoDB must be running and MONGODB_URI set).',
        503
      );
    }
    throw e;
  }
}
