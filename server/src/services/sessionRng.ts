import { createHash, randomInt } from 'node:crypto';
import type { RNG } from '../game/types';
import { mulberry32 } from '../game/engine/rng';

/** Deterministic snap RNG: same session + playId → same stream. */
export function rngFromPlay(sessionId: string, playId: string): RNG {
  const h = createHash('sha256').update(`${sessionId}\0${playId}`, 'utf8').digest();
  const seed = h.readUInt32BE(0) || 1;
  return mulberry32(seed);
}

/** Non-deterministic server RNG for deals / redraws / coin toss follow-up. */
export function sessionRng(): RNG {
  return mulberry32(randomInt(1, 0x7fffffff));
}
