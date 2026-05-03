import * as Sentry from '@sentry/react';

/** Browser SDK; no-op without `VITE_SENTRY_DSN`. Only Auth0 `sub` on user (via `SentryUserSync`). */
export function initBrowserSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const isProd = import.meta.env.PROD;
  const tracesSampleRate = Number(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? (isProd ? 0.1 : 0)
  );

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    beforeSend(event) {
      if (event.user) {
        const id = event.user.id ?? (event.user as { sub?: string }).sub;
        event.user = id ? { id: String(id) } : {};
      }
      return event;
    },
  });
}
