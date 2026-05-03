import mongoose, { Document, Schema } from 'mongoose';
import type { CardType } from './Card';

export interface IUpgrade extends Omit<Document, '_id'> {
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
  createdAt: Date;
  updatedAt: Date;
}

const CARD_TYPES: CardType[] = [
  'run-in',
  'run-out',
  'pass-s',
  'pass-m',
  'pass-d',
  'option',
  'rogue',
  'run-d',
  'zone',
  'man',
  'blitz',
  'prevent',
];

const bonusVsSchema = new Schema(
  {
    type: { type: String, enum: CARD_TYPES, required: true },
    bonus: { type: Number, required: true },
  },
  { _id: false }
);

const effectSchema = new Schema(
  {
    powerOverride: { type: Number },
    bonusVs: { type: bonusVsSchema },
    sideEffect: { type: String },
  },
  { _id: false }
);

const upgradeSchema = new Schema<IUpgrade>(
  {
    _id: { type: String, required: true },
    baseCardId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    effect: { type: effectSchema, default: {} },
    dpCost: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Upgrade = mongoose.model<IUpgrade>('Upgrade', upgradeSchema);
