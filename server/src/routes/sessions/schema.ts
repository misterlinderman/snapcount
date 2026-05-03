import { z } from 'zod';

export const createSessionBodySchema = z.object({
  deckId: z.string().trim().min(1),
});

export const coinTossBodySchema = z.object({
  side: z.enum(['offense', 'defense']),
});

export const snapBodySchema = z.object({
  playId: z.string().trim().min(1).max(128),
  cardId: z.string().trim().min(1),
  playmakerId: z.string().trim().min(1),
});

export const tdRewardBodySchema = z.object({
  rewardId: z.enum(['hail-mary', 'power-boost', 'star-playmaker', 'draft-point']),
});

export const lockerDraftBodySchema = z.object({
  cardId: z.string().trim().min(1),
  /** Remove one copy per id (in order) before adding the drafted card; required when at 20 cards. */
  cutCardIds: z.array(z.string().trim().min(1)).optional().default([]),
});

export const fieldGoalBodySchema = z.object({
  playId: z.string().trim().min(1).max(128),
});

export const lockerUpgradeBodySchema = z.object({
  cardId: z.string().trim().min(1),
  upgradeId: z.string().trim().min(1),
});

export const lockerRecruitBodySchema = z.object({
  playmakerId: z.string().trim().min(1),
});
