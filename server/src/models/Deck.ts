import mongoose, { CallbackWithoutResultAndOptionalError, Document, Schema } from 'mongoose';

export interface IDeckCard {
  cardId: string;
  count: number;
  upgradeId?: string;
}

export interface IDeck extends Document {
  user: string;
  name: string;
  isDefault: boolean;
  offense: IDeckCard[];
  defense: IDeckCard[];
  offPlaymakers: string[];
  defPlaymakers: string[];
  dp: number;
  /** v0.3: acquisition stack for rogue death (draft order). */
  cardAcquisitionOrder: string[];
  createdAt: Date;
  updatedAt: Date;
}

const deckCardSchema = new Schema<IDeckCard>(
  {
    cardId: { type: String, required: true },
    count: { type: Number, required: true, min: 1 },
    upgradeId: { type: String },
  },
  { _id: false }
);

const deckSchema = new Schema<IDeck>(
  {
    user: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, default: 'My Team' },
    isDefault: { type: Boolean, default: false },
    offense: { type: [deckCardSchema], default: [] },
    defense: { type: [deckCardSchema], default: [] },
    offPlaymakers: { type: [String], default: [] },
    defPlaymakers: { type: [String], default: [] },
    dp: { type: Number, default: 0 },
    cardAcquisitionOrder: { type: [String], default: [] },
  },
  { timestamps: true }
);

deckSchema.index({ user: 1, isDefault: 1 });

function assertUpgradeUniquePerCard(rows: IDeckCard[], side: string): void {
  const withUpgrade = rows.filter((r) => r.upgradeId);
  const cardIds = withUpgrade.map((r) => r.cardId);
  const unique = new Set(cardIds);
  if (unique.size !== cardIds.length) {
    throw new Error(`${side}: at most one deck row per cardId may carry an upgrade`);
  }
}

deckSchema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
  if (this.offPlaymakers.length > 5) {
    next(new Error('offPlaymakers: maximum 5'));
    return;
  }
  if (this.defPlaymakers.length > 5) {
    next(new Error('defPlaymakers: maximum 5'));
    return;
  }
  for (const row of this.offense) {
    if (row.count < 1) {
      next(new Error('offense: each card row must have count >= 1'));
      return;
    }
  }
  for (const row of this.defense) {
    if (row.count < 1) {
      next(new Error('defense: each card row must have count >= 1'));
      return;
    }
  }
  let cardSum = 0;
  for (const row of this.offense) cardSum += row.count;
  for (const row of this.defense) cardSum += row.count;
  if (cardSum > 20) {
    next(new Error('deck: maximum 20 card copies (v0.3)'));
    return;
  }
  try {
    assertUpgradeUniquePerCard(this.offense, 'offense');
    assertUpgradeUniquePerCard(this.defense, 'defense');
  } catch (e) {
    next(e as Error);
    return;
  }
  next();
});

export const Deck = mongoose.model<IDeck>('Deck', deckSchema);
