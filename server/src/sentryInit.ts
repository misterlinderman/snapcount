import * as Sentry from '@sentry/node';

/**
 * Call once after `dotenv.config()`. No-op when `SENTRY_DSN` is unset.
 * Avoid PII: only Auth0 `sub` should appear on `Sentry.setUser`, never email/name.
 */
export function initNodeSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const tracesSampleRate = Number(
    process.env.SENTRY_TRACES_SAMPLE_RATE ?? (isProd ? 0.1 : 0)
  );

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    beforeSend(event) {
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string | undefined>;
        delete h.authorization;
        delete h.cookie;
      }
      if (event.user) {
        const id = event.user.id ?? (event.user as { sub?: string }).sub;
        event.user = id ? { id: String(id) } : {};
      }
      return event;
    },
  });
}
