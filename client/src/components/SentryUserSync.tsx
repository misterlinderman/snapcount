import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import * as Sentry from '@sentry/react';

/** Binds Sentry user to Auth0 `sub` only (no email/name). */
export function SentryUserSync(): null {
  const { user, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (!import.meta.env.VITE_SENTRY_DSN) {
      return;
    }
    if (isAuthenticated && user?.sub) {
      Sentry.setUser({ id: user.sub });
    } else {
      Sentry.setUser(null);
    }
  }, [isAuthenticated, user?.sub]);

  return null;
}
