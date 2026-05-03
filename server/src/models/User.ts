import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Omit<Document, '_id'> {
  _id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  defaultDeck?: string;
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

const statsSchema = new Schema(
  {
    seasonsStarted: { type: Number, default: 0 },
    seasonsWon: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    touchdowns: { type: Number, default: 0 },
    interceptionsThrown: { type: Number, default: 0 },
    interceptionsCaught: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    defaultDeck: { type: String },
    stats: { type: statsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
