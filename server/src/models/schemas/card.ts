import { z } from 'zod';
import { zCardType } from './cardType';

export const cardRaritySchema = z.enum(['starter', 'common', 'uncommon', 'rare', 'legendary']);

export const cardDocSchema = z.object({
  _id: z.string().min(1),
  side: z.enum(['offense', 'defense']),
  type: zCardType,
  name: z.string().min(1),
  basePower: z.number().int(),
  notes: z.string().optional(),
  rarity: cardRaritySchema,
  draftCost: z.number().int().min(0).optional(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const cardInputSchema = z.object({
  _id: z.string().min(1),
  side: z.enum(['offense', 'defense']),
  type: zCardType,
  name: z.string().min(1),
  basePower: z.number().int(),
  notes: z.string().optional(),
  rarity: cardRaritySchema,
  draftCost: z.number().int().min(0).optional(),
  isActive: z.boolean(),
});
