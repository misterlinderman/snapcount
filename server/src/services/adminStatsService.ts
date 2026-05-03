import { AuditLog, GameSession, User } from '../models';

const MS_PER_DAY = 86_400_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface CardWinRateRow {
  cardId: string;
  winRate: number;
  playCount: number;
}

export interface MatchupYardRow {
  off: string;
  def: string;
  avgYards: number;
  count: number;
}

/** GET /api/admin/stats payload (API.md + dashboard extensions). */
export interface AdminStatsPayload {
  asOf: string;
  users: {
    total: number;
    activeLast7d: number;
    activeLast24h: number;
    /** Oldest → newest UTC day, distinct users with a logged event that day. */
    sparkline7d: number[];
  };
  sessions: {
    active: number;
    completedLast7d: number;
    byNode: Record<string, number>;
  };
  balance: {
    cardWinRates: CardWinRateRow[];
    matchupYardAvg: MatchupYardRow[];
  };
  recentAudit: unknown[];
}

let cache: { expiresAt: number; payload: AdminStatsPayload } | null = null;

export function invalidateAdminStatsCache(): void {
  cache = null;
}

export async function getAdminStatsPayload(nowMs: number): Promise<AdminStatsPayload> {
  if (cache && cache.expiresAt > nowMs) {
    return cache.payload;
  }
  const payload = await buildAdminStatsPayload(new Date(nowMs));
  cache = { expiresAt: nowMs + CACHE_TTL_MS, payload };
  return payload;
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Last 7 UTC calendar days ending today (inclusive), as YYYY-MM-DD oldest first. */
function last7UtcDayKeys(now: Date): string[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const day = now.getUTCDate();
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const t = Date.UTC(y, m, day - i);
    keys.push(utcYmd(new Date(t)));
  }
  return keys;
}

async function distinctUsersWithEventSince(since: Date): Promise<number> {
  const rows = await GameSession.aggregate<{ n: number }>([
    { $match: { events: { $elemMatch: { timestamp: { $gte: since } } } } },
    { $group: { _id: '$user' } },
    { $count: 'n' },
  ]);
  return rows[0]?.n ?? 0;
}

async function dailyDistinctUsersSeries(sinceStart: Date, dayKeys: string[]): Promise<number[]> {
  const agg = await GameSession.aggregate<{ _id: string; count: number }>([
    { $unwind: '$events' },
    { $match: { 'events.timestamp': { $gte: sinceStart } } },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$events.timestamp', timezone: 'UTC' } }, user: '$user' },
      },
    },
    { $group: { _id: '$_id.day', count: { $sum: 1 } } },
  ]);
  const map = new Map(agg.map((r) => [r._id, r.count]));
  return dayKeys.map((k) => map.get(k) ?? 0);
}

async function computeMatchupYardRows(since: Date): Promise<MatchupYardRow[]> {
  const agg = await GameSession.aggregate<{
    _id: { off: string; def: string };
    totalYards: number;
    count: number;
  }>([
    { $unwind: '$events' },
    {
      $match: {
        'events.type': 'PLAY_RESOLVED',
        'events.timestamp': { $gte: since },
      },
    },
    {
      $project: {
        off: '$events.payload.offense.type',
        def: '$events.payload.defense.type',
        yards: '$events.payload.yards',
      },
    },
    {
      $match: {
        off: { $type: 'string' },
        def: { $type: 'string' },
        yards: { $type: 'number' },
      },
    },
    {
      $group: {
        _id: { off: '$off', def: '$def' },
        totalYards: { $sum: '$yards' },
        count: { $sum: 1 },
      },
    },
  ]);

  return agg.map((row) => ({
    off: row._id.off,
    def: row._id.def,
    avgYards: row.count > 0 ? row.totalYards / row.count : 0,
    count: row.count,
  }));
}

async function computeCardWinRates(since: Date): Promise<CardWinRateRow[]> {
  const facet = await GameSession.aggregate<{
    offense: Array<{ _id: string; plays: number; wins: number }>;
    defense: Array<{ _id: string; plays: number; wins: number }>;
  }>([
    { $unwind: '$events' },
    {
      $match: {
        'events.type': 'PLAY_RESOLVED',
        'events.timestamp': { $gte: since },
      },
    },
    {
      $project: {
        yards: '$events.payload.yards',
        o: '$events.payload.offense.cardId',
        d: '$events.payload.defense.cardId',
      },
    },
    {
      $match: {
        o: { $type: 'string' },
        d: { $type: 'string' },
        yards: { $type: 'number' },
      },
    },
    {
      $facet: {
        offense: [
          {
            $group: {
              _id: '$o',
              plays: { $sum: 1 },
              wins: { $sum: { $cond: [{ $gte: ['$yards', 1] }, 1, 0] } },
            },
          },
        ],
        defense: [
          {
            $group: {
              _id: '$d',
              plays: { $sum: 1 },
              wins: { $sum: { $cond: [{ $lt: ['$yards', 0] }, 1, 0] } },
            },
          },
        ],
      },
    },
  ]);

  const f = facet[0];
  if (!f) return [];

  const merged = new Map<string, { plays: number; wins: number }>();
  for (const row of f.offense) {
    const c = merged.get(row._id) ?? { plays: 0, wins: 0 };
    c.plays += row.plays;
    c.wins += row.wins;
    merged.set(row._id, c);
  }
  for (const row of f.defense) {
    const c = merged.get(row._id) ?? { plays: 0, wins: 0 };
    c.plays += row.plays;
    c.wins += row.wins;
    merged.set(row._id, c);
  }

  return [...merged.entries()]
    .map(([cardId, { plays, wins }]) => ({
      cardId,
      playCount: plays,
      winRate: plays > 0 ? wins / plays : 0,
    }))
    .filter((x) => x.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount);
}

export async function buildAdminStatsPayload(now: Date): Promise<AdminStatsPayload> {
  const since7d = new Date(now.getTime() - 7 * MS_PER_DAY);
  const since24h = new Date(now.getTime() - MS_PER_DAY);
  const dayKeys = last7UtcDayKeys(now);
  const sparklineStart = new Date(Date.parse(`${dayKeys[0]}T00:00:00.000Z`));

  const [
    usersTotal,
    activeLast7d,
    activeLast24h,
    sparkline7d,
    activeSessions,
    completedLast7d,
    activeByNodeAgg,
    cardWinRates,
    matchupYardAvg,
    recentAudit,
  ] = await Promise.all([
    User.countDocuments(),
    distinctUsersWithEventSince(since7d),
    distinctUsersWithEventSince(since24h),
    dailyDistinctUsersSeries(sparklineStart, dayKeys),
    GameSession.countDocuments({ status: 'active' }),
    GameSession.countDocuments({
      status: 'completed',
      completedAt: { $gte: since7d },
    }),
    GameSession.aggregate<{ _id: number; count: number }>([
      { $match: { status: 'active' } },
      { $group: { _id: '$season.node', count: { $sum: 1 } } },
    ]),
    computeCardWinRates(since7d),
    computeMatchupYardRows(since7d),
    AuditLog.find().sort({ timestamp: -1 }).limit(10).lean(),
  ]);

  const byNode: Record<string, number> = {};
  for (const row of activeByNodeAgg) {
    byNode[String(row._id)] = row.count;
  }

  return {
    asOf: now.toISOString(),
    users: {
      total: usersTotal,
      activeLast7d,
      activeLast24h,
      sparkline7d,
    },
    sessions: {
      active: activeSessions,
      completedLast7d,
      byNode,
    },
    balance: {
      cardWinRates,
      matchupYardAvg,
    },
    recentAudit: recentAudit.map((d) => ({
      ...d,
      timestamp: d.timestamp instanceof Date ? d.timestamp.toISOString() : d.timestamp,
    })),
  };
}
