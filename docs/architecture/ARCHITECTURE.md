# Architecture

> System overview for Snapcount / Gridiron Rogue. Read this before changing any boundary between client, server, engine, or database.

## High level

```
┌────────────────────────────────────────────────────────────────────┐
│                          BROWSER (client)                          │
│                                                                    │
│  React (Vite) ── Auth0 SPA SDK ── React Query ── GameSessionCtx   │
│       │                                                            │
│       │  axios (with Auth0 access token)                           │
│       ▼                                                            │
└───────┼────────────────────────────────────────────────────────────┘
        │  HTTPS  /api/*
        ▼
┌────────────────────────────────────────────────────────────────────┐
│                        EXPRESS (server)                            │
│                                                                    │
│  checkJwt ─► requireAdmin (admin only) ─► route handler            │
│                                              │                     │
│                                              ▼                     │
│                              ┌──────────────────────────────────┐  │
│                              │   Game engine (pure functions)   │  │
│                              │   (state, action, content, rng)  │  │
│                              │           → state, events        │  │
│                              └──────────────────────────────────┘  │
│                                              │                     │
│                                              ▼                     │
│                              ┌──────────────────────────────────┐  │
│                              │   Mongoose models                │  │
│                              │   User · Deck · GameSession      │  │
│                              │   Card · Playmaker · Matchup     │  │
│                              └──────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────────┐
│                      MONGODB (Atlas)                               │
└────────────────────────────────────────────────────────────────────┘
```

## Authority model

The server is the source of truth for game state. The client mirrors the engine for two reasons only: (1) optimistic UI on snap so the resolution panel can render before the network round-trip completes, and (2) showing matchup hints after a card is selected. Whenever the server's response disagrees with the optimistic state, the server wins and the client replaces its state.

The reason for this separation is straightforward: the value proposition of the rogue layer (DP earning, deck progression, season records) requires a tamper-proof economy. Anything the client controls is a number a player can edit in DevTools.

## Request flow — a snap

1. Player taps a card and a playmaker. `GameSessionContext` records the selection locally.
2. Player taps **Snap Play**. The client posts `POST /api/sessions/:id/snap` with `{ playId, cardId, playmakerId }`. `playId` is a UUID generated client-side for idempotency.
3. Optimistic: the client runs `resolveSnap` from `client/src/game/engine/` against the cached session state and renders the resolution panel immediately.
4. Server: `checkJwt` validates the JWT. The route loads the `GameSession` (scoped to the user). It fetches the relevant `Card`, `Playmaker`, and `MatchupMatrix` from cache. It picks a CPU card via the CPU strategy. It calls `resolveSnap` from `server/src/game/engine/` with a seeded RNG (seed = `sessionId + playId`).
5. The new state and the play log event are persisted to the `GameSession`. The server returns `{ state, events }`.
6. Client replaces optimistic state with server state. Animations driven from the events array. The resolution panel stays on screen until the player taps **Next Play**, which is a state transition only — no network call needed unless the play resulted in a touchdown, turnover, or game end.

## Game engine

The engine is two mirrored copies of the same TypeScript code: one canonical (server) and one for optimistic UI (client). Strategies for keeping them in sync, in order of preference:

1. **Shared package** (`packages/engine` workspace) — preferred long-term.
2. **Symlink + path alias** — fine until the project grows.
3. **Manual mirror** — acceptable for v1.0 if both files are kept lean and a CI test pins them as byte-equal.

Either way, the engine is pure. It takes `(state, action, content, rng)` and returns `{ state, events }`. It never reads from the network, the DOM, the file system, or the clock.

### State

```typescript
interface GameState {
  // Match
  scoreRed: number;
  scoreBlue: number;
  quarter: 1 | 2 | 3 | 4;
  totalDowns: number;          // counts up; 8 per quarter
  ballYard: number;            // 0–100, Red endzone at 0
  possession: 'red' | 'blue';
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  playerSide: 'red' | 'blue';  // which team the user controls

  // Hand state — for the side currently selecting
  hand: HandState;
  cpu: HandState;

  // Run-level
  pendingAdvance: SnapResult | null;
  filmStudyActive: boolean;
  lastThreeTypes: CardType[];

  // Season
  rogueWins: number;
  rogueGames: number;
  dp: number;
  perGameBuffs: { powerBoost: number; starPMBoost: number };
}
```

### Actions

```typescript
type GameAction =
  | { type: 'COIN_TOSS_PICK'; side: 'offense' | 'defense' }
  | { type: 'DEAL_HAND' }
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'SELECT_PM'; playmakerId: string }
  | { type: 'REDRAW' }
  | { type: 'SNAP'; playId: string }
  | { type: 'NEXT_PLAY' }
  | { type: 'PICK_TD_REWARD'; rewardId: string }
  | { type: 'LOCKER_DRAFT'; cardId: string }
  | { type: 'LOCKER_UPGRADE'; cardId: string; upgradeId: string }
  | { type: 'LOCKER_RECRUIT'; playmakerId: string };
```

### Events

Events drive the client's animations and toasts. They are also persisted into the session's play log for replay and analytics.

```typescript
type GameEvent =
  | { type: 'PLAY_RESOLVED'; offense: ResolvedCard; defense: ResolvedCard; matchupLabel: string; yards: number }
  | { type: 'FIRST_DOWN' }
  | { type: 'TOUCHDOWN'; team: 'red' | 'blue' }
  | { type: 'INTERCEPTION'; spotYard: number }
  | { type: 'FUMBLE'; spotYard: number }
  | { type: 'TURNOVER_ON_DOWNS' }
  | { type: 'QUARTER_END'; quarter: number }
  | { type: 'GAME_END'; winner: 'red' | 'blue' };
```

## Game content

`Card`, `Playmaker`, `MatchupMatrix`, and `Upgrade` are seed-and-edit collections. The seed script in `server/src/game/seed/` populates them from the v0.2 starter set. Admins edit them via `/admin/*` after that. The engine never imports them — they're passed in as a `GameContent` argument. This is what allows live tuning without redeployment.

```typescript
interface GameContent {
  cards: Map<string, Card>;
  playmakers: Map<string, Playmaker>;
  matchups: MatchupMatrix;
  upgrades: Map<string, Upgrade>;
}
```

The route handler loads content from a 60-second LRU cache before calling the engine. Admin edits invalidate the cache via a `contentVersion` counter on the `MatchupMatrix` document.

## Auth

Auth0 SPA SDK in the client; `express-jwt` in the server validates against Auth0's JWKS. An Auth0 Action injects a custom claim `https://snapcount/roles` based on the `ADMIN_EMAILS` allowlist. The `requireAdmin` middleware reads that claim. Detailed setup: [`AUTH.md`](AUTH.md).

## Caching strategy

- **React Query**: 60s stale time on user-owned data, 5min on content catalogs.
- **Server-side LRU**: 60s for the content catalog (cards, playmakers, matchups, upgrades) so each snap doesn't pay six DB hits.
- **MongoDB**: indexes on `Deck.user`, `GameSession.user`, `GameSession.status`, and `Card.side`.

## Deployment topology

- **Client**: Vercel. Static SPA bundle. Env vars set at build time.
- **Server**: Railway / Render / Fly.io. One service, autoscale by request count.
- **DB**: MongoDB Atlas, M10 minimum for production indexes and backups.
- **Auth0**: tenant per environment (dev, prod). Production tenant has stricter callback URL allowlists.

### Production API hardening

- **Helmet** (`contentSecurityPolicy: false` for a JSON-only API; other defaults on).
- **CORS**: In `NODE_ENV=production`, only origins listed in `CLIENT_ORIGIN` (comma-separated) or the legacy single `CLIENT_URL` are allowed. Development keeps localhost Vite ports.
- **Rate limit**: `POST /api/sessions/:id/snap` is limited to **30 requests per minute** per Auth0 `sub` (falls back to client IP), via `express-rate-limit`. `trust proxy` is enabled in production so the limiter sees the real client behind Render/Vercel-style proxies.
- **Logging**: **Pino** + **pino-http** — JSON to stdout in production (host log drain), pretty stream in local dev; health checks are not auto-logged. **Authorization** and **Cookie** headers are redacted.
- **Errors / observability**: **Sentry** on client (`@sentry/react`) and server (`@sentry/node`) when DSN env vars are set. `sendDefaultPii` is off; browser user is set to `{ id: sub }` only. Server reports **5xx** from the Express error handler to Sentry.

No PII in structured logs beyond Auth0 `sub` where explicitly attached for debugging (avoid logging emails or names).

## What's deliberately not in scope for v1.0

- Real-time multiplayer (designed for v1.1+; will use Socket.IO or Supabase Realtime).
- Native mobile (React Native port is post-v1.0).
- Server-side push for async play notifications (depends on multiplayer).
- Microservices. The engine is in-process by design — splitting into a service is a v2.0 problem if play volume justifies it.
