import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomUUID } from 'node:crypto';
import { GameSession } from '../models';
import { invalidateContentCache } from '../game/content/loader';
import { createApp } from '../app';
import { seedTestCatalog, wipeAllCollections } from './helpers/catalogSeed';
import { createUserWithStarterDeck } from './helpers/testFixtures';

vi.mock('../middleware/auth', () => ({
  checkJwt: (
    req: {
      auth?: unknown;
      headers: import('http').IncomingHttpHeaders;
    },
    res: { status: (n: number) => { json: (b: unknown) => typeof res; end: () => void } },
    next: () => void
  ): void => {
    const raw = req.headers['x-test-sub'];
    const sub = Array.isArray(raw) ? raw[0] : raw;
    if (!sub || typeof sub !== 'string') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    req.auth = {
      payload: {
        sub,
        email: `${sub}@test.local`,
        'https://snapcount/roles': ['user'],
      },
    };
    next();
  },
  extractUserId: (req: { auth?: { payload?: { sub?: string } } }): string | null =>
    req.auth?.payload?.sub ?? null,
  optionalAuth: (_req: unknown, _res: unknown, next: () => void): void => next(),
}));

const app = createApp();

describe('POST /api/sessions (integration)', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    await mongoose.connect(process.env.MONGODB_URI);
  }, 60_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  }, 30_000);

  beforeEach(async () => {
    await wipeAllCollections();
    await seedTestCatalog();
    invalidateContentCache();
  });

  it('happy path: create session, coin toss, five snaps with next-play between', async () => {
    const userId = 'auth0|happy-path';
    const { deckId } = await createUserWithStarterDeck(userId);

    const created = await request(app)
      .post('/api/sessions')
      .set('x-test-sub', userId)
      .send({ deckId })
      .expect(201);

    const sessionId = created.body._id as string;
    expect(created.body.phase).toBe('coin-toss');

    await request(app)
      .post(`/api/sessions/${sessionId}/coin-toss`)
      .set('x-test-sub', userId)
      .send({ side: 'offense' })
      .expect(200);

    const afterToss = await request(app).get(`/api/sessions/${sessionId}`).set('x-test-sub', userId).expect(200);
    expect(afterToss.body.phase).toBe('play');
    expect(afterToss.body.hand?.cards?.length).toBeGreaterThan(0);

    const initialDowns = afterToss.body.game.totalDowns as number;

    for (let i = 0; i < 5; i++) {
      const st = await request(app).get(`/api/sessions/${sessionId}`).set('x-test-sub', userId).expect(200);
      const hand = st.body.hand as { cards: string[]; playmaker: string };
      const snapRes = await request(app)
        .post(`/api/sessions/${sessionId}/snap`)
        .set('x-test-sub', userId)
        .send({
          playId: randomUUID(),
          cardId: hand.cards[0],
          playmakerId: hand.playmaker,
        })
        .expect(200);

      expect(Array.isArray(snapRes.body.events)).toBe(true);
      expect(snapRes.body.events.length).toBeGreaterThan(0);

      if (i < 4) {
        await request(app)
          .post(`/api/sessions/${sessionId}/next-play`)
          .set('x-test-sub', userId)
          .expect(200);
      }
    }

    const final = await request(app).get(`/api/sessions/${sessionId}`).set('x-test-sub', userId).expect(200);
    expect(final.body.game.totalDowns as number).toBeGreaterThan(initialDowns);
  });

  it('idempotency: same playId and body returns same result and does not append duplicate log rows', async () => {
    const userId = 'auth0|idem';
    const { deckId } = await createUserWithStarterDeck(userId);

    const { body: created } = await request(app)
      .post('/api/sessions')
      .set('x-test-sub', userId)
      .send({ deckId })
      .expect(201);

    const sessionId = created._id as string;

    await request(app)
      .post(`/api/sessions/${sessionId}/coin-toss`)
      .set('x-test-sub', userId)
      .send({ side: 'offense' })
      .expect(200);

    const st = await request(app).get(`/api/sessions/${sessionId}`).set('x-test-sub', userId).expect(200);
    const hand = st.body.hand as { cards: string[]; playmaker: string };
    const playId = '00000000-0000-4000-8000-000000000099';
    const body = { playId, cardId: hand.cards[0], playmakerId: hand.playmaker };

    const first = await request(app)
      .post(`/api/sessions/${sessionId}/snap`)
      .set('x-test-sub', userId)
      .send(body)
      .expect(200);

    const mid = await GameSession.findById(sessionId).lean();
    const logLen = mid?.events?.length ?? 0;

    const second = await request(app)
      .post(`/api/sessions/${sessionId}/snap`)
      .set('x-test-sub', userId)
      .send(body)
      .expect(200);

    expect(second.body).toEqual(first.body);

    const after = await GameSession.findById(sessionId).lean();
    expect(after?.events?.length).toBe(logLen);
  });

  it('forbids user B from reading user A session', async () => {
    const userA = 'auth0|user-a';
    const userB = 'auth0|user-b';
    const { deckId } = await createUserWithStarterDeck(userA);
    await createUserWithStarterDeck(userB);

    const { body } = await request(app)
      .post('/api/sessions')
      .set('x-test-sub', userA)
      .send({ deckId })
      .expect(201);

    await request(app).get(`/api/sessions/${body._id}`).set('x-test-sub', userB).expect(404);
  });

  it('snap with card not in hand returns 400 card_not_in_hand', async () => {
    const userId = 'auth0|bad-card';
    const { deckId } = await createUserWithStarterDeck(userId);

    const { body } = await request(app)
      .post('/api/sessions')
      .set('x-test-sub', userId)
      .send({ deckId })
      .expect(201);

    await request(app)
      .post(`/api/sessions/${body._id}/coin-toss`)
      .set('x-test-sub', userId)
      .send({ side: 'offense' })
      .expect(200);

    const st = await request(app).get(`/api/sessions/${body._id}`).set('x-test-sub', userId).expect(200);
    const pm = (st.body.hand as { playmaker: string }).playmaker;

    const res = await request(app)
      .post(`/api/sessions/${body._id}/snap`)
      .set('x-test-sub', userId)
      .send({
        playId: randomUUID(),
        cardId: 'this-card-is-not-in-hand-xx',
        playmakerId: pm,
      })
      .expect(400);

    expect(res.body.message).toBe('card_not_in_hand');
  });

  it('second POST /api/sessions while active returns 409', async () => {
    const userId = 'auth0|double-session';
    const { deckId } = await createUserWithStarterDeck(userId);

    await request(app).post('/api/sessions').set('x-test-sub', userId).send({ deckId }).expect(201);

    const res = await request(app)
      .post('/api/sessions')
      .set('x-test-sub', userId)
      .send({ deckId })
      .expect(409);

    expect(res.body.message).toBe('active_session_exists');
  });
});
