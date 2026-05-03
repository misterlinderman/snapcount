import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditLog, Card, MatchupMatrix } from '../models';
import { invalidateContentCache } from '../game/content/loader';
import { createApp } from '../app';
import { seedTestCatalog, wipeAllCollections } from './helpers/catalogSeed';

vi.mock('../middleware/auth', () => ({
  checkJwt: (
    req: {
      auth?: unknown;
      headers: import('http').IncomingHttpHeaders;
    },
    res: { status: (n: number) => { json: (b: unknown) => typeof res; end: () => void } },
    next: () => void
  ): void => {
    const rawSub = req.headers['x-test-sub'];
    const sub = Array.isArray(rawSub) ? rawSub[0] : rawSub;
    if (!sub || typeof sub !== 'string') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const rawAdmin = req.headers['x-test-admin'];
    const isAdmin = rawAdmin !== undefined && rawAdmin !== '0' && rawAdmin !== 'false';
    req.auth = {
      payload: {
        sub,
        email: `${sub}@test.local`,
        'https://snapcount/roles': isAdmin ? ['admin', 'user'] : ['user'],
      },
    };
    next();
  },
  extractUserId: (req: { auth?: { payload?: { sub?: string } } }): string | null =>
    req.auth?.payload?.sub ?? null,
  optionalAuth: (_req: unknown, _res: unknown, next: () => void): void => next(),
}));

const app = createApp();

describe('Admin catalog API', () => {
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

  it('GET /api/admin/cards returns 403 for non-admin', async () => {
    await request(app).get('/api/admin/cards').set('x-test-sub', 'auth0|u1').expect(403);
  });

  it('GET /api/admin/audit/latest returns most recent card action after admin write', async () => {
    const newId = 'audit-test-card';
    await request(app)
      .post('/api/admin/cards')
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .send({
        _id: newId,
        side: 'offense',
        type: 'run-in',
        name: 'Audit Test',
        basePower: 3,
        rarity: 'common',
        isActive: true,
      })
      .expect(201);

    const res = await request(app)
      .get('/api/admin/audit/latest')
      .query({ scope: 'cards' })
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .expect(200);

    expect(res.body).toMatchObject({
      actor: 'auth0|admin1',
      action: 'card.create',
      target: newId,
    });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /api/admin/cards lists all cards for admin', async () => {
    const res = await request(app)
      .get('/api/admin/cards')
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/admin/cards creates, audits, and bumps matrix version', async () => {
    const beforeMatrix = await MatchupMatrix.findById('singleton').lean();
    const v0 = beforeMatrix?.version ?? 0;

    const newId = 'test-card-admin-1';
    await request(app)
      .post('/api/admin/cards')
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .send({
        _id: newId,
        side: 'offense',
        type: 'run-in',
        name: 'Admin Test Dive',
        basePower: 4,
        rarity: 'common',
        isActive: true,
      })
      .expect(201);

    const created = await Card.findById(newId).lean();
    expect(created?.name).toBe('Admin Test Dive');

    const log = await AuditLog.findOne({ action: 'card.create', target: newId }).lean();
    expect(log?.actor).toBe('auth0|admin1');
    expect(log?.after).toMatchObject({ _id: newId, name: 'Admin Test Dive' });

    const afterMatrix = await MatchupMatrix.findById('singleton').lean();
    expect((afterMatrix?.version ?? 0)).toBe(v0 + 1);
  });

  it('GET /api/admin/cards hides inactive unless includeInactive=true; /api/content/cards omits inactive', async () => {
    const id = 'hb-dive';
    await request(app)
      .delete(`/api/admin/cards/${encodeURIComponent(id)}`)
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .expect(200);

    const activeOnly = await request(app)
      .get('/api/admin/cards')
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .expect(200);
    expect(activeOnly.body.some((c: { _id: string }) => c._id === id)).toBe(false);

    const withInactive = await request(app)
      .get('/api/admin/cards')
      .query({ includeInactive: 'true' })
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .expect(200);
    const retired = withInactive.body.find((c: { _id: string }) => c._id === id);
    expect(retired).toBeTruthy();
    expect(retired.isActive).toBe(false);

    const contentRes = await request(app).get('/api/content/cards').expect(200);
    expect(contentRes.body.some((c: { _id: string }) => c._id === id)).toBe(false);
  });

  it('PUT /api/admin/cards/:id bumps matrix version', async () => {
    const card = await Card.findOne({ _id: 'hb-dive' }).lean();
    expect(card).toBeTruthy();

    const vBefore = (await MatchupMatrix.findById('singleton').lean())?.version ?? 0;

    await request(app)
      .put(`/api/admin/cards/${encodeURIComponent('hb-dive')}`)
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .send({ basePower: (card!.basePower as number) + 1 })
      .expect(200);

    const vAfter = (await MatchupMatrix.findById('singleton').lean())?.version ?? 0;
    expect(vAfter).toBe(vBefore + 1);
  });

  it('DELETE /api/admin/cards/:id soft-deletes and logs deactivate', async () => {
    const card = await Card.findOne({}).lean();
    expect(card).toBeTruthy();
    const id = card!._id;

    await request(app)
      .delete(`/api/admin/cards/${encodeURIComponent(id)}`)
      .set('x-test-sub', 'auth0|admin1')
      .set('x-test-admin', '1')
      .expect(200);

    const updated = await Card.findById(id).lean();
    expect(updated?.isActive).toBe(false);

    const log = await AuditLog.findOne({ action: 'card.deactivate', target: id }).lean();
    expect(log).toBeTruthy();
  });
});
