import { z } from 'zod';

export const createDeckBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  copyFrom: z.string().trim().min(1).optional(),
});

export const updateDeckBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((b) => b.name !== undefined || b.isDefault !== undefined, {
    message: 'At least one of name, isDefault is required',
  });
