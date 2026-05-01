# Documentation index

Start here. Pick the doc that matches what you're trying to do.

## Game

| Doc | Read this when |
|-----|----------------|
| [`game/GAME_DESIGN.md`](game/GAME_DESIGN.md) | You're implementing or changing a game rule. This is the source of truth. |

## Architecture

| Doc | Read this when |
|-----|----------------|
| [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) | You want the system overview, request flow, and where authority lives. |
| [`architecture/DATA_MODEL.md`](architecture/DATA_MODEL.md) | You're adding or changing a Mongoose model. |
| [`architecture/API.md`](architecture/API.md) | You're adding or calling an endpoint. |
| [`architecture/AUTH.md`](architecture/AUTH.md) | You're touching authentication, the admin role claim, or the Auth0 setup. |
| [`architecture/ADMIN.md`](architecture/ADMIN.md) | You're working on the admin console. |

## Build

| Doc | Read this when |
|-----|----------------|
| [`build/BUILD_PLAN.md`](build/BUILD_PLAN.md) | You're picking up the next phase, or trying to remember which phase you're in. Includes phased Cursor + Claude prompts. |

## Reference

The original POC files live alongside the code:

- `gridiron-rogue-v2.html` — single-file v0.2 game POC. Visual and math reference.
- `gridiron-rogue-v02-build.md` — v0.2 build doc. Same content as `GAME_DESIGN.md` but written from the POC's perspective.
- `gridiron-rogue-concept.md` — original v0.1 concept doc. Historical only.

## For AI agents

`AGENTS.md` and `.cursorrules` (both at the repo root) give a fast orientation. Per-area conventions live in `.cursor/rules/`. When in doubt, this directory wins over those.
