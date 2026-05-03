import { z } from 'zod';

const cardTypeSchema = z.enum([
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
]);

const cardRaritySchema = z.enum(['starter', 'common', 'uncommon', 'rare', 'legendary']);
const playmakerRaritySchema = z.enum(['starter', 'recruit-uncommon', 'recruit-rare']);

export const adminCardFormCreateSchema = z.object({
  _id: z.string().min(1).max(64),
  side: z.enum(['offense', 'defense']),
  type: cardTypeSchema,
  name: z.string().min(1).trim(),
  basePower: z.number().finite(),
  notes: z.string().optional(),
  rarity: cardRaritySchema,
  draftCost: z.number().min(0).optional(),
  isActive: z.boolean(),
});

export const adminCardFormUpdateSchema = adminCardFormCreateSchema.omit({ _id: true });

export const adminPlaymakerFormCreateSchema = z.object({
  _id: z.string().min(1).max(64),
  side: z.enum(['offense', 'defense']),
  position: z.string().min(1).trim(),
  name: z.string().min(1).trim(),
  baseBoost: z.number().finite(),
  affinityTypes: z.array(cardTypeSchema),
  rarity: playmakerRaritySchema,
  recruitCost: z.number().min(0).optional(),
  specialEffect: z.string().optional(),
  isActive: z.boolean(),
});

export const adminPlaymakerFormUpdateSchema = adminPlaymakerFormCreateSchema.omit({ _id: true });

const upgradeEffectFormSchema = z
  .object({
    powerOverride: z.number().finite().optional(),
    bonusVs: z
      .object({
        type: cardTypeSchema,
        bonus: z.number().finite(),
      })
      .optional(),
    sideEffect: z.string().optional(),
  })
  .strict();

export const adminUpgradeFormCreateSchema = z.object({
  _id: z.string().min(1).max(64),
  baseCardId: z.string().min(1).max(64),
  name: z.string().min(1).trim(),
  dpCost: z.number().min(0),
  effect: upgradeEffectFormSchema,
  isActive: z.boolean(),
});

export const adminUpgradeFormUpdateSchema = z.object({
  baseCardId: z.string().min(1).max(64),
  name: z.string().min(1).trim(),
  dpCost: z.number().min(0),
  effect: upgradeEffectFormSchema,
  isActive: z.boolean(),
});

export function zodErrorMessage(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join('; ') || 'Invalid';
}
