import { Router, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { getAdminStatsPayload, invalidateAdminStatsCache } from '../../services/adminStatsService';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await getAdminStatsPayload(Date.now());
    res.json(stats);
  })
);

router.post(
  '/recompute',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    invalidateAdminStatsCache();
    const stats = await getAdminStatsPayload(Date.now());
    res.json(stats);
  })
);

export default router;
