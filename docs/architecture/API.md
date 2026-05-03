# API reference

> All routes are prefixed `/api`. Authenticated routes require an Auth0 access token in `Authorization: Bearer <token>`. Admin routes also require the `admin` role claim.

## Conventions

- All requests and responses are JSON.
- Errors return `{ error: string, message: string, statusCode: number }` with the matching HTTP status.
- All write endpoints accept and validate a Zod schema. Invalid input → 400.
- Pagination uses `?page=1&limit=20`. Defaults are page=1, limit=20, max limit=100.

---

## Public

### `GET /api/health`
Liveness probe. Returns `{ status: 'ok', uptime: number }`.

### `GET /api/content/cards`
Returns the full active card catalog.

```json
[
  {
    "_id": "hb-dive",
    "side": "offense",
    "type": "run-in",
    "name": "HB Dive",
    "basePower": 5,
    "rarity": "starter",
    "notes": "Reliable gain, hard to stop"
  }
]
```

Cached 60s server-side. Cached 5min in React Query.

### `GET /api/content/playmakers`
Returns active playmakers, both sides.

### `GET /api/content/matchups`
Returns `{ version, matrix, labels }`. Clients should re-fetch after a version bump (the active session response includes the version it was resolved against).

---

## Authenticated (user)

### `GET /api/users/me`
Returns the current user, creating the record + a starter deck if it's the user's first request.

```json
{
  "_id": "auth0|abc",
  "email": "you@example.com",
  "displayName": "You",
  "role": "user",
  "defaultDeck": "65xx...",
  "stats": { "seasonsStarted": 1, "gamesWon": 3, ... }
}
```

### `PUT /api/users/me`
Body: `{ displayName?: string }`. Returns updated user.

### `GET /api/decks`
Lists the current user's decks.

### `GET /api/decks/:id`
Returns a single deck. 404 if not found or not owned by user. **v0.3:** includes `cardAcquisitionOrder` (string ids, most recent draft last) used for blowout roster trimming after a game.

### `GET /api/decks/default`
Returns the user's default deck.

### `POST /api/decks`
Creates a new deck. Body: `{ name: string, copyFrom?: string }`. If `copyFrom` is supplied, clones that deck. Otherwise creates a fresh starter deck.

### `PUT /api/decks/:id`
Body: partial `{ name?, isDefault? }`. Use the locker endpoints below to mutate cards/playmakers/DP.

### `DELETE /api/decks/:id`
Deletes the deck. Cannot delete the only deck or the default deck.

### `POST /api/sessions`
Starts a new season. Body: `{ deckId: string }`. Returns the new session with the first coin toss pending.

```json
{
  "_id": "65xx...",
  "status": "active",
  "season": { "node": 1, "wins": 0, "losses": 0 },
  "game": { "quarter": 1, "scoreRed": 0, "scoreBlue": 0, "ballYard": 50, ... },
  "phase": "coin-toss"
}
```

400 if user already has an active session.

### `GET /api/sessions/active`
Returns the user's active session, or 204 No Content.

### `GET /api/sessions/:id`
Returns a session by id. Must belong to the user. The embedded `game` object includes engine state; **v0.3** adds `redrawUsedThisPossession` (boolean) for the paid redraw limit.

### `POST /api/sessions/:id/coin-toss`
Body: `{ side: 'offense' | 'defense' }`. Locks the user's role for the opening drive and deals the first hand. Returns updated session.

### `POST /api/sessions/:id/snap`
The hot path. Body:

```json
{
  "playId": "uuid-v4-from-client",
  "cardId": "hb-dive",
  "playmakerId": "pm-j-cannon"
}
```

The server:
1. Validates the JWT and ownership.
2. Checks `playId` is not in the recent cache (idempotent).
3. Confirms `cardId` and `playmakerId` are in the user's current hand.
4. Picks a CPU card via the CPU strategy.
5. Runs the engine with a seeded RNG (seed = `sessionId + playId`).
6. Persists the new state and the resulting events.
7. Returns `{ state, events }`.

If the same `playId` arrives twice, returns the cached `{ state, events }` without re-resolving.

### `POST /api/sessions/:id/redraw`
Empty body. Discards the user's hand and deals a new one. **v0.3:** costs **1 DP**, and at most **one redraw per possession** (the flag resets when possession changes after a snap). Requires no pending resolution. Returns the updated session document (same shape as `GET /api/sessions/:id`).

### `POST /api/sessions/:id/field-goal`
**v0.3.** Field goal attempt on **4th down** when **the user's team has the ball**. No card selection. Body:

```json
{
  "playId": "uuid-v4-from-client"
}
```

RNG is seeded from `sessionId` + `playId` (same pattern as `/snap`). Returns `{ state, events }` — the same envelope as `/snap`, with `pendingAdvance` describing the FG result (`playKind: 'field_goal'`, etc.).

### `POST /api/sessions/:id/next-play`
Advances from the resolution screen to the next snap. Server applies any deferred state transitions (touchdown overlay → kickoff, turnover, quarter rollover) and deals the next hand. Returns updated session.

### `POST /api/sessions/:id/td-reward`
Body: `{ rewardId: 'hail-mary' | 'power-boost' | 'star-playmaker' | 'draft-point' }`. Applies the picked reward and continues the game.

### `POST /api/sessions/:id/end`
Ends the current game after the final whistle (`gameWinner` is set) and returns `{ winner, dpEarned, totals }`. Triggers the Locker Room phase. Session `game.dp` (banked during the match) plus **+3 DP on a win** is applied to the deck document. **v0.3 blowout:** on a **loss** with **opponent margin ≥ 14**, the server removes up to **three** cards from the deck by walking **`cardAcquisitionOrder`** from the most recent draft (see `docs/game/GAME_DESIGN.md`).

### `POST /api/sessions/:id/locker/draft`
Body:

```json
{
  "cardId": "slug-or-objectid",
  "cutCardIds": ["card-to-drop", "another-copy"]
}
```

`cutCardIds` is optional (default `[]`). Each entry removes **one copy** of that card from the deck, in order, before the new card is added. **v0.3:** the deck may hold at most **20** card copies total; if drafting would exceed the cap, the client must supply enough valid cuts that the post-cut roster plus one new card stays ≤ 20. Spends the card's **draftCost** (default 1) in DP from the deck and appends the new card id to **`cardAcquisitionOrder`**.

### `POST /api/sessions/:id/locker/upgrade`
Body: `{ cardId: string, upgradeId: string }`.

### `POST /api/sessions/:id/locker/recruit`
Body: `{ playmakerId: string }`.

### `POST /api/sessions/:id/locker/close`
Closes the Locker Room and advances to the next season node (or ends the season if node 5 was just won).

### `POST /api/sessions/:id/abandon`
Marks the session as abandoned. Used when the user explicitly quits a run.

---

## Admin

All routes below require both `checkJwt` and `requireAdmin`. The admin claim is `https://snapcount/roles` containing `'admin'`.

### `GET /api/admin/cards`
Lists every card including inactive ones. Supports `?side=offense&type=run-in&q=<search>`.

### `POST /api/admin/cards`
Creates a card. Body matches the `Card` schema (sans timestamps).

### `PUT /api/admin/cards/:id`
Updates a card. Body: partial card fields. Updating `basePower`, `type`, or `isActive` invalidates the content cache and bumps the matrix version.

### `DELETE /api/admin/cards/:id`
Soft-deletes (sets `isActive: false`). Hard delete is not exposed — there's no recovery and existing sessions reference cards by id.

### `GET /api/admin/playmakers` / `POST` / `PUT` / `DELETE`
Same pattern.

### `GET /api/admin/matchups`
Returns the current matrix.

### `PUT /api/admin/matchups`
Body: full matrix replacement `{ matrix, labels }`. Bumps `version`. Audit-logged with the editor's Auth0 sub.

### `GET /api/admin/upgrades` / `POST` / `PUT` / `DELETE`
CRUD on the upgrade catalog.

### `GET /api/admin/users`
Paginated list of users. Supports `?q=<email>`.

### `GET /api/admin/users/:id`
Returns the user's profile, decks, and last 10 sessions.

### `PUT /api/admin/users/:id/role`
Body: `{ role: 'user' | 'admin' }`. Note: this updates the DB row but real authority comes from the Auth0 claim — sync via the Auth0 Action.

### `GET /api/admin/sessions`
Paginated list of recent sessions. Supports `?status=active|completed&user=<sub>`.

### `GET /api/admin/sessions/:id`
Returns full session including the play log.

### `GET /api/admin/stats`
Returns a dashboard summary:

```json
{
  "users": { "total": 412, "activeLast7d": 88 },
  "sessions": { "active": 23, "completedLast7d": 217 },
  "balance": {
    "cardWinRates": [ { "cardId": "hb-dive", "winRate": 0.48, "playCount": 1209 } ],
    "matchupYardAvg": [ { "off": "pass-d", "def": "blitz", "avgYards": 8.4 } ]
  },
  "asOf": "2026-04-30T12:00:00Z"
}
```

Computed on a 5-minute schedule and cached. Recomputable via `POST /api/admin/stats/recompute`.

---

## Error catalog

| HTTP | error | When |
|------|-------|------|
| 400 | `validation_error` | Zod schema rejected the body |
| 400 | `card_not_in_hand` | Snap referenced a card not currently dealt |
| 400 | `insufficient_dp` | Locker action costs more DP than available |
| 401 | `unauthorized` | Missing or invalid JWT |
| 403 | `forbidden` | User tried to access another user's resource, or non-admin hit `/admin/*` |
| 404 | `not_found` | Resource doesn't exist |
| 409 | `active_session_exists` | `POST /api/sessions` while another is active |
| 409 | `idempotency_conflict` | `playId` reused with different body |
| 500 | `internal_error` | Unhandled exception |

---

## OpenAPI

A Zod-derived OpenAPI spec is generated at build time and served at `/api/docs` in dev. Generation script: `server/src/scripts/gen-openapi.ts`.
