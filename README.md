# Snapcount — Gridiron Rogue

> *Rogue-like card football for the web. MERN stack. Auth0 accounts, persistent decks, season runs, and an admin console for tuning the meta.*

Snapcount is the production hosting of **Gridiron Rogue** — a player-vs-CPU card football game where matchups, playmaker assignment, and a rogue-like progression layer reward reading the CPU rather than just stacking power. The single-file HTML POC (`v0.2`) is the design source of truth; this codebase ports that game loop to a MERN stack with user accounts, server-authoritative game state, and an admin console for adjusting cards, playmakers, and the matchup matrix without redeploying.

This README is the **operator's guide**. For the game design, see [`docs/game/GAME_DESIGN.md`](docs/game/GAME_DESIGN.md). For the system layout, see [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md). For the phased implementation plan, see [`docs/build/BUILD_PLAN.md`](docs/build/BUILD_PLAN.md).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS (with the Gridiron Rogue design tokens layered on top) |
| Routing | React Router v6 |
| State | React Context + React Query for server state |
| Backend | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Authentication | Auth0 (JWT, with role claim for `admin`) |
| Tooling | ESLint, Prettier, Nodemon, Concurrently |

## Repository layout

```
./
├── client/                       # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/             # Card, Hand, Scoreboard, Field, Resolution
│   │   │   ├── locker/           # Locker Room, draft tracks
│   │   │   ├── overlays/         # CoinToss, TouchdownReward, FinalWhistle
│   │   │   ├── admin/            # Admin console widgets
│   │   │   └── ui/               # Buttons, modals, badges
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── PlayPage.tsx      # Active game session
│   │   │   ├── LockerRoomPage.tsx
│   │   │   ├── SeasonMapPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── admin/            # /admin/* (gated by role)
│   │   ├── game/
│   │   │   ├── engine/           # Pure game logic (mirrors server engine)
│   │   │   ├── state/            # Game state reducers
│   │   │   └── types.ts
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   └── styles/               # tokens.css, fonts.css
│   └── public/
├── server/                       # Express backend
│   └── src/
│       ├── controllers/
│       ├── middleware/           # auth, errors, requireAdmin
│       ├── models/               # User, Deck, GameSession, Card, Playmaker, MatchupMatrix
│       ├── routes/               # /api/*, /api/admin/*
│       ├── game/
│       │   ├── engine/           # Authoritative resolution engine
│       │   ├── content/          # Loads cards/playmakers/matchups from DB or seed
│       │   └── seed/             # Seed scripts mirroring v0.2 starter deck
│       ├── services/
│       ├── config/
│       └── types/
├── docs/
│   ├── README.md                 # Index of guides
│   ├── architecture/             # System diagrams, request flow, data model
│   ├── game/                     # Game design source of truth
│   └── build/                    # Phased Cursor + Claude prompts
├── .cursor/rules/                # Per-area Cursor rules (mdc)
├── .cursorrules                  # Repo-wide Cursor rules
├── AGENTS.md                     # Fast orientation for any AI agent
├── .env.example
├── package.json
└── README.md                     # This file
```

The `client/` and `server/` boundary is the same as the base template. What's added is the `game/` directory on each side, the `admin/` subtrees, and the design-token CSS layered onto Tailwind.

## Prerequisites

- Node.js 18+ (use nvm)
- MongoDB Atlas account (or local MongoDB 6+)
- Auth0 free-tier tenant
- Cursor IDE (recommended, but not required)

## Quick start

```bash
git clone https://github.com/misterlinderman/snapcount.git
cd snapcount

# Install everything
npm run install:all

# Copy env templates
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env

# Edit the .env files — see "Environment variables" below

# Seed the game content (cards, playmakers, matchup matrix)
npm run seed

# Run the API and Vite together
npm run dev
```

Frontend runs on `http://localhost:5173`. API runs on `http://localhost:3001`. The Vite dev server proxies `/api` to the backend.

## Environment variables

### Root `.env`

```
NODE_ENV=development
```

### `client/.env`

```
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

### `server/.env`

```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
JWT_SECRET=dev-fallback-secret
ADMIN_EMAILS=you@example.com   # comma-separated; granted admin role on first login
```

### Auth0 setup

1. Create a Single Page Application — set callback, logout, and web origin to `http://localhost:5173`.
2. Create an API named `Snapcount API` with identifier `http://localhost:3001/api` (this becomes your audience).
3. In **Actions → Library**, add a Login flow action that injects a `https://snapcount/roles` claim into the access token. The server checks this claim against `ADMIN_EMAILS` to gate `/api/admin/*`. See `docs/architecture/AUTH.md` for the snippet.

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server together |
| `npm run dev:client` | Frontend only (5173) |
| `npm run dev:server` | API only (3001) |
| `npm run build` | Production build of both |
| `npm run lint` | ESLint across both packages |
| `npm run format` | Prettier across both packages |
| `npm run seed` | Seed cards, playmakers, and matchup matrix from `server/src/game/seed/` |
| `npm run seed:reset` | Drop game content collections and reseed |
| `npm test` | Run engine tests (Vitest, server-side) |

## API surface (summary)

A complete reference lives in [`docs/architecture/API.md`](docs/architecture/API.md). Highlights:

**Public**
- `GET /api/health` — liveness check
- `GET /api/content/cards` — full card catalog (cached, public)
- `GET /api/content/playmakers` — full playmaker catalog
- `GET /api/content/matchups` — matchup matrix

**Authenticated user**
- `GET /api/users/me` — current user profile
- `GET /api/decks` — list user's decks
- `POST /api/decks` — create a new deck
- `PUT /api/decks/:id` — rename / set default
- `POST /api/sessions` — start a new game session (returns session id + initial state)
- `GET /api/sessions/:id` — load game session
- `POST /api/sessions/:id/snap` — submit a play; server resolves and returns updated state
- `POST /api/sessions/:id/redraw` — draw a fresh hand (cost may apply)
- `POST /api/sessions/:id/td-reward` — pick one of three TD rewards
- `POST /api/sessions/:id/locker` — spend DP on a draft / upgrade / recruit action

**Admin (requires `admin` role claim)**
- `GET/POST/PUT/DELETE /api/admin/cards` — CRUD on the card catalog
- `GET/POST/PUT/DELETE /api/admin/playmakers`
- `GET/PUT /api/admin/matchups` — edit the matchup matrix
- `GET /api/admin/users` — paginated user list
- `GET /api/admin/sessions` — recent sessions for debugging
- `GET /api/admin/stats` — global engagement and balance metrics

## Game loop in 30 seconds

1. New user signs up → Auth0 → server creates a `User` and seeds them a starter `Deck` (8 offense, 4 defense, 4 playmakers, 2 DP).
2. User starts a season → `GameSession` is created with 5 game nodes.
3. Each game opens with a coin toss; the user picks offense or defense for the opening drive.
4. Each play: client requests a hand → server deals from the user's deck (role-locked) and the CPU's bot deck → user picks card + playmaker → snap → server resolves authoritatively and returns the updated session.
5. On touchdown, user picks one of three reward upgrades.
6. After four quarters, Final Whistle. Win → Locker Room (spend DP). Loss → still go to Locker Room with whatever DP was earned.
7. Win the season → unlock harder season tier.

The engine math is identical to the v0.2 HTML POC. The server replays the same formula on every snap so the client can never tamper with power, multipliers, or yard direction.

## Documentation index

| Doc | What it covers |
|-----|----------------|
| [`docs/game/GAME_DESIGN.md`](docs/game/GAME_DESIGN.md) | Cards, playmakers, matchup matrix, scoring, rogue layer — the design source of truth |
| [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) | System diagram, request flow, server-authoritative model |
| [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md) | Mongoose schemas and ER notes |
| [`docs/architecture/API.md`](docs/architecture/API.md) | Endpoint reference with request/response shapes |
| [`docs/architecture/AUTH.md`](docs/architecture/AUTH.md) | Auth0 config, role claim, admin gating |
| [`docs/architecture/ADMIN.md`](docs/architecture/ADMIN.md) | Admin console scope, screens, and safety rails |
| [`docs/build/BUILD_PLAN.md`](docs/build/BUILD_PLAN.md) | Phased implementation plan with Cursor + Claude prompts |
| `AGENTS.md` | Quick orientation for any AI coding agent |
| `.cursorrules`, `.cursor/rules/` | Cursor IDE conventions |

## Deployment

- **Frontend**: Vercel (build `client/`, output `client/dist`).
- **Backend**: Railway, Render, or Fly.io (build `server/`, start `npm start`).
- **Database**: MongoDB Atlas.
- For production, set `NODE_ENV=production`, update Auth0 callback URLs, and rotate `JWT_SECRET`.

## License

MIT
