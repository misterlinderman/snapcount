import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { createError } from './errorHandler';

const ROLES_CLAIM = 'https://snapcount/roles';

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  const payload = req.auth?.payload as Record<string, unknown> | undefined;
  const rolesRaw = payload?.[ROLES_CLAIM];
  const roles = Array.isArray(rolesRaw) ? rolesRaw.filter((r): r is string => typeof r === 'string') : [];
  if (!roles.includes('admin')) {
    next(createError('Admin role required', 403));
    return;
  }
  next();
}
