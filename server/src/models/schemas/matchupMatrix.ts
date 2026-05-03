import { z } from 'zod';
import { zCardType } from './cardType';

export const matchupRowSchema = z.record(zCardType, z.number());

export const matchupMatrixDocSchema = z.object({
  _id: z.literal('singleton'),
  version: z.number().int().min(0),
  matrix: z.record(zCardType, matchupRowSchema),
  labels: z.record(z.string(), z.string()),
  updatedAt: z.coerce.date(),
  updatedBy: z.string().min(1),
});

export const matchupMatrixUpdateSchema = z.object({
  matrix: z.record(zCardType, matchupRowSchema).optional(),
  labels: z.record(z.string(), z.string()).optional(),
  version: z.number().int().min(0).optional(),
  updatedBy: z.string().optional(),
});
