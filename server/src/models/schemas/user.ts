import { z } from 'zod';

export const userStatsSchema = z.object({
  seasonsStarted: z.number().int().min(0),
  seasonsWon: z.number().int().min(0),
  gamesWon: z.number().int().min(0),
  gamesPlayed: z.number().int().min(0),
  touchdowns: z.number().int().min(0),
  interceptionsThrown: z.number().int().min(0),
  interceptionsCaught: z.number().int().min(0),
});

export const userDocSchema = z.object({
  _id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(['user', 'admin']),
  defaultDeck: z.string().optional(),
  stats: userStatsSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const userCreateSchema = z.object({
  _id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(['user', 'admin']).optional(),
  defaultDeck: z.string().optional(),
  stats: userStatsSchema.optional(),
});

export const userUpdateSchema = userCreateSchema
  .omit({ _id: true })
  .partial();
