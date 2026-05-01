# Data model

> Mongoose schemas. The engine and admin console treat these as ground truth.

## Collections

```
User ────┐
         ├── Deck (1..N)
         └── GameSession (1..N)

Card ───────────► (referenced by Deck, GameSession, MatchupMatrix)
Playmaker ──────► (referenced by Deck, GameSession)
MatchupMatrix ─► single document
Upgrade ───────► (referenced by Deck cards with the upgrade applied)
```

User-owned documents (`Deck`, `GameSession`) carry the user's Auth0 sub as a string `user` field. Game content (`Card`, `Playmaker`, etc.) has no owner.

## User

The `User._id` is the Auth0 `sub` claim (e.g. `auth0|abc123`). This avoids a second id and keeps cross-references stringly typed.

```typescript
interface IUser extends Document {
  _id: string;                    // Auth0 sub
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  defaultDeck?: string;           // Deck _id
  stats: {
    seasonsStarted: number;
    seasonsWon: number;
    gamesWon: number;
    gamesPlayed: number;
    touchdowns: number;
    interceptionsThrown: number;
    interceptionsCaught: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ email: 1 }` unique.

## Deck

A user can have multiple decks. The starter deck is created on first login by the seed-on-signup hook.

```typescript
interface IDeckCard {
  cardId: string;                 // Card._id
  count: number;                  // copies in deck
  upgradeId?: string;             // Upgrade._id if applied
}

interface IDeck extends Document {
  user: string;                   // Auth0 sub
  name: string;
  isDefault: boolean;
  offense: IDeckCard[];
  defense: IDeckCard[];
  offPlaymakers: string[];        // Playmaker._id values
  defPlaymakers: string[];
  dp: number;                     // unspent draft points
  createdAt: Date;
  updatedAt: Date;
}
```

Validation:
- `offPlaymakers.length <= 4`, `defPlaymakers.length <= 4`
- each `IDeckCard.count >= 1`
- each card can have at most one upgrade

Indexes: `{ user: 1, isDefault: 1 }`.

## GameSession

A live or completed run. Embeds the entire game state and the play log so a session is one document.

```typescript
interface IGameSession extends Document {
  user: string;                   // Auth0 sub
  deck: string;                   // Deck snapshot reference
  status: 'active' | 'completed' | 'abandoned';
  result?: 'won' | 'lost';

  season: {
    node: 1 | 2 | 3 | 4 | 5;
    wins: number;
    losses: number;
  };

  game: {
    quarter: 1 | 2 | 3 | 4;
    totalDowns: number;
    scoreRed: number;
    scoreBlue: number;
    ballYard: number;
    possession: 'red' | 'blue';
    down: 1 | 2 | 3 | 4;
    yardsToGo: number;
    playerSide: 'red' | 'blue';
    perGameBuffs: { powerBoost: number; starPMBoost: number };
    lastThreeTypes: string[];
  };

  // Per-play hand state — only populated mid-play
  hand?: {
    cards: string[];              // Card._id values
    playmaker: string;
    selectedCardId?: string;
    selectedPM?: string;
  };
  cpuHand?: {
    cards: string[];
    playmaker: string;
  };

  pendingAdvance?: any;           // SnapResult while resolution is on screen

  // Append-only play log
  events: Array<{
    playId: string;
    timestamp: Date;
    quarter: number;
    down: number;
    type: string;                 // GameEvent.type
    payload: Record<string, unknown>;
  }>;

  // Idempotency cache
  recentPlayIds: string[];        // last 5 playIds + their resulting events

  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes:
- `{ user: 1, status: 1, updatedAt: -1 }` for "load my active session"
- `{ status: 1, completedAt: -1 }` for admin views

A user can have at most one `active` session at a time. The route `POST /api/sessions` enforces this.

## Card

Catalog entry. Edited only by admins.

```typescript
interface ICard extends Document {
  _id: string;                    // stable slug, e.g. 'hb-dive'
  side: 'offense' | 'defense';
  type: CardType;                 // 'run-in' | 'run-out' | 'pass-s' | ...
  name: string;
  basePower: number;
  notes?: string;                 // tooltip text
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'legendary';
  draftCost?: number;             // null for starter cards
  isActive: boolean;              // soft-delete flag
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ side: 1, type: 1, name: 1 }`.

## Playmaker

```typescript
interface IPlaymaker extends Document {
  _id: string;                    // 'pm-d-sterling'
  side: 'offense' | 'defense';
  position: string;               // 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DT' | 'LB' | 'CB' | 'S' | 'DE'
  name: string;
  baseBoost: number;              // 1.5 = ×1.5
  affinityTypes: CardType[];
  rarity: 'starter' | 'recruit-uncommon' | 'recruit-rare';
  recruitCost?: number;           // DP cost in Locker Room
  specialEffect?: string;         // 'pre-snap-peek' | 'forces-fumble' | ...
  isActive: boolean;
}
```

## MatchupMatrix

A single document. The full matrix lives as a 2D map.

```typescript
interface IMatchupMatrix extends Document {
  _id: 'singleton';
  version: number;                // bumped on every admin edit; invalidates server cache
  matrix: Record<CardType, Record<CardType, number>>;
  labels: Record<string, string>; // 'pass-s|blitz' → 'Screen destroys the blitz!'
  updatedAt: Date;
  updatedBy: string;              // Auth0 sub of the admin
}
```

The seed script writes this from `server/src/game/seed/matchups.ts`. The admin matrix page edits it in place.

## Upgrade

```typescript
interface IUpgrade extends Document {
  _id: string;                    // 'power-run' (upgrade for HB Dive)
  baseCardId: string;             // Card._id
  name: string;
  effect: {
    powerOverride?: number;
    bonusVs?: { type: CardType; bonus: number };
    sideEffect?: string;          // 'remove-int-risk' | 'fumble-on-tfl'
  };
  dpCost: number;
  isActive: boolean;
}
```

## Validation rules cheatsheet

| Rule | Where enforced |
|------|----------------|
| Deck PM cap (4 per side) | Mongoose pre-save on `Deck` |
| One upgrade per card | Mongoose pre-save on `Deck` |
| Active sessions per user (1) | `POST /api/sessions` route |
| Card / playmaker referenced exists | Engine refuses unknown ids |
| User can only mutate their own deck/session | Every authenticated route filters by `user: extractUserId(req)` |

## Migration discipline

Every time a model gains a required field, ship a migration script in `server/src/scripts/migrations/<timestamp>-<name>.ts` and document it in the build plan. Don't edit existing documents from a one-off Mongo shell — write the script and check it in.
