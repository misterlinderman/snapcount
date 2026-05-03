import { z } from 'zod';
import { zCardType } from './cardType';

export const upgradeEffectSchema = z.object({
  powerOverride: z.number().int().optional(),
  bonusVs: z
    .object({
      type: zCardType,
      bonus: z.number().int(),
    })
    .optional(),
  sideEffect: z.string().optional(),
});

export const upgradeDocSchema = z.object({
  _id: z.string().min(1),
  baseCardId: z.string().min(1),
  name: z.string().min(1),
  effect: upgradeEffectSchema,
  dpCost: z.number().int().min(0),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const upgradeInputSchema = z.object({
  _id: z.string().min(1),
  baseCardId: z.string().min(1),
  name: z.string().min(1),
  effect: upgradeEffectSchema,
  dpCost: z.number().int().min(0),
  isActive: z.boolean(),
});
