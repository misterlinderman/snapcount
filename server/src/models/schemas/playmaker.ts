import { z } from 'zod';
import { zCardType } from './cardType';

export const playmakerRaritySchema = z.enum(['starter', 'recruit-uncommon', 'recruit-rare']);

export const playmakerDocSchema = z.object({
  _id: z.string().min(1),
  side: z.enum(['offense', 'defense']),
  position: z.string().min(1),
  name: z.string().min(1),
  baseBoost: z.number(),
  affinityTypes: z.array(zCardType),
  rarity: playmakerRaritySchema,
  recruitCost: z.number().int().min(0).optional(),
  specialEffect: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const playmakerInputSchema = z.object({
  _id: z.string().min(1),
  side: z.enum(['offense', 'defense']),
  position: z.string().min(1),
  name: z.string().min(1),
  baseBoost: z.number(),
  affinityTypes: z.array(zCardType),
  rarity: playmakerRaritySchema,
  recruitCost: z.number().int().min(0).optional(),
  specialEffect: z.string().optional(),
  isActive: z.boolean(),
});
