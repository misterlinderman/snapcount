import { AuditLog } from '../models';
import { AuthRequest, extractUserId } from '../middleware/auth';

export interface AuditLogWriteInput {
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

export async function writeAuditLog(req: AuthRequest, input: AuditLogWriteInput): Promise<void> {
  const actor = extractUserId(req);
  if (!actor) {
    throw new Error('writeAuditLog: missing actor');
  }
  await AuditLog.create({
    actor,
    action: input.action,
    target: input.target,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason,
    timestamp: new Date(),
  });
}
