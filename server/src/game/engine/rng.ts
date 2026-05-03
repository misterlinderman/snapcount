import type { RNG } from '../types';

/**
 * Mulberry32 — deterministic `() => [0, 1)`. Same integer seed yields the same sequence.
 * Use in tests and for reproducible server snaps when combined with session + playId seeding.
 */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return (): number => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
