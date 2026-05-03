import { Router, Response } from 'express';
import { Playmaker } from '../../models';
import type { AuthRequest } from '../../middleware/auth';
import { extractUserId } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { bumpMatchupMatrixVersion, invalidateContentCache } from '../../game/content/loader';
import { writeAuditLog } from '../../services/auditLog';
import { adminListQuerySchema, adminPlaymakerCreateSchema, adminPlaymakerUpdateSchema } from './schemas';

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
    if (type) filter.affinityTypes = type;
    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }

    const rows = await Playmaker.find(filter).sort({ side: 1, position: 1, name: 1 }).lean();
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);

    const parsed = adminPlaymakerCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }

    const exists = await Playmaker.findById(parsed.data._id).lean();
    if (exists) {
      throw createError('Playmaker with this id already exists', 409);
    }

    const created = await Playmaker.create(parsed.data);
    const after = snapshotLean(created.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'playmaker.create',
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

    const parsed = adminPlaymakerUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }

    const beforeDoc = await Playmaker.findById(req.params.id).lean();
    if (!beforeDoc) {
      throw createError('Playmaker not found', 404);
    }

    const updated = await Playmaker.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { new: true, runValidators: true });
    if (!updated) {
      throw createError('Playmaker not found', 404);
    }

    const before = snapshotLean(beforeDoc as Record<string, unknown>);
    const after = snapshotLean(updated.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'playmaker.update',
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

    const beforeDoc = await Playmaker.findById(req.params.id).lean();
    if (!beforeDoc) {
      throw createError('Playmaker not found', 404);
    }

    const before = snapshotLean(beforeDoc as Record<string, unknown>);

    const updated = await Playmaker.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      throw createError('Playmaker not found', 404);
    }

    const after = snapshotLean(updated.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'playmaker.deactivate',
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
