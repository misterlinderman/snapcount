import { z } from 'zod';
import type { CardType } from '../../models/Card';

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
] as const satisfies readonly CardType[];

export const cardTypeZ = z.enum(CARD_TYPES);

const includeInactiveFromQuery = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .optional()
  .transform((v) => v === 'true' || v === '1');

export const adminListQuerySchema = z.object({
  side: z.enum(['offense', 'defense']).optional(),
  type: cardTypeZ.optional(),
  q: z.string().optional(),
  includeInactive: includeInactiveFromQuery,
});

export const adminUpgradeListQuerySchema = z.object({
  includeInactive: includeInactiveFromQuery,
});

export const adminAuditScopeSchema = z.enum(['cards', 'playmakers', 'upgrades']);

export const adminCardCreateSchema = z.object({
  _id: z.string().min(1).max(64),
  side: z.enum(['offense', 'defense']),
  type: cardTypeZ,
  name: z.string().min(1).trim(),
  basePower: z.number(),
  notes: z.string().optional(),
  rarity: z.enum(['starter', 'common', 'uncommon', 'rare', 'legendary']),
  draftCost: z.number().min(0).optional(),
  isActive: z.boolean().optional().default(true),
});

export const adminCardUpdateSchema = adminCardCreateSchema.omit({ _id: true }).partial();

export const adminPlaymakerCreateSchema = z.object({
  _id: z.string().min(1).max(64),
  side: z.enum(['offense', 'defense']),
  position: z.string().min(1).trim(),
  name: z.string().min(1).trim(),
  baseBoost: z.number(),
  affinityTypes: z.array(cardTypeZ).default([]),
  rarity: z.enum(['starter', 'recruit-uncommon', 'recruit-rare']),
  recruitCost: z.number().min(0).optional(),
  specialEffect: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const adminPlaymakerUpdateSchema = adminPlaymakerCreateSchema.omit({ _id: true }).partial();

const upgradeEffectSchema = z.object({
  powerOverride: z.number().optional(),
  bonusVs: z
    .object({
      type: cardTypeZ,
      bonus: z.number(),
    })
    .optional(),
  sideEffect: z.string().optional(),
});

export const adminUpgradeCreateSchema = z.object({
  _id: z.string().min(1).max(64),
  baseCardId: z.string().min(1).max(64),
  name: z.string().min(1).trim(),
  effect: upgradeEffectSchema.optional().default({}),
  dpCost: z.number().min(0),
  isActive: z.boolean().optional().default(true),
});

export const adminUpgradeUpdateSchema = z
  .object({
    baseCardId: z.string().min(1).max(64).optional(),
    name: z.string().min(1).trim().optional(),
    effect: upgradeEffectSchema.optional(),
    dpCost: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

function isFullMatrix(m: unknown): m is Record<CardType, Record<CardType, number>> {
  if (!m || typeof m !== 'object') return false;
  const top = m as Record<string, Record<string, unknown>>;
  for (const row of CARD_TYPES) {
    const inner = top[row];
    if (!inner || typeof inner !== 'object') return false;
    for (const col of CARD_TYPES) {
      const v = inner[col];
      if (typeof v !== 'number' || !Number.isFinite(v)) return false;
    }
  }
  return true;
}

export const adminMatchupPutSchema = z.object({
  matrix: z.custom<Record<CardType, Record<CardType, number>>>((data) => isFullMatrix(data), {
    message: 'matrix must be a complete CardType × CardType number grid',
  }),
  labels: z.record(z.string(), z.string()),
});

export const adminUserListQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const adminUserRoleBodySchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const adminGrantDpBodySchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

export const adminEndSessionBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  reason: z.string().min(1).max(500),
});

export const adminSessionListQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  user: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const adminAuditListQuerySchema = z.object({
  /** Broad search across actor, target, action (OR). AND-combined with other filters. */
  q: z.string().optional(),
  actor: z.string().optional(),
  target: z.string().optional(),
  action: z.string().optional(),
  /** ISO date or datetime (inclusive start). */
  from: z.string().optional(),
  /** ISO date or datetime; date-only strings use end of that UTC day. */
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
