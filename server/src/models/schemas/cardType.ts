import { z } from 'zod';

export const CARD_TYPES = [
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
] as const;

export type ZCardType = (typeof CARD_TYPES)[number];

export const zCardType = z.enum(CARD_TYPES);
