import { Router, Response } from 'express';
import { Card } from '../../models';
import type { AuthRequest } from '../../middleware/auth';
import { extractUserId } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { bumpMatchupMatrixVersion, invalidateContentCache } from '../../game/content/loader';
import { writeAuditLog } from '../../services/auditLog';
import { adminCardCreateSchema, adminCardUpdateSchema, adminListQuerySchema } from './schemas';

const router = Router();

function snapshotLean<T extends Record<string, unknown>>(doc: T | null | undefined): T | null {
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)) as T;
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const qParsed = adminListQuerySchema.safeParse(req.query);
    if (!qParsed.success) {
      throw createError(qParsed.error.issues.map((i) => i.message).join('; ') || 'Invalid query', 400);
    }
    const { side, type, q, includeInactive } = qParsed.data;
    const filter: Record<string, unknown> = {};
    if (!includeInactive) filter.isActive = true;
    if (side) filter.side = side;
    if (type) filter.type = type;
    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }

    const rows = await Card.find(filter).sort({ side: 1, type: 1, name: 1 }).lean();
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);

    const parsed = adminCardCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }

    const exists = await Card.findById(parsed.data._id).lean();
    if (exists) {
      throw createError('Card with this id already exists', 409);
    }

    const created = await Card.create(parsed.data);
    const after = snapshotLean(created.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'card.create',
      target: parsed.data._id,
      before: null,
      after,
    });
    invalidateContentCache();
    await bumpMatchupMatrixVersion(actor);

    res.status(201).json(created);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);

    const parsed = adminCardUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }

    const beforeDoc = await Card.findById(req.params.id).lean();
    if (!beforeDoc) {
      throw createError('Card not found', 404);
    }

    const updated = await Card.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { new: true, runValidators: true });
    if (!updated) {
      throw createError('Card not found', 404);
    }

    const before = snapshotLean(beforeDoc as Record<string, unknown>);
    const after = snapshotLean(updated.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'card.update',
      target: req.params.id,
      before,
      after,
    });
    invalidateContentCache();
    await bumpMatchupMatrixVersion(actor);

    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);

    const beforeDoc = await Card.findById(req.params.id).lean();
    if (!beforeDoc) {
      throw createError('Card not found', 404);
    }

    const before = snapshotLean(beforeDoc as Record<string, unknown>);

    const updated = await Card.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      throw createError('Card not found', 404);
    }

    const after = snapshotLean(updated.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'card.deactivate',
      target: req.params.id,
      before,
      after,
    });
    invalidateContentCache();
    await bumpMatchupMatrixVersion(actor);

    res.json(updated);
  })
);

export default router;
