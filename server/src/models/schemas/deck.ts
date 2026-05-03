import { z } from 'zod';

export const deckCardSchema = z.object({
  cardId: z.string().min(1),
  count: z.number().int().min(1),
  upgradeId: z.string().optional(),
});

export const deckDocSchema = z.object({
  _id: z.string().optional(),
  user: z.string().min(1),
  name: z.string().min(1),
  isDefault: z.boolean(),
  offense: z.array(deckCardSchema),
  defense: z.array(deckCardSchema),
  offPlaymakers: z.array(z.string()).max(5),
  defPlaymakers: z.array(z.string()).max(5),
  dp: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const deckInputSchema = z.object({
  user: z.string().min(1),
  name: z.string().min(1).default('My Team'),
  isDefault: z.boolean().optional(),
  offense: z.array(deckCardSchema).default([]),
  defense: z.array(deckCardSchema).default([]),
  offPlaymakers: z.array(z.string()).max(5).default([]),
  defPlaymakers: z.array(z.string()).max(5).default([]),
  dp: z.number().int().min(0).default(0),
});
