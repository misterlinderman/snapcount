import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api, { registerApiTokenGetter } from '../services/api';

/**
 * Registers Auth0 silent token acquisition for the shared axios instance.
 * Tokens stay in memory via the Auth0 SDK — not localStorage.
 */
export function useApiAuth(): typeof api {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    registerApiTokenGetter(
      isAuthenticated
        ? async () => {
            try {
              return await getAccessTokenSilently();
            } catch {
              return null;
            }
          }
        : null
    );
    return () => registerApiTokenGetter(null);
  }, [isAuthenticated, getAccessTokenSilently]);

  return api;
}

export default useApiAuth;
