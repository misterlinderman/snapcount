import { Router, Response } from 'express';
import { MatchupMatrix } from '../../models';
import type { AuthRequest } from '../../middleware/auth';
import { extractUserId } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { invalidateContentCache } from '../../game/content/loader';
import { writeAuditLog } from '../../services/auditLog';
import { invalidateAdminStatsCache } from '../../services/adminStatsService';
import { adminMatchupPutSchema } from './schemas';

const router = Router();

function snapshotLean<T extends Record<string, unknown>>(doc: T | null | undefined): T | null {
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)) as T;
}

router.get(
  '/',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const doc = await MatchupMatrix.findById('singleton').lean();
    if (!doc) {
      throw createError('MatchupMatrix not found; run npm run seed', 404);
    }
    res.json({
      version: doc.version,
      matrix: doc.matrix,
      labels: doc.labels ?? {},
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy,
    });
  })
);

router.put(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);

    const parsed = adminMatchupPutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }

    const beforeDoc = await MatchupMatrix.findById('singleton').lean();
    if (!beforeDoc) {
      throw createError('MatchupMatrix not found', 404);
    }

    invalidateContentCache();
    invalidateAdminStatsCache();

    const updated = await MatchupMatrix.findOneAndUpdate(
      { _id: 'singleton' },
      {
        $set: {
          matrix: parsed.data.matrix,
          labels: parsed.data.labels,
          updatedBy: actor,
        },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw createError('MatchupMatrix not found', 404);
    }

    const before = snapshotLean(beforeDoc as unknown as Record<string, unknown>);
    const after = snapshotLean(updated.toObject({ versionKey: false }) as unknown as Record<string, unknown>);

    await writeAuditLog(req, {
      action: 'matchup.update',
      target: 'singleton',
      before,
      after,
    });

    res.json({
      version: updated.version,
      matrix: updated.matrix,
      labels: updated.labels ?? {},
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    });
  })
);

export default router;
