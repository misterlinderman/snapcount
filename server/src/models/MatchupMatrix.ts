import mongoose, { Document, Schema } from 'mongoose';
import type { CardType } from './Card';

export interface IMatchupMatrix extends Omit<Document, '_id'> {
  _id: 'singleton';
  version: number;
  matrix: Record<CardType, Record<CardType, number>>;
  labels: Record<string, string>;
  updatedAt: Date;
  updatedBy: string;
}

const matchupMatrixSchema = new Schema<IMatchupMatrix>(
  {
    _id: { type: String, required: true, default: 'singleton' },
    version: { type: Number, required: true, default: 0 },
    matrix: { type: Schema.Types.Mixed, required: true },
    labels: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, required: true },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

export const MatchupMatrix = mongoose.model<IMatchupMatrix>('MatchupMatrix', matchupMatrixSchema);
