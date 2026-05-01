# Build plan

> Phased implementation of Snapcount on top of the MERN base template. Each phase has a clear scope, an exit checklist, and ready-to-paste prompts for Cursor and Claude. Work top-down. Don't start a phase before the previous one is green.

## How to use this document

This plan assumes you're using **Cursor** as your IDE with **Claude as the assistant model** (Opus or Sonnet 4 family). The prompts below are written to be pasted into Cursor's chat / composer with the relevant files added as context. Each phase tells you which files to attach.

A general workflow per phase:

1. Read the phase summary and the exit checklist.
2. Open Cursor in the repo root, attach the listed context files, paste the **Setup prompt** to scaffold the structure.
3. Run `npm run dev` and confirm nothing is broken.
4. Paste the **Implementation prompts** one at a time. Review each diff before accepting.
5. Run the **Verification commands**. Tick the exit checklist.
6. Commit with the suggested message and move to the next phase.

The prompts assume Cursor's standard "agent" composer behavior — Claude will read the attached files, write code, and propose multi-file diffs. If you're using Claude Code instead, the same prompts work; just `cd` to the repo first and the model will use the file system directly.

A note on scope discipline: each phase's prompts are deliberately narrow. If Claude wants to expand scope ("while I'm here, let me also refactor X"), say no and move that to a later phase. The whole plan stays on track only if each phase ships small.

---

## Phase 0 — Repo bootstrap

**Goal.** Get the existing base template running locally, then drop in the Snapcount documentation stack.

**Scope.**
- Clone the repo, install deps, run dev server.
- Verify Auth0 + MongoDB connectivity with the base template.
- Add the Snapcount docs (this folder), the new `.cursorrules`, the new `AGENTS.md`, and the new top-level `README.md`.
- Add the per-area Cursor rules under `.cursor/rules/`.

**Context files to attach (in Cursor).**
- `README.md`
- `.cursorrules`
- `AGENTS.md`
- All files under `docs/`

**Setup prompt.**

```
We're starting Snapcount, a MERN port of the Gridiron Rogue HTML POC.

Verify the base template still runs:
1. Confirm `npm run install:all` completes with no errors.
2. Confirm `npm run dev` starts both the API (3001) and Vite (5173).
3. Visit http://localhost:5173 and confirm the base template homepage renders.
4. Hit http://localhost:3001/api/health and confirm a 200 OK.

Then make sure the docs I just dropped in (README.md, AGENTS.md, .cursorrules, .cursor/rules/, docs/) are all present and check for any obvious typos or broken internal links. Don't change any code yet.
```

**Verification.**
- `npm run dev` runs both servers, both reachable.
- `/api/health` returns 200.
- Auth0 login redirects work (configured per `docs/architecture/AUTH.md`).
- Docs are committed.

**Exit checklist.**
- [ ] Base template runs locally.
- [ ] Auth0 is configured for dev (callback URL, audience).
- [ ] MongoDB Atlas dev cluster is reachable.
- [ ] Docs stack is in place.

**Commit.** `chore: bootstrap snapcount docs and verify base template`

---

## Phase 1 — Game engine (server-side, no DB yet)

**Goal.** Build the authoritative game engine as pure functions in `server/src/game/engine/`. No DB, no routes, no client wiring. Just the math, fully tested.

**Scope.**
- Define `GameState`, `GameAction`, `GameEvent`, `GameContent`, `RNG` types.
- Implement reducers: `dealHand`, `selectCard`, `selectPM`, `redraw`, `resolveSnap`, `nextPlay`, `pickTDReward`.
- Implement helpers: `getEffectivePower`, `getMatchupModifier`, `cpuPickCards`, `applyAdvance`, `tendencyPenaltyTriggered`.
- Seed test fixtures from the v0.2 starter deck.
- Vitest test suites covering every game rule listed in `GAME_DESIGN.md`.

**Context files.**
- `docs/game/GAME_DESIGN.md`
- `gridiron-rogue-v2.html` (for math reference)
- `.cursor/rules/server-game-engine.mdc`

**Implementation prompts (paste one at a time).**

Prompt 1 — types:
```
Read docs/game/GAME_DESIGN.md and .cursor/rules/server-game-engine.mdc.

Create server/src/game/types.ts with the full type system for the engine:
- CardType (string union per the spec — 'run-in' | 'run-out' | 'pass-s' | 'pass-m' | 'pass-d' | 'option' | 'rogue' | 'run-d' | 'zone' | 'man' | 'blitz' | 'prevent')
- Side ('offense' | 'defense'), Team ('red' | 'blue')
- Card, Playmaker, Upgrade interfaces (catalog shape per docs/architecture/DATA_MODEL.md)
- MatchupMatrix (record of off → record of def → number)
- GameContent (a bundle of the above, used as engine input)
- HandState ({ cards: string[]; playmaker: string; selectedCardId?: string; selectedPM?: string })
- GameState (full match state per the architecture doc)
- All GameAction variants
- All GameEvent variants
- RNG = () => number — must always be injected, never produced inside the engine

Export a SnapResult type that captures everything the engine produces from one snap (offense card, defense card, effective powers, matchup label, yards, events).

No implementation yet — just types and brief JSDoc.
```

Prompt 2 — pure helpers:
```
Now implement server/src/game/engine/helpers.ts.

Pure functions only — no Date.now, no Math.random, no I/O.

- getEffectivePower(card, playmaker, content, perGameBuffs) → number
  Implements (base + bonuses + powerBoost) × playmakerMult, with all card bonuses from GAME_DESIGN.md "Card bonuses" table. Apply playmaker affinity rule (full boost if card.type ∈ playmaker.affinityTypes; reduced boost otherwise — use 0.85× of baseBoost as the mismatch).

- getMatchupModifier(offCardType, defCardType, matrix) → number
  Look up the matrix. Default to 0 if either type is missing.

- yardsFromMargin(margin) → number
  margin > 0 → max(1, round(margin × 1.2 + 2))
  margin < 0 → -max(1, round(|margin|))
  margin === 0 → 1

- tendencyPenaltyTriggered(lastThreeTypes: CardType[], next: CardType) → boolean
  True only if lastThreeTypes has length 3 and all three === next.

- chooseFromArray<T>(arr, rng) → T

Each helper has a sibling test file with at least 3 cases including edge cases.
```

Prompt 3 — reducers:
```
Implement the reducers in server/src/game/engine/reducers.ts. Each one is pure: (state, action, content, rng) => { state, events }.

- dealHand: deals 4 cards from the role-locked pool + 1 playmaker for each side. The pool comes from the GameContent passed in (not hardcoded). Reset selectedCardId and selectedPM to undefined.
- selectCard / selectPM: just record the choice. Validate the id is in the hand.
- redraw: clear hand + cpuHand and emit a DEAL action's events (or call dealHand inline).
- resolveSnap: the centerpiece.
   1. Validate selectedCardId and selectedPM are present.
   2. CPU picks (use cpuPickCards from helpers).
   3. Compute effective powers for both sides.
   4. Apply matchup modifier from the matrix.
   5. Compute yards from margin.
   6. Apply Hail Mary coin flip (rng) if the offense card is rogue Hail Mary.
   7. Apply tendency penalty (-5) if triggered.
   8. Update field position with the dir multiplier.
   9. Check for touchdown (>=95 or <=5), interception (deep-pass big loss, see spec), fumble, 4th-down failure.
   10. Update down, yardsToGo, totalDowns, score, possession as appropriate.
   11. Emit events: PLAY_RESOLVED first, then any of TOUCHDOWN, INTERCEPTION, FUMBLE, FIRST_DOWN, TURNOVER_ON_DOWNS, QUARTER_END, GAME_END.
   12. Set pendingAdvance with the SnapResult so the client can render the resolution panel.
- nextPlay: clears pendingAdvance, deals the next hand if the game continues.
- pickTDReward: applies the chosen reward to perGameBuffs or to the deck queue (deck adds happen in Locker phase only).

Reuse the helpers from helpers.ts. Do not import anything from outside server/src/game/.
```

Prompt 4 — tests:
```
Write Vitest test suites in server/src/game/engine/*.test.ts covering every rule in docs/game/GAME_DESIGN.md.

Required test cases:
- effective power with affinity match vs mismatch
- matchup modifier lookup including missing keys
- yards formula at margin = 1, -1, 0, 5, -5
- tendency penalty only triggers on 3rd repeat
- TD threshold: ball at 94 + 1 yard gain ≠ TD; ball at 95 = TD
- TD threshold direction-correct for both Red and Blue
- INT on deep ball with margin worse than -5 returns 15 yards in the new direction
- 4th down failure flips possession at the spot
- quarter rolls over after exactly 8 plays in totalDowns
- game ends after Q4 last play, emits GAME_END

Use a seeded RNG (Mulberry32 or similar) so tests are deterministic. No real RNG.
```

**Verification.**
- `npm test` — all engine tests green.
- `cd server && npx tsc --noEmit` — no type errors.

**Exit checklist.**
- [ ] All engine reducers pure (no DB, no clock, no random).
- [ ] >= 30 unit tests covering the rules in `GAME_DESIGN.md`.
- [ ] Type system documented in `types.ts`.

**Commit.** `feat(engine): server-authoritative game engine with full test coverage`

---

## Phase 2 — Data layer & content seed

**Goal.** Mongoose models, seed scripts, and the content cache. No routes yet.

**Scope.**
- Models: `User`, `Deck`, `GameSession`, `Card`, `Playmaker`, `MatchupMatrix`, `Upgrade`.
- Seed scripts in `server/src/game/seed/` for cards, playmakers, matchup, upgrades.
- A content loader in `server/src/game/content/loader.ts` with a 60s LRU cache keyed by matrix `version`.

**Context files.**
- `docs/architecture/DATA_MODEL.md`
- `docs/game/GAME_DESIGN.md`
- `gridiron-rogue-v2.html` (for the starter card and playmaker definitions — read the JS data constants)
- `.cursor/rules/server-models.mdc`

**Implementation prompts.**

Prompt 1 — models:
```
Read docs/architecture/DATA_MODEL.md and .cursor/rules/server-models.mdc.

Create the Mongoose models in server/src/models/:
- User.ts — _id is the Auth0 sub (string), schema per the data model doc
- Deck.ts — with pre-save validation: PM caps, one upgrade per card
- GameSession.ts — full state plus events log plus recentPlayIds for idempotency
- Card.ts — catalog entry, soft-delete via isActive
- Playmaker.ts — catalog entry
- MatchupMatrix.ts — singleton with version field
- Upgrade.ts

Re-export them all from server/src/models/index.ts.

Add Zod schemas in server/src/models/schemas/ that mirror each interface for runtime validation in routes.
```

Prompt 2 — seed:
```
Build the seed system in server/src/game/seed/.

- cards.ts — exports STARTER_CARDS, an array of every card from the v0.2 POC's OFF_CARDS and DEF_CARDS arrays. Read gridiron-rogue-v2.html to get the exact ids, names, types, and basePower values. Tag each with rarity 'starter' if it's in the starter deck, otherwise 'common' / 'uncommon' / 'rare' / 'legendary' per docs/game/GAME_DESIGN.md "Locker Room — Track A".
- playmakers.ts — exports STARTER_PLAYMAKERS plus the recruit pool, ids and stats from the spec.
- matchups.ts — exports the full matrix from docs/game/GAME_DESIGN.md "Matchup matrix" section, plus the matchup labels.
- upgrades.ts — the 6 upgrades in "Locker Room — Track B".

Then a seed script server/src/scripts/seed.ts that:
1. Connects to MongoDB.
2. For each catalog (Card, Playmaker, MatchupMatrix, Upgrade), upserts entries by _id (does not delete unrelated docs, so admin-added entries survive).
3. Logs what it added vs updated.

Wire up `npm run seed` in package.json. Add `npm run seed:reset` that drops the catalog collections first.
```

Prompt 3 — content loader and cache:
```
Build server/src/game/content/loader.ts:

- loadGameContent(): Promise<GameContent>
  - Reads Card, Playmaker, MatchupMatrix, Upgrade from MongoDB.
  - Caches the result in memory keyed by MatchupMatrix.version.
  - 60s TTL.
  - Returns the bundle the engine expects.
- invalidateContentCache(): clears the cache. Called after any admin write.

This module is the only bridge between the engine (pure) and Mongo (impure). Routes call loadGameContent before calling engine reducers.
```

**Verification.**
- `npm run seed` succeeds; collections populated.
- `npm test` still green.
- A small Node REPL session: `import { loadGameContent } from './game/content/loader'; await loadGameContent();` returns the expected shape.

**Exit checklist.**
- [ ] All seven models created with indexes and validation.
- [ ] Seed script populates a fresh DB.
- [ ] Content loader cached + invalidatable.

**Commit.** `feat(data): models, seed, and content cache`

---

## Phase 3 — User & session API

**Goal.** Wire the engine to HTTP. Authenticated user can sign up, get a starter deck, start a session, and play a full game.

**Scope.**
- Routes: `/api/users/me`, `/api/decks`, `/api/decks/:id`, `/api/decks/default`, `/api/sessions`, `/api/sessions/active`, `/api/sessions/:id`, `/api/sessions/:id/coin-toss`, `/api/sessions/:id/snap`, `/api/sessions/:id/redraw`, `/api/sessions/:id/next-play`, `/api/sessions/:id/td-reward`, `/api/sessions/:id/end`, `/api/sessions/:id/locker/*`, `/api/sessions/:id/abandon`.
- Middleware: idempotency cache for `/snap`, ownership guards.
- First-login starter-deck seed in `GET /api/users/me`.

**Context files.**
- `docs/architecture/API.md`
- `docs/architecture/AUTH.md`
- `.cursor/rules/server-routes.mdc`
- The completed engine and models from Phases 1–2.

**Implementation prompts.**

Prompt 1 — auth + content content endpoints:
```
Read docs/architecture/API.md and .cursor/rules/server-routes.mdc.

Implement the public content routes:
- GET /api/content/cards
- GET /api/content/playmakers
- GET /api/content/matchups
All three pull from the content cache. No auth.

Then implement /api/users/me:
- GET — upserts the user record from the JWT (sub, email, name from claims). On first call, creates a starter Deck (full v0.2 starter deck per docs/game/GAME_DESIGN.md) and sets it as default.
- PUT — updates displayName.

Wire these into server/src/index.ts under their /api/* prefixes.
```

Prompt 2 — deck routes:
```
Implement /api/decks/* per docs/architecture/API.md.

GET /api/decks → list user's decks
GET /api/decks/default → the default
GET /api/decks/:id → one deck (404 if not owned)
POST /api/decks → create with optional copyFrom
PUT /api/decks/:id → rename, set default
DELETE /api/decks/:id → delete (refuse if it's the only or default deck)

Use Zod schemas for body validation. All routes use checkJwt and filter by user: extractUserId(req).
```

Prompt 3 — session routes (the big one):
```
Implement /api/sessions/* per docs/architecture/API.md.

Critical rules:
- Server-authoritative. Never trust the client for power, multipliers, yards, or score.
- Idempotency on /snap via the playId in the request body. Cache the last 5 results in GameSession.recentPlayIds and short-circuit duplicates.
- Reject snap if cardId or playmakerId isn't in the user's current hand.
- Run the engine via loadGameContent then resolveSnap. Persist state and events.

Endpoints:
- POST /api/sessions { deckId } → new session, refuse if user has an active one
- GET /api/sessions/active → user's active session or 204
- GET /api/sessions/:id → load session
- POST /api/sessions/:id/coin-toss { side } → lock role, deal first hand
- POST /api/sessions/:id/snap { playId, cardId, playmakerId } → resolve
- POST /api/sessions/:id/redraw → clear hand, deal new
- POST /api/sessions/:id/next-play → advance from resolution panel
- POST /api/sessions/:id/td-reward { rewardId } → apply reward
- POST /api/sessions/:id/end → close out at Q4, return summary
- POST /api/sessions/:id/locker/draft { cardId } → spend DP
- POST /api/sessions/:id/locker/upgrade { cardId, upgradeId }
- POST /api/sessions/:id/locker/recruit { playmakerId }
- POST /api/sessions/:id/locker/close → advance to next season node
- POST /api/sessions/:id/abandon

Each route is thin: validate → load → engine → save → respond.
```

Prompt 4 — integration tests:
```
Add Supertest-based integration tests in server/src/__tests__/sessions.test.ts.

Mock auth by injecting a fake JWT payload in test setup (bypass jwks for tests).

Cover:
- Full happy-path: create session, coin toss, 5 snaps, observe state changes
- Idempotency: same playId twice returns same result, no double-resolution
- Forbidden: user A can't read user B's session
- Validation: snap with a card not in hand returns 400 card_not_in_hand
- Active-session-exists: second POST /api/sessions returns 409
```

**Verification.**
- `npm test` green (engine + integration).
- Manually with curl + a real Auth0 token: create a session, snap, see state evolve.
- Mongo Atlas shows a session document with a growing events array.

**Exit checklist.**
- [ ] All API endpoints from `docs/architecture/API.md` (user-facing) implemented.
- [ ] Idempotent snap.
- [ ] Integration tests for happy path and forbidden access.

**Commit.** `feat(api): user + session endpoints with server-authoritative engine`

---

## Phase 4 — Game UI (client)

**Goal.** Port the v0.2 HTML POC's UI to React, wired against the real API.

**Scope.**
- Design tokens (`tokens.css`), fonts, base layout.
- Pages: Home, Play (active session), Locker Room, Season Map.
- Game components: `Scoreboard`, `Field`, `StatusTicker`, `RoleBanner`, `Card`, `Hand`, `PlaymakerCard`, `ResolutionPanel`, `ActionBar`.
- Overlays: `CoinTossModal`, `TouchdownRewardModal`, `FinalWhistleModal`, `DeckOverviewModal`.
- The mirrored client engine for optimistic UI on snap.
- React Query for server state. `GameSessionContext` for active-session UI state.

**Context files.**
- `gridiron-rogue-v2.html` (visual reference — match the layout exactly)
- `docs/game/GAME_DESIGN.md`
- `.cursor/rules/client-ui.mdc`
- The skill `/mnt/skills/public/frontend-design/SKILL.md` if available — for design-system guidance.

**Implementation prompts.**

Prompt 1 — tokens and layout:
```
Read gridiron-rogue-v2.html and extract the CSS custom properties (--ink, --cream, --red, --blue, --green-field, --gold, etc.). Create client/src/styles/tokens.css with all of them.

Add fonts.css that imports Playfair Display SC, Playfair Display, and Source Serif 4 from Google Fonts.

Update client/src/main.tsx to import both CSS files alongside Tailwind.

Build the page shell:
- A Masthead component (ink-black bar, "Gridiron Rogue" title, version badge on the right)
- A RogueBar component (season nodes + DP counter)
- Layout container that matches the POC's max-width and padding

Don't wire any data yet. Just static markup matching the POC visually.
```

Prompt 2 — game components:
```
Build the in-game components in client/src/components/game/, matching gridiron-rogue-v2.html visually:

- Scoreboard: 3-column grid (home / center / away) with score, team name, possession arrow, quarter dots, down box.
- Field: horizontal turf bar with the ball marker positioned by left:%. Yard markers underneath.
- StatusTicker: two-row LIVE / LAST display.
- RoleBanner: blue or red banner showing "You are on Offense/Defense".
- Card: badge + name + power. Variants: 'selectable', 'selected', 'cpu-hidden', 'cpu-revealed'. Use the badge classes from the design tokens.
- PlaymakerCard: gold-accented variant with name and affinity.
- Hand: row of 4 cards + the playmaker.
- ResolutionPanel: shows two cards side by side with the matchup label and yards result.
- ActionBar: sticky bottom with two slots, switching between Redraw/Snap and Redraw(disabled)/NextPlay.

Each component takes data as props. State management comes in the next prompt.
```

Prompt 3 — context, state, and the Play page:
```
Build client/src/game/state/GameSessionContext.tsx with a reducer that handles:
- Loading a session
- Card / PM selection
- Optimistic snap (run client engine)
- Reconcile with server response
- Phase transitions (select → resolved → next-play → select)

Build client/src/game/engine/ as a copy of server/src/game/engine/ (helpers + reducers, identical types). Eventually we'll move to a shared package; for now duplicate and pin parity with a CI check (skip the CI bit for now).

Build client/src/services/api.ts following docs/architecture/AUTH.md (axios + Auth0 token interceptor). Add a typed wrapper sessionsApi with start, coinToss, snap, redraw, nextPlay, etc.

Build client/src/pages/PlayPage.tsx:
- Loads or creates an active session via React Query.
- Shows the coin toss modal if phase === 'coin-toss'.
- Renders Scoreboard + Field + StatusTicker + RoleBanner + Hand + ResolutionPanel + ActionBar.
- On snap: optimistically resolve via client engine, post to /sessions/:id/snap, replace state with server response on arrival.
- Surfaces server-vs-optimistic discrepancies via a console.warn in dev (silent in prod).
```

Prompt 4 — overlays and remaining pages:
```
Build the overlays:
- CoinTossModal: Offense or Defense buttons. POSTs /sessions/:id/coin-toss.
- TouchdownRewardModal: shows three randomized rewards, posts the chosen one.
- FinalWhistleModal: final score + DP earned + "Go to Locker Room" CTA.
- DeckOverviewModal: opens from the deck-bar tap, lists every card + PM.

Build LockerRoomPage:
- Three tabs: Draft, Upgrade, Recruit.
- Each tab calls the corresponding /sessions/:id/locker/* endpoint.
- Shows DP balance prominently.
- "Close Locker Room" button posts /locker/close and routes to the next game.

Build SeasonMapPage:
- 5-node visual progress bar showing wins/losses.
- "Start next game" CTA when between games.
- "View deck" link to LockerRoomPage in read-only mode.

Build HomePage:
- Login CTA if logged out.
- "Continue season" if active session exists.
- "Start new season" with deck picker.
- "Profile" link.
```

**Verification.**
- Visit `/play` while logged in. Coin toss → snap → resolution → next play → all visible state changes match the POC.
- Snap is idempotent across page reload mid-resolution.
- Mobile viewport (375px) renders cleanly.
- Lighthouse accessibility score ≥ 90 on the play page.

**Exit checklist.**
- [ ] Visual parity with `gridiron-rogue-v2.html`.
- [ ] Optimistic UI replaced by server response on every snap.
- [ ] All overlays connected.
- [ ] Mobile-first layout works at 375px.

**Commit.** `feat(client): game UI with optimistic snap and server reconciliation`

---

## Phase 5 — Admin console: catalog editors

**Goal.** Admins can create, edit, and retire cards, playmakers, and upgrades.

**Scope.**
- Server: `/api/admin/cards`, `/api/admin/playmakers`, `/api/admin/upgrades` CRUD (gated by `requireAdmin`). Cache invalidation on every write.
- Client: `/admin/cards`, `/admin/playmakers`, `/admin/upgrades` pages with a table + edit modal.
- Audit log model + writes from every admin mutation.

**Context files.**
- `docs/architecture/ADMIN.md`
- `docs/architecture/API.md` (admin section)

**Implementation prompts.**

Prompt 1 — admin middleware and audit log:
```
Read docs/architecture/AUTH.md and docs/architecture/ADMIN.md.

Build server/src/middleware/requireAdmin.ts: reads the `https://snapcount/roles` claim from req.auth, 403 if not 'admin'.

Build a new model AuditLog (server/src/models/AuditLog.ts):
- actor: string (Auth0 sub)
- action: string ('card.update', 'card.create', 'card.deactivate', etc.)
- target: string (the affected entity id)
- before: any
- after: any
- reason?: string
- timestamp: Date

Build a small helper writeAuditLog(req, { action, target, before, after, reason }) used inside every admin mutation.
```

Prompt 2 — admin CRUD endpoints:
```
Build the admin routes under server/src/routes/admin/:
- cards.ts: GET / list (filter by side, type, q, includeInactive), POST / create, PUT /:id, DELETE /:id (soft via isActive=false). Every write calls writeAuditLog and invalidateContentCache.
- playmakers.ts: same pattern.
- upgrades.ts: same pattern.

Mount under /api/admin/* with checkJwt + requireAdmin applied at the router level.

Add Zod schemas in server/src/routes/admin/schemas.ts.

Integration tests:
- Non-admin gets 403.
- Admin can create / edit / soft-delete.
- Soft-deleted card is excluded from /api/content/cards but included in /api/admin/cards?includeInactive=true.
- Update bumps content cache version.
```

Prompt 3 — admin client shell:
```
Build the admin client shell:
- client/src/pages/admin/AdminLayout.tsx — sidebar with links to Cards, Playmakers, Upgrades, Matchups, Users, Sessions, Audit. Wrapped with a top-level <RequireAdmin> guard.
- client/src/components/admin/DataTable.tsx — generic table with column config, sortable headers, search, filter dropdowns, "Edit" and "Deactivate" actions per row.
- client/src/components/admin/EditModal.tsx — modal with Zod-validated form; supports JSON Schema-driven fields or hand-written field components.

Add /admin to the React Router config in App.tsx with the layout as the route element.
```

Prompt 4 — Cards / Playmakers / Upgrades pages:
```
Build:
- /admin/cards — table of every card (active + inactive toggle), edit modal with: side, type, name, basePower, rarity, draftCost, notes. Save → PUT, refetch.
- /admin/playmakers — same pattern with the playmaker schema (position, baseBoost, affinityTypes multi-select, recruitCost, specialEffect).
- /admin/upgrades — same pattern with the upgrade schema (baseCardId selector, name, effect.powerOverride, effect.bonusVs, effect.sideEffect, dpCost).

All three use the typed admin API client (client/src/services/adminApi.ts).
All three render a "Last edited by [actor] at [time]" footer pulled from the audit log.
```

**Verification.**
- Log in as an admin, edit a card's basePower, start a new session, observe the new value used.
- Log in as a non-admin, navigate to `/admin/cards` — redirected.
- Hit `/api/admin/cards` without admin claim — 403.
- Audit log records every change.

**Exit checklist.**
- [ ] Card / playmaker / upgrade CRUD live and gated.
- [ ] Audit log writes on every mutation.
- [ ] Content cache invalidates and new sessions pick up changes.

**Commit.** `feat(admin): catalog editors for cards, playmakers, and upgrades`

---

## Phase 6 — Admin console: matchup matrix, users, sessions, dashboard

**Goal.** Finish the admin console.

**Scope.**
- `/admin/matchups` — editable matrix grid with the actual-yards heatmap overlay.
- `/admin/users` — search, profile drill-down, role assignment, DP grant, force-end session.
- `/admin/sessions` — recent sessions browser with the replay viewer.
- `/admin/dashboard` — five tiles per `docs/architecture/ADMIN.md`.
- `/admin/audit` — searchable audit log.

**Context files.**
- `docs/architecture/ADMIN.md`
- The existing admin shell from Phase 5.

**Implementation prompts.**

Prompt 1 — matchup matrix editor:
```
Read docs/architecture/ADMIN.md "Matchups" section.

Server:
- GET /api/admin/matchups → returns the singleton matrix with version
- PUT /api/admin/matchups → body { matrix, labels }; bumps version; writes audit log; invalidates cache

Client:
- /admin/matchups page renders the 7×5 grid (offense rows × defense cols).
- Each cell: editable number + a small badge showing the actual avg yards from the last 7 days (pulled from /api/admin/stats).
- "Edit mode" toggle that allows multi-cell edits before saving.
- Below the grid: editable list of matchup labels keyed by 'offType|defType'.

Optimistic update on save with a rollback on failure.
```

Prompt 2 — users and sessions admin:
```
Server:
- GET /api/admin/users with ?q= search, paginated
- GET /api/admin/users/:id — profile + decks + last 10 sessions
- PUT /api/admin/users/:id/role { role }
- POST /api/admin/users/:id/grant-dp { amount, reason } — requires reason, audit-logged
- POST /api/admin/users/:id/end-session { sessionId, reason } — audit-logged

- GET /api/admin/sessions with filters
- GET /api/admin/sessions/:id — full session including events log

Client:
- /admin/users — search, list, click → drill-down page showing profile, decks, sessions, action buttons.
- /admin/sessions — paginated list with status badge and final score.
- /admin/sessions/:id — replay viewer that steps through events one at a time, showing the state before/after each. Stretchy goal but valuable for support.
```

Prompt 3 — dashboard and stats:
```
Server:
- GET /api/admin/stats — returns the dashboard summary per docs/architecture/API.md.
  Compute on demand the first call, cache for 5 minutes.
  - users.total, users.activeLast7d (distinct user on a session in the last 7 days)
  - sessions.active, sessions.completedLast7d
  - balance.cardWinRates: per card, plays where it was on the winning side / total plays
  - balance.matchupYardAvg: per (off, def) cell, average yards over the last 7 days

- POST /api/admin/stats/recompute — forces a refresh.

Client:
- /admin/dashboard — five tiles per docs/architecture/ADMIN.md.
- Sparkline component for the "active users" tile (recharts).
- Heatmap for the matchup yard average (color scale red → cream → green).
- Outliers (>0.6 or <0.35 win rate) highlighted in red on the win rate histogram.
```

Prompt 4 — audit log viewer:
```
Server:
- GET /api/admin/audit — paginated, filterable by actor, action, target, time range.

Client:
- /admin/audit — table of audit entries with filters in a sidebar. Click an entry to see before/after JSON diff in a modal.
```

**Verification.**
- Edit a matchup cell, observe the version bump and a new session resolving with the new modifier.
- Search a user, grant 5 DP with a reason, observe the audit log entry and the user's deck DP increment.
- Dashboard renders with mock data from a small synthetic seed of plays.

**Exit checklist.**
- [ ] Matchup matrix editable with version-bumped cache invalidation.
- [ ] User search + DP grant + role change + end-session, all audit-logged.
- [ ] Session replay viewer functional.
- [ ] Dashboard with five tiles.
- [ ] Audit log viewer with filters.

**Commit.** `feat(admin): matchup editor, user tools, sessions, dashboard, and audit log`

---

## Phase 7 — Polish, deployment, and the v0.3 design backlog

**Goal.** Ship Snapcount to production. Knock out the v0.3 design items that are now easy because the platform is in place.

**Scope.**
- Production environment setup (Auth0 prod tenant, MongoDB Atlas prod, Vercel + Render).
- CI: lint, typecheck, test, build on every PR.
- Rate limiting on `/api/sessions/:id/snap`.
- Logging + error reporting (Pino + Sentry).
- v0.3 game items: deck size cap, field-goal option, smarter CPU strategy, redraw cost, rogue-death.

**Context files.**
- `docs/game/GAME_DESIGN.md` (Known issues / flags section)

**Implementation prompts.**

Prompt 1 — CI:
```
Add a GitHub Actions workflow .github/workflows/ci.yml that runs on every PR:
1. Install with caching (actions/setup-node + npm ci).
2. Lint (npm run lint).
3. Typecheck client and server.
4. Test (npm test).
5. Build (npm run build).

Block merges on red.
```

Prompt 2 — production hardening:
```
Add:
- helmet middleware on the server.
- express-rate-limit on /api/sessions/:id/snap (30/min per Auth0 sub).
- Pino logger with pino-http; JSON in prod, pretty in dev.
- Sentry on both client and server (no PII beyond Auth0 sub).
- A production-only CORS allowlist drawn from CLIENT_ORIGIN env var.

Update docs/architecture/ARCHITECTURE.md "Deployment topology" with any concrete decisions made.
```

Prompt 3 — v0.3 game changes:
```
Update docs/game/GAME_DESIGN.md to fold in these changes (mark them v0.3):
- Deck size cap of 20 with forced cut on add.
- Field goal option on 4th down: auto success inside 45 yards, probabilistic beyond. Worth 3.
- CPU strategy: weighted by the matchup matrix instead of pure max power. Weight = basePower + expected matchup modifier vs the user's available defenses.
- Redraw cost: 1 DP per redraw, max 1 per possession.
- Rogue death: blowout loss (margin >= 14) costs the 3 most recently acquired cards.

Then implement each one in the engine + corresponding admin / locker UI changes. One commit per change.
```

**Verification.**
- CI is green on a fresh PR.
- Production deploy goes through with environment variables set.
- A penetration-test pass: hit every admin endpoint without the role claim, hit user endpoints as another user, replay a snap with a different cardId — all blocked.

**Exit checklist.**
- [ ] CI active and required for merge.
- [ ] Deployed to prod URLs.
- [ ] Rate limiting on the snap endpoint.
- [ ] Error monitoring active.
- [ ] v0.3 game changes shipped.

**Commit.** `chore: prod hardening, ci, and v0.3 backlog`

---

## Working with Claude — prompt patterns that work here

A few patterns worth internalizing before you start:

**Anchor every prompt to a doc.** When asking Claude to implement a rule, point at the section of `GAME_DESIGN.md` or `ARCHITECTURE.md` that defines it. "Read X.md, then implement Y" beats "implement Y" every time.

**Attach the existing code, not just the new doc.** When extending an existing module, attach the file Claude is going to edit so it copies your conventions rather than guessing them.

**One concept per prompt.** "Add the auth middleware" is one prompt. "Add the auth middleware and the admin middleware and the audit log writer" is three prompts. Smaller diffs are easier to review.

**Demand tests with the implementation.** If Claude proposes code without tests for a non-trivial change, push back: "add Vitest cases for [edge cases]." You'll catch many half-baked solutions this way.

**Reject scope creep.** If Claude offers to "also clean up X while I'm here," say no and put it on the backlog. Clean-up commits are their own commits.

**Use the doc when Claude proposes wrong behavior.** "GAME_DESIGN.md says yards on a tie are 1, not 0. Fix it." This is faster than re-deriving the spec yourself.

**For multi-file changes, ask for a plan first.** "Before writing code, list the files you'll touch and what each change is." This catches scope drift before any code is written.

**When stuck, switch to a dialog.** If a prompt is generating bad code, stop and ask: "what's ambiguous about this requirement that's making this hard?" Often the answer reveals a doc gap, which is a better fix than rewriting the prompt.

Done well, the above turns Claude into a collaborator who reads your conventions, respects your boundaries, and ships code that fits the existing codebase. Done poorly, you get a confident assistant making things up. The difference is mostly in the prompts.
