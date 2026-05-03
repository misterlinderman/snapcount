import mongoose, { Document, Schema } from 'mongoose';

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

export interface ICard extends Omit<Document, '_id'> {
  _id: string;
  side: 'offense' | 'defense';
  type: CardType;
  name: string;
  basePower: number;
  notes?: string;
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'legendary';
  draftCost?: number;
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

const cardSchema = new Schema<ICard>(
  {
    _id: { type: String, required: true },
    side: { type: String, enum: ['offense', 'defense'], required: true },
    type: { type: String, enum: CARD_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    basePower: { type: Number, required: true },
    notes: { type: String },
    rarity: {
      type: String,
      enum: ['starter', 'common', 'uncommon', 'rare', 'legendary'],
      required: true,
    },
    draftCost: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

cardSchema.index({ side: 1, type: 1, name: 1 });

export const Card = mongoose.model<ICard>('Card', cardSchema);
