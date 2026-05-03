import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actor: string;
  action: string;
  target: string;
  before: unknown;
  after: unknown;
  reason?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    target: { type: String, required: true, index: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    reason: { type: String },
    timestamp: { type: Date, required: true, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
