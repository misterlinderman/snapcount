import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { extractUserId, type AuthRequest } from './auth';

/** 30 POST /snap requests per calendar minute per Auth0 subject (falls back to normalized IP). */
export const snapRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const sub = extractUserId(req as AuthRequest);
    if (sub) {
      return sub;
    }
    return ipKeyGenerator(req.ip ?? '');
  },
  handler: (_req, res): void => {
    res.status(429).json({
      status: 'fail',
      message: 'Too many snap requests for this account. Try again in about a minute.',
    });
  },
});
