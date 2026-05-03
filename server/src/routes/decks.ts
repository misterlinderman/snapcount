import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Deck, User } from '../models';
import type { IDeck, IDeckCard } from '../models/Deck';
import { buildStarterDeckRows } from '../services/starterDeck';
import { createDeckBodySchema, updateDeckBodySchema } from './decks/schema';

const router = Router();

router.use(checkJwt);

function requireUserId(req: AuthRequest): string {
  const userId = extractUserId(req);
  if (!userId) {
    throw createError('Unauthorized', 401);
  }
  return userId;
}

function cloneRows(rows: IDeckCard[]): IDeckCard[] {
  return rows.map((r) => ({
    cardId: r.cardId,
    count: r.count,
    ...(r.upgradeId ? { upgradeId: r.upgradeId } : {}),
  }));
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const decks = await Deck.find({ user: userId }).sort({ updatedAt: -1 }).lean();
    res.json(decks);
  })
);

router.get(
  '/default',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const deck = await Deck.findOne({ user: userId, isDefault: true }).lean();
    if (!deck) {
      throw createError('Default deck not found', 404);
    }
    res.json(deck);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError('Deck not found', 404);
    }
    const deck = await Deck.findOne({ _id: id, user: userId }).lean();
    if (!deck) {
      throw createError('Deck not found', 404);
    }
    res.json(deck);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const parsed = createDeckBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body';
      throw createError(msg, 400);
    }
    const { name, copyFrom } = parsed.data;

    let payload: Pick<
      IDeck,
      'offense' | 'defense' | 'offPlaymakers' | 'defPlaymakers' | 'dp' | 'cardAcquisitionOrder'
    >;

    if (copyFrom) {
      if (!mongoose.Types.ObjectId.isValid(copyFrom)) {
        throw createError('Source deck not found', 404);
      }
      const source = await Deck.findOne({ _id: copyFrom, user: userId }).lean();
      if (!source) {
        throw createError('Source deck not found', 404);
      }
      payload = {
        offense: cloneRows(source.offense),
        defense: cloneRows(source.defense),
        offPlaymakers: [...source.offPlaymakers],
        defPlaymakers: [...source.defPlaymakers],
        dp: source.dp,
        cardAcquisitionOrder: [...(source.cardAcquisitionOrder ?? [])],
      };
    } else {
      const starter = buildStarterDeckRows();
      payload = {
        offense: starter.offense,
        defense: starter.defense,
        offPlaymakers: starter.offPlaymakers,
        defPlaymakers: starter.defPlaymakers,
        dp: 0,
        cardAcquisitionOrder: starter.cardAcquisitionOrder,
      };
    }

    const deck = await Deck.create({
      user: userId,
      name,
      isDefault: false,
      ...payload,
    });

    res.status(201).json(deck);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError('Deck not found', 404);
    }

    const parsed = updateDeckBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body';
      throw createError(msg, 400);
    }

    const body = parsed.data;

    const deck = await Deck.findOne({ _id: id, user: userId });
    if (!deck) {
      throw createError('Deck not found', 404);
    }

    if (body.name !== undefined) {
      deck.name = body.name;
    }

    if (body.isDefault !== undefined) {
      if (body.isDefault) {
        await Deck.updateMany({ user: userId, _id: { $ne: deck._id } }, { $set: { isDefault: false } });
        deck.isDefault = true;
        await User.findByIdAndUpdate(userId, { $set: { defaultDeck: String(deck._id) } });
      } else if (deck.isDefault) {
        throw createError('Cannot clear default on this deck; set another deck as default first', 400);
      }
    }

    await deck.save();
    res.json(deck);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError('Deck not found', 404);
    }

    const deck = await Deck.findOne({ _id: id, user: userId });
    if (!deck) {
      throw createError('Deck not found', 404);
    }

    const count = await Deck.countDocuments({ user: userId });
    if (count <= 1) {
      throw createError('Cannot delete the only deck', 400);
    }
    if (deck.isDefault) {
      throw createError('Cannot delete the default deck', 400);
    }

    await Deck.deleteOne({ _id: deck._id });
    res.status(204).send();
  })
);

export default router;
