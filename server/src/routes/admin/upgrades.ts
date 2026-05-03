import { Router, Response } from 'express';
import { Upgrade } from '../../models';
import type { AuthRequest } from '../../middleware/auth';
import { extractUserId } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { bumpMatchupMatrixVersion, invalidateContentCache } from '../../game/content/loader';
import { writeAuditLog } from '../../services/auditLog';
import { adminUpgradeCreateSchema, adminUpgradeListQuerySchema, adminUpgradeUpdateSchema } from './schemas';

const router = Router();

function snapshotLean<T extends Record<string, unknown>>(doc: T | null | undefined): T | null {
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)) as T;
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const qParsed = adminUpgradeListQuerySchema.safeParse(req.query);
    if (!qParsed.success) {
      throw createError(qParsed.error.issues.map((i) => i.message).join('; ') || 'Invalid query', 400);
    }
    const { includeInactive } = qParsed.data;
    const filter: Record<string, unknown> = {};
    if (!includeInactive) filter.isActive = true;

    const rows = await Upgrade.find(filter).sort({ baseCardId: 1, name: 1 }).lean();
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);

    const parsed = adminUpgradeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }

    const exists = await Upgrade.findById(parsed.data._id).lean();
    if (exists) {
      throw createError('Upgrade with this id already exists', 409);
    }

    const payload = { ...parsed.data, effect: parsed.data.effect ?? {} };
    const created = await Upgrade.create(payload);
    const after = snapshotLean(created.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'upgrade.create',
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

    const parsed = adminUpgradeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }

    const beforeDoc = await Upgrade.findById(req.params.id).lean();
    if (!beforeDoc) {
      throw createError('Upgrade not found', 404);
    }

    const updatePayload: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.effect !== undefined) {
      updatePayload.effect = {
        ...(beforeDoc.effect as Record<string, unknown>),
        ...parsed.data.effect,
      };
    }

    const updated = await Upgrade.findByIdAndUpdate(req.params.id, { $set: updatePayload }, { new: true, runValidators: true });
    if (!updated) {
      throw createError('Upgrade not found', 404);
    }

    const before = snapshotLean(beforeDoc as Record<string, unknown>);
    const after = snapshotLean(updated.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'upgrade.update',
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

    const beforeDoc = await Upgrade.findById(req.params.id).lean();
    if (!beforeDoc) {
      throw createError('Upgrade not found', 404);
    }

    const before = snapshotLean(beforeDoc as Record<string, unknown>);

    const updated = await Upgrade.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      throw createError('Upgrade not found', 404);
    }

    const after = snapshotLean(updated.toObject({ versionKey: false }) as Record<string, unknown>);
    await writeAuditLog(req, {
      action: 'upgrade.deactivate',
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
