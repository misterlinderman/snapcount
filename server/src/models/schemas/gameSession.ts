import { z } from 'zod';

export const sessionGameSliceSchema = z
  .object({
    quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    totalDowns: z.number().int().min(0),
    scoreRed: z.number().int().min(0),
    scoreBlue: z.number().int().min(0),
    ballYard: z.number().min(0).max(100),
    possession: z.enum(['red', 'blue']),
    down: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    yardsToGo: z.number().int().min(1),
    playerSide: z.enum(['red', 'blue']),
    perGameBuffs: z.object({
      powerBoost: z.number(),
      starPMBoost: z.number(),
    }),
    lastThreeTypes: z.array(z.string()),
    filmStudyActive: z.boolean().optional(),
    rogueWins: z.number().int().min(0).optional(),
    rogueGames: z.number().int().min(0).optional(),
    dp: z.number().int().optional(),
    pendingDeckAdds: z.array(z.string()).optional(),
    gameWinner: z.enum(['red', 'blue']).nullable().optional(),
    redrawUsedThisPossession: z.boolean().optional(),
  })
  .passthrough();

export const handStateSchema = z.object({
  cards: z.array(z.string()),
  playmaker: z.string(),
  selectedCardId: z.string().optional(),
  selectedPM: z.string().optional(),
});

export const playLogEventSchema = z.object({
  playId: z.string(),
  timestamp: z.coerce.date(),
  quarter: z.number().int(),
  down: z.number().int(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export const idempotencyEntrySchema = z.object({
  playId: z.string(),
  /** Cached route response for duplicate `playId`. */
  result: z.record(z.string(), z.unknown()),
});

export const gameSessionDocSchema = z.object({
  _id: z.string().optional(),
  user: z.string().min(1),
  deck: z.string().min(1),
  status: z.enum(['active', 'completed', 'abandoned']),
  result: z.enum(['won', 'lost']).optional(),
  season: z.object({
    node: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    wins: z.number().int().min(0),
    losses: z.number().int().min(0),
  }),
  game: sessionGameSliceSchema,
  hand: handStateSchema.optional(),
  cpuHand: handStateSchema.omit({ selectedCardId: true, selectedPM: true }).optional(),
  pendingAdvance: z.unknown().optional(),
  events: z.array(playLogEventSchema),
  recentPlayIds: z.array(z.string()).max(5),
  idempotencyByPlayId: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
