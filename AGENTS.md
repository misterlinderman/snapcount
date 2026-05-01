# Agent context — Snapcount / Gridiron Rogue

Read this first. It is the shortest path to "what is this repo, what conventions hold, where do things live."

## What this is

Snapcount is the production hosting of **Gridiron Rogue**, a rogue-like card football game. The single-file HTML POC `gridiron-rogue-v2.html` is the **design source of truth** — its game loop, matchup matrix, scoring math, and card/playmaker definitions are the contract this codebase implements.

- **client/**: Vite + React 18 + TypeScript + Tailwind + Auth0 SPA SDK. Renders the game and the admin console.
- **server/**: Express + TypeScript + Mongoose + MongoDB. Holds the authoritative game engine, user accounts, decks, and game sessions. Validates JWTs from Auth0.
- **docs/game/GAME_DESIGN.md**: the rules. When the code and this doc disagree, the doc wins until updated.

The game logic must run **server-authoritative**. The client may run a mirrored engine for optimistic UI, but the server's resolution is final. Never trust a power, multiplier, or yard delta sent from the client.

## Commands (from repo root)

| Command | Purpose |
|---------|---------|
| `npm run install:all` | Install root, client, and server deps |
| `npm run dev` | API + Vite together |
| `npm run dev:client` | Vite only (5173) |
| `npm run dev:server` | API only (3001) |
| `npm run build` | Build both |
| `npm run lint` | ESLint client + server |
| `npm run format` | Prettier |
| `npm run seed` | Seed cards / playmakers / matchups from `server/src/game/seed/` |
| `npm run seed:reset` | Drop game-content collections and reseed |
| `npm test` | Engine + route tests |

## Where things live

| Concern | Path |
|---------|------|
| Game design rules (RULES) | `docs/game/GAME_DESIGN.md` |
| Architecture overview | `docs/architecture/ARCHITECTURE.md` |
| Data model (Mongoose) | `docs/architecture/DATA_MODEL.md` |
| API endpoints | `docs/architecture/API.md` |
| Auth + admin gating | `docs/architecture/AUTH.md`, `docs/architecture/ADMIN.md` |
| Phased build prompts | `docs/build/BUILD_PLAN.md` |
| Authoritative engine | `server/src/game/engine/` |
| Mirrored client engine | `client/src/game/engine/` |
| Card / playmaker / matchup catalog | `server/src/game/content/` (seeded into `Card`, `Playmaker`, `MatchupMatrix` collections) |
| API routes | `server/src/routes/` |
| Admin routes | `server/src/routes/admin/` (gated by `requireAdmin`) |
| Auth middleware | `server/src/middleware/auth.ts` |
| Mongoose models | `server/src/models/` |
| React pages | `client/src/pages/` |
| Game UI components | `client/src/components/game/` |
| Admin UI | `client/src/pages/admin/`, `client/src/components/admin/` |
| API client | `client/src/services/api.ts` |
| Design tokens | `client/src/styles/tokens.css` |

## Hard rules

1. **Server is authoritative.** Card power, playmaker multipliers, matchup modifiers, yards gained, score, possession flips — all computed server-side. The client renders what the server returns.
2. **The engine is pure.** `server/src/game/engine/` exports pure functions that take `(state, action) → newState`. No DB access, no `Date.now()`, no `Math.random()` outside an injected RNG. This makes it testable and replayable.
3. **Game content lives in DB collections, not hardcoded in the engine.** The engine takes a `GameContent` argument (cards, playmakers, matchup matrix). Admins editing the matrix in `/admin/matchups` immediately affects new sessions.
4. **The HTML POC is the spec.** If you're unsure how a rule should behave, check `gridiron-rogue-v2.html` and `docs/game/GAME_DESIGN.md`. Replicate the math exactly. Do not invent new rules.
5. **Auth0 JWT on every protected route.** Use `checkJwt` middleware. Extract user id with `extractUserId(req)`.
6. **Admin endpoints use `requireAdmin`.** This middleware checks the `https://snapcount/roles` claim from the Auth0 access token. Never gate admin features client-side only.
7. **Tailwind for layout, design tokens for game-skin colors.** The newspaper-sports-desk look uses CSS custom properties (`--ink`, `--cream`, `--red`, `--blue`, `--green-field`, `--gold`). Don't replace these with hex literals.

## Conventions in 30 seconds

- TypeScript strict mode. `interface` for object shapes, `type` for unions.
- Functional React components with hooks. PascalCase filenames.
- Server routes: `Router`, `checkJwt` middleware, `asyncHandler` wrapper, return JSON.
- Mongoose models: schemas in `server/src/models/`, exported through `server/src/models/index.ts`.
- React Query for server state. React Context for game-session state inside an active match.
- API client (`client/src/services/api.ts`) injects the Auth0 access token automatically.
- Tests live next to the code: `engine.ts` ↔ `engine.test.ts`. Vitest on both sides.

## Env setup

Copy `.env.example`, `client/.env.example`, `server/.env.example` to their respective `.env`. Configure MongoDB Atlas, Auth0 (SPA + API), and `ADMIN_EMAILS` in `server/.env`.

## When in doubt

Order of precedence:

1. **`docs/game/GAME_DESIGN.md`** for game rules.
2. **`docs/architecture/*`** for system design.
3. **`gridiron-rogue-v2.html`** for visual reference and exact math.
4. **`.cursorrules`** for code conventions.
5. **Existing code patterns** as a tiebreaker.

If those still leave ambiguity, raise it explicitly rather than guessing.
