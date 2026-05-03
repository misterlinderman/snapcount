import mongoose, { CallbackWithoutResultAndOptionalError, Document, Schema } from 'mongoose';

export interface IHandState {
  cards: string[];
  playmaker: string;
  selectedCardId?: string;
  selectedPM?: string;
}

export interface IPlayLogEntry {
  playId: string;
  timestamp: Date;
  quarter: number;
  down: number;
  type: string;
  payload: Record<string, unknown>;
}

export type SessionPhase = 'coin-toss' | 'play' | 'locker';

export interface IGameSession extends Document {
  user: string;
  deck: string;
  status: 'active' | 'completed' | 'abandoned';
  /** UX / routing helper — where the client is in the season loop. */
  phase: SessionPhase;
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
    filmStudyActive?: boolean;
    rogueWins?: number;
    rogueGames?: number;
    dp?: number;
    pendingDeckAdds?: string[];
    gameWinner?: 'red' | 'blue' | null;
    redrawUsedThisPossession?: boolean;
  };
  hand?: IHandState;
  cpuHand?: IHandState;
  pendingAdvance?: unknown;
  events: IPlayLogEntry[];
  /** Last play id tokens (see `idempotencyByPlayId` for full snap cache). */
  recentPlayIds: string[];
  idempotencyByPlayId?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const perGameBuffsSchema = new Schema(
  {
    powerBoost: { type: Number, default: 0 },
    starPMBoost: { type: Number, default: 0 },
  },
  { _id: false }
);

const gameSubSchema = new Schema(
  {
    quarter: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    totalDowns: { type: Number, default: 0 },
    scoreRed: { type: Number, default: 0 },
    scoreBlue: { type: Number, default: 0 },
    ballYard: { type: Number, default: 50 },
    possession: { type: String, enum: ['red', 'blue'], default: 'red' },
    down: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    yardsToGo: { type: Number, default: 10 },
    playerSide: { type: String, enum: ['red', 'blue'], default: 'red' },
    perGameBuffs: { type: perGameBuffsSchema, default: () => ({}) },
    lastThreeTypes: { type: [String], default: [] },
    filmStudyActive: { type: Boolean, default: false },
    rogueWins: { type: Number, default: 0 },
    rogueGames: { type: Number, default: 0 },
    dp: { type: Number, default: 0 },
    pendingDeckAdds: { type: [String], default: [] },
    gameWinner: { type: Schema.Types.Mixed, default: null },
    redrawUsedThisPossession: { type: Boolean, default: false },
  },
  { _id: false }
);

const handSchema = new Schema<IHandState>(
  {
    cards: [{ type: String }],
    playmaker: { type: String, required: true },
    selectedCardId: { type: String },
    selectedPM: { type: String },
  },
  { _id: false }
);

const playLogEntrySchema = new Schema<IPlayLogEntry>(
  {
    playId: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
    quarter: { type: Number, required: true },
    down: { type: Number, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const gameSessionSchema = new Schema<IGameSession>(
  {
    user: { type: String, required: true, index: true },
    deck: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      required: true,
      index: true,
    },
    phase: {
      type: String,
      enum: ['coin-toss', 'play', 'locker'],
      required: true,
      default: 'coin-toss',
    },
    result: { type: String, enum: ['won', 'lost'] },
    season: {
      node: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
    },
    game: { type: gameSubSchema, required: true },
    hand: { type: handSchema },
    cpuHand: { type: handSchema },
    pendingAdvance: { type: Schema.Types.Mixed },
    events: { type: [playLogEntrySchema], default: [] },
    recentPlayIds: { type: [String], default: [] },
    idempotencyByPlayId: { type: Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

gameSessionSchema.index({ user: 1, status: 1, updatedAt: -1 });
gameSessionSchema.index({ status: 1, completedAt: -1 });

gameSessionSchema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
  if (this.recentPlayIds.length > 5) {
    this.recentPlayIds = this.recentPlayIds.slice(-5);
  }
  const raw = this.idempotencyByPlayId;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const keys = Object.keys(raw as Record<string, unknown>);
    if (keys.length > 5) {
      const keep = keys.slice(-5);
      this.idempotencyByPlayId = Object.fromEntries(
        keep.map((k) => [k, (raw as Record<string, unknown>)[k]])
      );
    }
  }
  next();
});

export const GameSession = mongoose.model<IGameSession>('GameSession', gameSessionSchema);
