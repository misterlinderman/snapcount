import { Router, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { GameSession } from '../../models';
import { adminSessionListQuerySchema } from './schemas';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = adminSessionListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid query', 400);
    }
    const { status, user, page, limit } = parsed.data;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (user?.trim()) filter.user = user.trim();
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      GameSession.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id user status result updatedAt game.scoreRed game.scoreBlue')
        .lean(),
      GameSession.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await GameSession.findById(req.params.id).lean();
    if (!session) throw createError('Session not found', 404);
    res.json(session);
  })
);

export default router;
