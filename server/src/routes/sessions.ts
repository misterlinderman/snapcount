import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { GameSession, Deck, Card } from '../models';
import type { IGameSession } from '../models/GameSession';
import type { GameEvent } from '../game/types';
import { loadGameContentForApi } from '../game/content/loadForApi';
import { reduceGame } from '../game/engine/reducers';
import { rngFromPlay, sessionRng } from '../services/sessionRng';
import type { IDeck } from '../models/Deck';
import {
  appendAcquisition,
  applyDeckCuts,
  DECK_CARD_CAP,
  removeLastNAcquisitions,
  totalDeckCardCopies,
} from '../services/deckOps';
import {
  applyGameStateToSession,
  sessionToGameState,
  deckToEngine,
  defaultGameSlice,
} from '../services/sessionState';
import {
  coinTossBodySchema,
  createSessionBodySchema,
  fieldGoalBodySchema,
  lockerDraftBodySchema,
  lockerRecruitBodySchema,
  lockerUpgradeBodySchema,
  snapBodySchema,
  tdRewardBodySchema,
} from './sessions/schema';
import { snapRateLimiter } from '../middleware/snapRateLimit';

const router = Router();

router.use(checkJwt);

const TD_API_TO_ENGINE: Record<string, string> = {
  'power-boost': 'td-power-boost-2',
  'star-playmaker': 'td-star-pm',
  'draft-point': 'td-dp-1',
  'hail-mary': 'td-hail-mary-card',
};

function requireUserId(req: AuthRequest): string {
  const userId = extractUserId(req);
  if (!userId) {
    throw createError('Unauthorized', 401);
  }
  return userId;
}

function formatSession(session: IGameSession): Record<string, unknown> {
  return session.toObject({ versionKey: false }) as Record<string, unknown>;
}

function snapApiResponse(session: IGameSession, events: GameEvent[]): { state: Record<string, unknown>; events: GameEvent[] } {
  return {
    state: {
      game: session.game,
      hand: session.hand,
      cpuHand: session.cpuHand,
      pendingAdvance: session.pendingAdvance,
      phase: session.phase,
      season: session.season,
    },
    events,
  };
}

async function getOwnedSession(userId: string, sessionId: string): Promise<IGameSession> {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw createError('Session not found', 404);
  }
  const session = await GameSession.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw createError('Session not found', 404);
  }
  return session;
}

function mapEngineError(e: unknown): never {
  if (e instanceof Error) {
    if (e.message.includes('not in hand') || e.message.includes('select:')) {
      throw createError('card_not_in_hand', 400);
    }
    if (e.message.includes('select card and playmaker')) {
      throw createError('card_not_in_hand', 400);
    }
    if (e.message.includes('advance pending')) {
      throw createError('Resolve the current play before snapping again', 400);
    }
    if (e.message.startsWith('redraw:')) {
      if (e.message.includes('insufficient')) {
        throw createError('Redraw costs 1 DP', 400);
      }
      if (e.message.includes('only one redraw')) {
        throw createError('Only one redraw per possession', 400);
      }
      if (e.message.includes('resolve the current')) {
        throw createError('Resolve the current play before redrawing', 400);
      }
    }
    if (e.message.startsWith('field_goal:')) {
      if (e.message.includes('advance pending')) {
        throw createError('Resolve the current play first', 400);
      }
      if (e.message.includes('user must be on offense')) {
        throw createError('Field goal only when your team has the ball', 400);
      }
      if (e.message.includes('4th down only')) {
        throw createError('Field goal only on 4th down', 400);
      }
    }
    if (e.message.includes('dealSideFromDeck: no active playmakers')) {
      throw createError(
        'Your deck has no playmakers that match the current catalog for offense or defense. Open the locker room and assign playmakers, or run npm run seed if the catalog is empty.',
        400
      );
    }
  }
  throw e;
}

router.get(
  '/active',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await GameSession.findOne({ user: userId, status: 'active' }).sort({ updatedAt: -1 });
    if (!session) {
      res.status(204).end();
      return;
    }
    res.json(formatSession(session));
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const parsed = createSessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }

    const active = await GameSession.findOne({ user: userId, status: 'active' });
    if (active) {
      throw createError('active_session_exists', 409);
    }

    const deck = await Deck.findOne({ _id: parsed.data.deckId, user: userId });
    if (!deck) {
      throw createError('Deck not found', 404);
    }

    const session = await GameSession.create({
      user: userId,
      deck: String(deck._id),
      status: 'active',
      phase: 'coin-toss',
      season: { node: 1, wins: 0, losses: 0 },
      game: defaultGameSlice(),
      events: [],
    });

    res.status(201).json(formatSession(session));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    res.json(formatSession(session));
  })
);

router.post(
  '/:id/coin-toss',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active') {
      throw createError('Session is not active', 400);
    }
    if (session.phase !== 'coin-toss') {
      throw createError('Coin toss already completed', 400);
    }

    const parsed = coinTossBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }

    const deckDoc = await Deck.findById(session.deck);
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }

    const content = await loadGameContentForApi();
    const deckE = deckToEngine(deckDoc);
    const rng = sessionRng();
    let state = sessionToGameState(session);

    try {
      let r = reduceGame(state, { type: 'COIN_TOSS_PICK', side: parsed.data.side }, content, rng, deckE);
      state = r.state;
      r = reduceGame(state, { type: 'DEAL_HAND' }, content, rng, deckE);
      state = r.state;
    } catch (e) {
      mapEngineError(e);
    }

    applyGameStateToSession(session, state);
    session.phase = 'play';
    await session.save();
    res.json(formatSession(session));
  })
);

router.post(
  '/:id/snap',
  snapRateLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active') {
      throw createError('Session is not active', 400);
    }
    if (session.phase !== 'play') {
      throw createError('Snaps are only available during active play', 400);
    }

    const parsed = snapBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }
    const { playId, cardId, playmakerId } = parsed.data;

    const rawIdem = session.idempotencyByPlayId as
      | Record<string, { cardId: string; playmakerId: string; response: unknown }>
      | undefined;
    const idem = rawIdem?.[playId];
    if (idem) {
      if (idem.cardId !== cardId || idem.playmakerId !== playmakerId) {
        throw createError('idempotency_conflict', 409);
      }
      res.json(idem.response);
      return;
    }

    const inHand =
      session.hand?.cards.includes(cardId) && session.hand.playmaker === playmakerId;
    if (!inHand) {
      throw createError('card_not_in_hand', 400);
    }

    const deckDoc = await Deck.findById(session.deck);
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }

    const content = await loadGameContentForApi();
    const deckE = deckToEngine(deckDoc);
    const rngPlay = rngFromPlay(String(session._id), playId);
    let state = sessionToGameState(session);

    try {
      let r = reduceGame(state, { type: 'SELECT_CARD', cardId }, content, rngPlay, deckE);
      state = r.state;
      r = reduceGame(state, { type: 'SELECT_PM', playmakerId }, content, rngPlay, deckE);
      state = r.state;
      r = reduceGame(state, { type: 'SNAP', playId }, content, rngPlay, deckE);
      state = r.state;
      applyGameStateToSession(session, state);

      const q = state.quarter;
      const d = state.down;
      for (const ev of r.events) {
        session.events.push({
          playId,
          timestamp: new Date(),
          quarter: q,
          down: d,
          type: ev.type,
          payload: { ...(ev as unknown as Record<string, unknown>) },
        });
      }

      const response = snapApiResponse(session, r.events);
      session.recentPlayIds = [...session.recentPlayIds.filter((x) => x !== playId), playId].slice(-5);
      const trimmed: Record<string, { cardId: string; playmakerId: string; response: unknown }> = {};
      for (const k of session.recentPlayIds) {
        if (k === playId) {
          continue;
        }
        if (rawIdem?.[k]) {
          trimmed[k] = rawIdem[k];
        }
      }
      trimmed[playId] = { cardId, playmakerId, response };
      session.idempotencyByPlayId = trimmed;
      session.markModified('idempotencyByPlayId');

      await session.save();
      res.json(response);
    } catch (e) {
      mapEngineError(e);
    }
  })
);

router.post(
  '/:id/redraw',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'play') {
      throw createError('Redraw not available', 400);
    }
    if (session.pendingAdvance != null) {
      throw createError('Advance the play before redrawing', 400);
    }

    const deckDoc = await Deck.findById(session.deck);
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }

    const content = await loadGameContentForApi();
    const deckE = deckToEngine(deckDoc);
    const state = sessionToGameState(session);

    try {
      const r = reduceGame(state, { type: 'REDRAW' }, content, sessionRng(), deckE);
      applyGameStateToSession(session, r.state);
    } catch (e) {
      mapEngineError(e);
    }

    await session.save();
    res.json(formatSession(session));
  })
);

router.post(
  '/:id/field-goal',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'play') {
      throw createError('Field goal not available', 400);
    }
    if (session.pendingAdvance != null) {
      throw createError('Resolve the current play first', 400);
    }

    const parsed = fieldGoalBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }

    const deckDoc = await Deck.findById(session.deck);
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }

    const content = await loadGameContentForApi();
    const deckE = deckToEngine(deckDoc);
    const state = sessionToGameState(session);
    const rng = rngFromPlay(String(session._id), parsed.data.playId);

    let fgEvents: GameEvent[] = [];
    try {
      const r = reduceGame(state, { type: 'FIELD_GOAL' }, content, rng, deckE);
      applyGameStateToSession(session, r.state);
      fgEvents = r.events;
    } catch (e) {
      mapEngineError(e);
    }

    await session.save();
    res.json(snapApiResponse(session, fgEvents));
  })
);

router.post(
  '/:id/next-play',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'play') {
      throw createError('next_play not available', 400);
    }

    const deckDoc = await Deck.findById(session.deck);
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }

    const content = await loadGameContentForApi();
    const deckE = deckToEngine(deckDoc);
    const state = sessionToGameState(session);

    try {
      const r = reduceGame(state, { type: 'NEXT_PLAY' }, content, sessionRng(), deckE);
      applyGameStateToSession(session, r.state);
    } catch (e) {
      mapEngineError(e);
    }

    await session.save();
    res.json(formatSession(session));
  })
);

router.post(
  '/:id/td-reward',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'play') {
      throw createError('TD reward not available', 400);
    }

    const parsed = tdRewardBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }

    const pa = session.pendingAdvance as { events?: Array<{ type: string }> } | null;
    const hasTd = pa?.events?.some((e) => e.type === 'TOUCHDOWN');
    if (!hasTd) {
      throw createError('No touchdown reward pending', 400);
    }

    const engineReward = TD_API_TO_ENGINE[parsed.data.rewardId];
    const content = await loadGameContentForApi();
    const state = sessionToGameState(session);

    try {
      const r = reduceGame(state, { type: 'PICK_TD_REWARD', rewardId: engineReward }, content, sessionRng());
      applyGameStateToSession(session, r.state);
    } catch (e) {
      mapEngineError(e);
    }

    await session.save();
    res.json(formatSession(session));
  })
);

router.post(
  '/:id/end',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active') {
      throw createError('Session is not active', 400);
    }
    if (session.phase === 'locker') {
      throw createError('Game already ended', 400);
    }
    if (session.game.gameWinner == null) {
      throw createError('Game not finished', 400);
    }

    const won = session.game.gameWinner === session.game.playerSide;
    const dpEarned = (session.game.dp ?? 0) + (won ? 3 : 0);

    const deckDoc = await Deck.findById(session.deck);
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }
    deckDoc.dp += dpEarned;

    if (!won) {
      const red = session.game.scoreRed;
      const blue = session.game.scoreBlue;
      const playerScore = session.game.playerSide === 'red' ? red : blue;
      const oppScore = session.game.playerSide === 'red' ? blue : red;
      if (oppScore - playerScore >= 14) {
        removeLastNAcquisitions(deckDoc, 3);
      }
    }

    await deckDoc.save();

    if (won) {
      session.season.wins += 1;
    } else {
      session.season.losses += 1;
    }

    session.phase = 'locker';
    await session.save();

    res.json({
      winner: session.game.gameWinner,
      dpEarned,
      totals: {
        scoreRed: session.game.scoreRed,
        scoreBlue: session.game.scoreBlue,
      },
    });
  })
);

router.post(
  '/:id/locker/draft',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'locker') {
      throw createError('Locker is not open', 400);
    }

    const parsed = lockerDraftBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }

    const content = await loadGameContentForApi();
    const catalogCard = content.cards.get(parsed.data.cardId);
    const doc = catalogCard ? null : await Card.findById(parsed.data.cardId).lean();
    const card = catalogCard ?? doc;
    if (!card || !card.isActive) {
      throw createError('Card not found', 404);
    }
    const cost = card.draftCost != null ? card.draftCost : 1;
    const deckDoc = await Deck.findOne({ _id: session.deck, user: userId });
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }
    if (deckDoc.dp < cost) {
      throw createError('insufficient_dp', 400);
    }

    const cuts = parsed.data.cutCardIds;
    const trial = JSON.parse(JSON.stringify(deckDoc.toObject({ versionKey: false }))) as IDeck;
    try {
      applyDeckCuts(trial, cuts);
    } catch {
      throw createError('cut: one or more cards are not in your deck', 400);
    }
    if (totalDeckCardCopies(trial) + 1 > DECK_CARD_CAP) {
      throw createError(`Deck holds at most ${DECK_CARD_CAP} cards. Cut more copies before drafting.`, 400);
    }

    deckDoc.dp -= cost;
    applyDeckCuts(deckDoc, cuts);
    const row = { cardId: String(card._id), count: 1 };
    if (card.side === 'offense') {
      deckDoc.offense.push(row);
    } else {
      deckDoc.defense.push(row);
    }
    appendAcquisition(deckDoc, String(card._id));

    await deckDoc.save();
    res.json({ session: formatSession(session), deck: deckDoc.toObject({ versionKey: false }) });
  })
);

router.post(
  '/:id/locker/upgrade',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'locker') {
      throw createError('Locker is not open', 400);
    }

    const parsed = lockerUpgradeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }

    const content = await loadGameContentForApi();
    const upgrade = content.upgrades.get(parsed.data.upgradeId);
    if (!upgrade || !upgrade.isActive) {
      throw createError('Upgrade not found', 404);
    }
    if (upgrade.baseCardId !== parsed.data.cardId) {
      throw createError('Upgrade does not apply to this card', 400);
    }

    const deckDoc = await Deck.findOne({ _id: session.deck, user: userId });
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }
    if (deckDoc.dp < upgrade.dpCost) {
      throw createError('insufficient_dp', 400);
    }

    const { cardId, upgradeId } = parsed.data;
    const apply = (rows: typeof deckDoc.offense): boolean => {
      const idx = rows.findIndex((r) => r.cardId === cardId && !r.upgradeId);
      if (idx === -1) {
        return false;
      }
      rows[idx].upgradeId = upgradeId;
      return true;
    };

    if (!apply(deckDoc.offense) && !apply(deckDoc.defense)) {
      throw createError('Card not in deck or already has an upgrade', 400);
    }

    deckDoc.dp -= upgrade.dpCost;
    await deckDoc.save();
    res.json({ session: formatSession(session), deck: deckDoc.toObject({ versionKey: false }) });
  })
);

router.post(
  '/:id/locker/recruit',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'locker') {
      throw createError('Locker is not open', 400);
    }

    const parsed = lockerRecruitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      throw createError(msg, 400);
    }

    const content = await loadGameContentForApi();
    const pm = content.playmakers.get(parsed.data.playmakerId);
    if (!pm || !pm.isActive) {
      throw createError('Playmaker not found', 404);
    }
    if (pm.recruitCost == null) {
      throw createError('Playmaker is not recruitable', 400);
    }

    const deckDoc = await Deck.findOne({ _id: session.deck, user: userId });
    if (!deckDoc) {
      throw createError('Deck not found', 404);
    }
    if (deckDoc.dp < pm.recruitCost) {
      throw createError('insufficient_dp', 400);
    }

    if (pm.side === 'offense') {
      if (deckDoc.offPlaymakers.includes(pm._id)) {
        throw createError('Playmaker already on roster', 400);
      }
      if (deckDoc.offPlaymakers.length >= 5) {
        throw createError('Offensive playbook is full', 400);
      }
      deckDoc.offPlaymakers.push(pm._id);
    } else {
      if (deckDoc.defPlaymakers.includes(pm._id)) {
        throw createError('Playmaker already on roster', 400);
      }
      if (deckDoc.defPlaymakers.length >= 5) {
        throw createError('Defensive playbook is full', 400);
      }
      deckDoc.defPlaymakers.push(pm._id);
    }

    deckDoc.dp -= pm.recruitCost;
    await deckDoc.save();
    res.json({ session: formatSession(session), deck: deckDoc.toObject({ versionKey: false }) });
  })
);

router.post(
  '/:id/locker/close',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active' || session.phase !== 'locker') {
      throw createError('Locker is not open', 400);
    }

    const finishedNode = session.season.node;
    session.game = defaultGameSlice();
    session.hand = undefined;
    session.cpuHand = undefined;
    session.pendingAdvance = undefined;

    if (finishedNode >= 5) {
      session.status = 'completed';
      session.result = session.season.wins >= 5 ? 'won' : 'lost';
      session.completedAt = new Date();
    } else {
      session.season.node = (finishedNode + 1) as 1 | 2 | 3 | 4 | 5;
      session.phase = 'coin-toss';
    }

    await session.save();
    res.json(formatSession(session));
  })
);

router.post(
  '/:id/abandon',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = requireUserId(req);
    const session = await getOwnedSession(userId, req.params.id);
    if (session.status !== 'active') {
      throw createError('Session is not active', 400);
    }
    session.status = 'abandoned';
    session.completedAt = new Date();
    await session.save();
    res.json({ ok: true });
  })
);

export default router;
