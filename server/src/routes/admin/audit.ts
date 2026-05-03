import { Router, Response } from 'express';
import { z } from 'zod';
import { AuditLog } from '../../models';
import type { AuthRequest } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { adminAuditListQuerySchema, adminAuditScopeSchema } from './schemas';

const router = Router();

const ACTIONS_BY_SCOPE: Record<z.infer<typeof adminAuditScopeSchema>, string[]> = {
  cards: ['card.create', 'card.update', 'card.deactivate'],
  playmakers: ['playmaker.create', 'playmaker.update', 'playmaker.deactivate'],
  upgrades: ['upgrade.create', 'upgrade.update', 'upgrade.deactivate'],
};

const auditLatestQuerySchema = z.object({
  scope: adminAuditScopeSchema,
});

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAuditFilter(
  parsed: z.infer<typeof adminAuditListQuerySchema>
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [];

  if (parsed.actor?.trim()) {
    clauses.push({ actor: new RegExp(escapeRx(parsed.actor.trim()), 'i') });
  }
  if (parsed.target?.trim()) {
    clauses.push({ target: new RegExp(escapeRx(parsed.target.trim()), 'i') });
  }
  if (parsed.action?.trim()) {
    clauses.push({ action: new RegExp(escapeRx(parsed.action.trim()), 'i') });
  }
  if (parsed.q?.trim()) {
    const rx = new RegExp(escapeRx(parsed.q.trim()), 'i');
    clauses.push({ $or: [{ actor: rx }, { target: rx }, { action: rx }] });
  }

  const tf: { $gte?: Date; $lte?: Date } = {};
  if (parsed.from?.trim()) {
    const d = new Date(parsed.from.trim());
    if (Number.isNaN(d.getTime())) {
      throw createError('Invalid from date', 400);
    }
    tf.$gte = d;
  }
  if (parsed.to?.trim()) {
    const raw = parsed.to.trim();
    let d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw createError('Invalid to date', 400);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      d = new Date(`${raw}T23:59:59.999Z`);
    }
    tf.$lte = d;
  }
  if (Object.keys(tf).length > 0) {
    clauses.push({ timestamp: tf });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0] as Record<string, unknown>;
  return { $and: clauses };
}

const listAuditHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = adminAuditListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid query', 400);
  }
  const { page, limit } = parsed.data;
  const filter = buildAuditFilter(parsed.data);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({
    items: items.map((d) => ({
      ...d,
      timestamp: d.timestamp instanceof Date ? d.timestamp.toISOString() : d.timestamp,
    })),
    page,
    limit,
    total,
  });
});

router.get('/', listAuditHandler);
router.get('/entries', listAuditHandler);

router.get(
  '/latest',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = auditLatestQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid query', 400);
    }
    const { scope } = parsed.data;
    const actions = ACTIONS_BY_SCOPE[scope];
    const doc = await AuditLog.findOne({ action: { $in: actions } })
      .sort({ timestamp: -1 })
      .lean();

    if (!doc) {
      res.json(null);
      return;
    }

    res.json({
      actor: doc.actor,
      timestamp: doc.timestamp.toISOString(),
      action: doc.action,
      target: doc.target,
    });
  })
);

export default router;
