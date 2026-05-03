import mongoose, { Document, Schema } from 'mongoose';
import type { CardType } from './Card';

export interface IPlaymaker extends Omit<Document, '_id'> {
  _id: string;
  side: 'offense' | 'defense';
  position: string;
  name: string;
  baseBoost: number;
  affinityTypes: CardType[];
  rarity: 'starter' | 'recruit-uncommon' | 'recruit-rare';
  recruitCost?: number;
  specialEffect?: string;
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

const playmakerSchema = new Schema<IPlaymaker>(
  {
    _id: { type: String, required: true },
    side: { type: String, enum: ['offense', 'defense'], required: true },
    position: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    baseBoost: { type: Number, required: true },
    affinityTypes: [{ type: String, enum: CARD_TYPES }],
    rarity: {
      type: String,
      enum: ['starter', 'recruit-uncommon', 'recruit-rare'],
      required: true,
    },
    recruitCost: { type: Number, min: 0 },
    specialEffect: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

playmakerSchema.index({ side: 1, position: 1, name: 1 });

export const Playmaker = mongoose.model<IPlaymaker>('Playmaker', playmakerSchema);
