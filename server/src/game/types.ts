/**
 * Pure engine types for Gridiron Rogue / Snapcount.
 * Catalog shapes align with docs/architecture/DATA_MODEL.md; match state aligns with docs/architecture/ARCHITECTURE.md.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Offensive / defensive card families (matchup matrix rows & columns). */
export type CardType =
  | 'run-in'
  | 'run-out'
  | 'pass-s'
  | 'pass-m'
  | 'pass-d'
  | 'option'
  | 'rogue'
  | 'run-d'
  | 'zone'
  | 'man'
  | 'blitz'
  | 'prevent';

export type Side = 'offense' | 'defense';

export type Team = 'red' | 'blue';

export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'legendary';

export type PlaymakerRarity = 'starter' | 'recruit-uncommon' | 'recruit-rare';

/** Uniform RNG for the engine; must be injected by callers — never `Math.random()` inside reducers. */
export type RNG = () => number;

// ---------------------------------------------------------------------------
// Catalog (Mongo-shaped, without Document / timestamps where unused by engine)
// ---------------------------------------------------------------------------

/** Admin-edited card row; `_id` is the stable slug (e.g. `'hb-dive'`). */
export interface Card {
  _id: string;
  side: Side;
  type: CardType;
  name: string;
  basePower: number;
  notes?: string;
  rarity: CardRarity;
  draftCost?: number;
  isActive: boolean;
}

/** Admin-edited playmaker row. */
export interface Playmaker {
  _id: string;
  side: Side;
  /** Position label: QB, RB, WR, TE, OL, DT, LB, CB, S, DE, … */
  position: string;
  name: string;
  /** Multiplier when affinity matches (e.g. 1.5 = ×1.5). */
  baseBoost: number;
  affinityTypes: CardType[];
  rarity: PlaymakerRarity;
  recruitCost?: number;
  specialEffect?: string;
  isActive: boolean;
}

/** Deck upgrade applied to a base card. */
export interface Upgrade {
  _id: string;
  baseCardId: string;
  name: string;
  effect: {
    powerOverride?: number;
    bonusVs?: { type: CardType; bonus: number };
    sideEffect?: string;
  };
  dpCost: number;
  isActive: boolean;
}

/**
 * Full offensive type × defensive type lookup plus optional human-readable labels
 * (keys like `'pass-s|blitz'` → `"Screen destroys the blitz!"`).
 */
export interface MatchupMatrix {
  matrix: Record<CardType, Record<CardType, number>>;
  labels: Record<string, string>;
}

/** Everything the route loads from DB/cache and passes into the reducer. */
export interface GameContent {
  cards: Map<string, Card>;
  playmakers: Map<string, Playmaker>;
  matchups: MatchupMatrix;
  upgrades: Map<string, Upgrade>;
  /** DB matrix doc version; set by `loadGameContent` (omit in unit tests). */
  matchupVersion?: number;
}

/**
 * User deck slice for dealing role-locked hands from real pool sizes
 * and applying slotted upgrades during resolution.
 */
export interface DeckForEngine {
  offense: Array<{ cardId: string; count: number; upgradeId?: string }>;
  defense: Array<{ cardId: string; count: number; upgradeId?: string }>;
  offPlaymakers: string[];
  defPlaymakers: string[];
}

// ---------------------------------------------------------------------------
// Hand & session-shaped state
// ---------------------------------------------------------------------------

/** Role-locked hand: card ids, one playmaker id, optional UI selection before snap. */
export interface HandState {
  cards: string[];
  playmaker: string;
  selectedCardId?: string;
  selectedPM?: string;
}

/** Authoritative match slice the engine mutates; mirrors ARCHITECTURE.md. */
export interface GameState {
  scoreRed: number;
  scoreBlue: number;
  quarter: 1 | 2 | 3 | 4;
  /** Counts plays in the game; used for quarter rollover (8 plays per quarter). */
  totalDowns: number;
  /** 0 = Red end zone, 100 = Blue end zone. */
  ballYard: number;
  possession: Team;
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  /** Human-controlled team. */
  playerSide: Team;

  hand: HandState;
  cpu: HandState;

  /** Last snap outcome while the resolution UI is shown; cleared on advance. */
  pendingAdvance: SnapResult | null;
  /** Film Study rogue reveals CPU card for the current snap. */
  filmStudyActive: boolean;
  /** Offensive card types for tendency (False Start) tracking. */
  lastThreeTypes: CardType[];

  rogueWins: number;
  rogueGames: number;
  dp: number;
  perGameBuffs: { powerBoost: number; starPMBoost: number };

  /** TD reward card ids applied in the next Locker visit (e.g. `hail-mary`). */
  pendingDeckAdds: string[];
  /** `null` while the match is live; set when `GAME_END` fires. */
  gameWinner: Team | null;
  /** v0.3: at most one redraw per possession; resets when `possession` changes. */
  redrawUsedThisPossession: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: 'COIN_TOSS_PICK'; side: Side }
  | { type: 'DEAL_HAND' }
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'SELECT_PM'; playmakerId: string }
  | { type: 'REDRAW' }
  /** v0.3: 4th down, user on offense; resolved immediately (no card pick). */
  | { type: 'FIELD_GOAL' }
  /** Client-generated idempotency key; paired with session id for deterministic server RNG. */
  | { type: 'SNAP'; playId: string }
  | { type: 'NEXT_PLAY' }
  | { type: 'PICK_TD_REWARD'; rewardId: string }
  | { type: 'LOCKER_DRAFT'; cardId: string }
  | { type: 'LOCKER_UPGRADE'; cardId: string; upgradeId: string }
  | { type: 'LOCKER_RECRUIT'; playmakerId: string };

// ---------------------------------------------------------------------------
// Resolution & events
// ---------------------------------------------------------------------------

/**
 * One side’s line item after a snap: powers at each stage of the pipeline.
 * Matchup modifier is applied as +mod to offense final and −mod to defense final (margin shift).
 */
export interface ResolvedCard {
  cardId: string;
  side: Side;
  type: CardType;
  name: string;
  playmakerId: string;
  basePower: number;
  effectivePower: number;
  finalPower: number;
}

export type GameEvent =
  | {
      type: 'PLAY_RESOLVED';
      offense: ResolvedCard;
      defense: ResolvedCard;
      matchupLabel: string;
      yards: number;
    }
  | { type: 'FIRST_DOWN' }
  | { type: 'TOUCHDOWN'; team: Team }
  | { type: 'INTERCEPTION'; spotYard: number }
  | { type: 'FUMBLE'; spotYard: number }
  | { type: 'TURNOVER_ON_DOWNS' }
  | { type: 'QUARTER_END'; quarter: number }
  | { type: 'GAME_END'; winner: Team }
  | { type: 'FIELD_GOAL_GOOD'; team: Team }
  | { type: 'FIELD_GOAL_MISS' };

/**
 * Full output of one snap: both resolved cards (including effective/final power per side), matrix modifier & label, margin, offense-relative yards, and all emitted events.
 */
export interface SnapResult {
  offense: ResolvedCard;
  defense: ResolvedCard;
  matchupModifier: number;
  matchupLabel: string;
  margin: number;
  yards: number;
  events: GameEvent[];
  /** Present for field goal attempts (UI / analytics). */
  playKind?: 'snap' | 'field_goal';
  fieldGoal?: { made: boolean; distanceYards: number };
}
