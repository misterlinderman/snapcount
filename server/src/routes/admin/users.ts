import { Router, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth';
import { extractUserId } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { User, Deck, GameSession } from '../../models';
import { writeAuditLog } from '../../services/auditLog';
import {
  adminEndSessionBodySchema,
  adminGrantDpBodySchema,
  adminUserListQuerySchema,
  adminUserRoleBodySchema,
} from './schemas';

const router = Router();

function snapshotLean<T extends Record<string, unknown>>(doc: T | null | undefined): T | null {
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)) as T;
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = adminUserListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid query', 400);
    }
    const { q, page, limit } = parsed.data;
    const filter: Record<string, unknown> = {};
    if (q?.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { displayName: rx }, { _id: rx }];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      User.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.params.id).lean();
    if (!user) throw createError('User not found', 404);
    const decks = await Deck.find({ user: user._id }).sort({ updatedAt: -1 }).limit(20).lean();
    const sessions = await GameSession.find({ user: user._id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('_id status result phase season updatedAt game.scoreRed game.scoreBlue')
      .lean();
    res.json({ user, decks, recentSessions: sessions });
  })
);

router.put(
  '/:id/role',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);
    const parsed = adminUserRoleBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }
    const beforeDoc = await User.findById(req.params.id).lean();
    if (!beforeDoc) throw createError('User not found', 404);
    const before = snapshotLean(beforeDoc as unknown as Record<string, unknown>);
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role: parsed.data.role } },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw createError('User not found', 404);
    await writeAuditLog(req, {
      action: 'user.role.update',
      target: req.params.id,
      before,
      after: snapshotLean(updated as unknown as Record<string, unknown>),
    });
    res.json(updated);
  })
);

router.post(
  '/:id/grant-dp',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);
    const parsed = adminGrantDpBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }
    const user = await User.findById(req.params.id).lean();
    if (!user) throw createError('User not found', 404);
    const deckId = user.defaultDeck;
    if (!deckId) throw createError('User has no default deck', 400);
    const beforeDeck = await Deck.findById(deckId).lean();
    if (!beforeDeck || beforeDeck.user !== user._id) throw createError('Deck not found', 404);
    const updatedDeck = await Deck.findByIdAndUpdate(
      deckId,
      { $inc: { dp: parsed.data.amount } },
      { new: true }
    ).lean();
    await writeAuditLog(req, {
      action: 'user.grant_dp',
      target: user._id,
      before: { deckId, dp: beforeDeck.dp },
      after: { deckId, dp: updatedDeck?.dp },
      reason: parsed.data.reason,
    });
    res.json({ deck: updatedDeck });
  })
);

router.post(
  '/:id/end-session',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const actor = extractUserId(req);
    if (!actor) throw createError('Unauthorized', 401);
    const parsed = adminEndSessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body', 400);
    }
    const user = await User.findById(req.params.id).lean();
    if (!user) throw createError('User not found', 404);
    const session = await GameSession.findById(parsed.data.sessionId).lean();
    if (!session) throw createError('Session not found', 404);
    if (session.user !== user._id) {
      throw createError('Session does not belong to this user', 400);
    }
    if (session.status !== 'active') {
      throw createError('Session is not active', 400);
    }
    const before = snapshotLean(session as unknown as Record<string, unknown>);
    const updated = await GameSession.findByIdAndUpdate(
      parsed.data.sessionId,
      { $set: { status: 'abandoned' } },
      { new: true }
    ).lean();
    if (!updated) throw createError('Session not found', 404);
    await writeAuditLog(req, {
      action: 'user.session.end',
      target: String(session._id),
      before,
      after: snapshotLean(updated as unknown as Record<string, unknown>),
      reason: parsed.data.reason,
    });
    res.json(updated);
  })
);

export default router;
