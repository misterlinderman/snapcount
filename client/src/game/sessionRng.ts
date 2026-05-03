import type { RNG } from './types';
import { mulberry32 } from './engine/rng';

/**
 * Deterministic snap RNG: same session + playId → same stream.
 * Matches server `sessionRng.ts` (SHA-256 of `${sessionId}\0${playId}`, first 4 bytes BE, fallback seed 1).
 */
export async function rngFromPlay(sessionId: string, playId: string): Promise<RNG> {
  const enc = new TextEncoder();
  const data = enc.encode(`${sessionId}\0${playId}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const view = new DataView(buf);
  const seed = view.getUint32(0, false) || 1;
  return mulberry32(seed);
}
