import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { User, Deck } from '../models';
import type { IUser } from '../models/User';
import { buildStarterDeckRows } from '../services/starterDeck';
import { updateMeBodySchema } from './users/schema';

const router = Router();

const ROLES_CLAIM = 'https://snapcount/roles';

function jwtPayload(req: AuthRequest): Record<string, unknown> | null {
  const payload = req.auth?.payload as Record<string, unknown> | undefined;
  if (!payload || typeof payload.sub !== 'string') {
    return null;
  }
  return payload;
}

function emailFromPayload(payload: Record<string, unknown>): string {
  const raw = payload.email ?? payload['https://snapcount/email'];
  if (typeof raw !== 'string' || !raw.trim()) {
    return '';
  }
  return raw.trim().toLowerCase();
}

function displayNameFromClaims(payload: Record<string, unknown>, fallbackEmailLocal: string): string {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim() : '';
  return name || nickname || fallbackEmailLocal || 'Player';
}

function roleFromPayload(payload: Record<string, unknown>): 'user' | 'admin' {
  const rolesRaw = payload[ROLES_CLAIM];
  const roles = Array.isArray(rolesRaw) ? rolesRaw.filter((r): r is string => typeof r === 'string') : [];
  return roles.includes('admin') ? 'admin' : 'user';
}

router.use(checkJwt);

router.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const payload = jwtPayload(req);
    if (!payload) {
      throw createError('Unauthorized', 401);
    }

    let email = emailFromPayload(payload);
    if (!email) {
      if (process.env.NODE_ENV !== 'production') {
        email = `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}@dev.local`;
      } else {
        throw createError(
          'Token missing email claim. Add scope "openid profile email" to the SPA and ensure an Auth0 Action adds email to the access token if needed.',
          400
        );
      }
    }

    const role = roleFromPayload(payload);
    const fallbackLocal = email.includes('@') ? email.slice(0, email.indexOf('@')) : email;
    const displayNameNewUser = displayNameFromClaims(payload, fallbackLocal);

    let user = await User.findById(userId);

    if (!user) {
      const starter = buildStarterDeckRows();
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const [deck] = await Deck.create(
            [
              {
                user: userId,
                name: 'My Team',
                isDefault: true,
                offense: starter.offense,
                defense: starter.defense,
                offPlaymakers: starter.offPlaymakers,
                defPlaymakers: starter.defPlaymakers,
                cardAcquisitionOrder: starter.cardAcquisitionOrder,
                dp: 0,
              },
            ],
            { session }
          );
          const deckId = String(deck._id);
          await User.create(
            [
              {
                _id: userId,
                email,
                displayName: displayNameNewUser,
                role,
                defaultDeck: deckId,
              },
            ],
            { session }
          );
        });
      } finally {
        session.endSession();
      }

      user = await User.findById(userId);
      if (!user) {
        throw createError('Failed to create user', 500);
      }
    } else {
      const updates: Partial<Pick<IUser, 'email' | 'role'>> = {};
      if (user.email !== email) {
        updates.email = email;
      }
      if (user.role !== role) {
        updates.role = role;
      }
      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
        if (!user) {
          throw createError('User not found', 404);
        }
      }
    }

    res.json(user);
  })
);

router.put(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const parsed = updateMeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid body';
      throw createError(msg, 400);
    }

    const { displayName } = parsed.data;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { displayName } },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json(user);
  })
);

router.delete(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);

    if (!userId) {
      throw createError('Unauthorized', 401);
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({ message: 'User deleted successfully' });
  })
);

export default router;
