import type { CorsOptions } from 'cors';

const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]);

function parseProductionAllowlist(): string[] {
  const raw = process.env.CLIENT_ORIGIN ?? process.env.CLIENT_URL;
  if (!raw?.trim()) {
    throw new Error(
      'Production CORS: set CLIENT_ORIGIN to one or more origins (comma-separated), e.g. https://snapcount.example.com'
    );
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Production: allowlist from `CLIENT_ORIGIN` (or legacy single `CLIENT_URL`).
 * Non-production: localhost Vite ports + non-browser clients (no Origin header).
 */
export function buildCorsOrigin(): CorsOptions['origin'] {
  if (process.env.NODE_ENV !== 'production') {
    return (origin, callback) => {
      if (!origin || DEV_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    };
  }

  const allowed = new Set(parseProductionAllowlist());
  return (origin, callback) => {
    if (!origin || allowed.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  };
}
