import { z } from 'zod';

export const updateMeBodySchema = z.object({
  displayName: z.string().trim().min(1).max(120),
});
