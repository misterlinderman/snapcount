# Authentication & authorization

> Auth0 for identity. JWT validation on every protected route. A custom claim drives admin gating.

## Auth0 setup

### 1. Single Page Application (the client)

In Auth0 dashboard → Applications → Create Application → **Single Page Web Application**. Name it `Snapcount Client`.

- Allowed Callback URLs: `http://localhost:5173, https://yourdomain.com`
- Allowed Logout URLs: same
- Allowed Web Origins: same
- Token Endpoint Authentication Method: `None`

Copy the **Domain** and **Client ID** into `client/.env`:

```
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=...
```

### 2. API (the server)

Applications → APIs → Create API. Name `Snapcount API`. Identifier `http://localhost:3001/api` (this becomes your audience). Algorithm `RS256`.

Add `VITE_AUTH0_AUDIENCE=http://localhost:3001/api` to `client/.env` and the same value as `AUTH0_AUDIENCE` in `server/.env`.

### 3. Role claim Action

Auth0 → Actions → Library → Create Action → Login flow. Paste:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const adminEmails = (event.secrets.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = (event.user.email || '').toLowerCase();
  const isAdmin = email && adminEmails.includes(email);

  const roles = isAdmin ? ['admin', 'user'] : ['user'];

  api.accessToken.setCustomClaim('https://snapcount/roles', roles);
  api.idToken.setCustomClaim('https://snapcount/roles', roles);
};
```

In the Action's **Secrets** sidebar, add `ADMIN_EMAILS` with the same comma-separated list as the server's `.env`. Deploy the Action and add it to the Login flow.

The custom-claim namespace must be a URL (Auth0 rule). `https://snapcount/roles` is fine — it doesn't have to resolve.

## Server validation

`server/src/middleware/auth.ts`:

```typescript
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { Request } from 'express';

export interface AuthRequest extends Request {
  auth?: {
    sub: string;
    [key: string]: unknown;
  };
}

export const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

export function extractUserId(req: AuthRequest): string | undefined {
  return req.auth?.sub as string | undefined;
}
```

`server/src/middleware/requireAdmin.ts`:

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

const ROLES_CLAIM = 'https://snapcount/roles';

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const roles = (req.auth?.[ROLES_CLAIM] as string[] | undefined) || [];
  if (!roles.includes('admin')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Admin role required',
      statusCode: 403,
    });
  }
  next();
}
```

## Client integration

`client/src/main.tsx` wraps the app in `Auth0Provider`:

```typescript
<Auth0Provider
  domain={import.meta.env.VITE_AUTH0_DOMAIN}
  clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
  authorizationParams={{
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  }}
  cacheLocation="memory"
>
  <App />
</Auth0Provider>
```

The API client injects the token:

```typescript
// client/src/services/api.ts
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

let getAccessToken: (() => Promise<string>) | null = null;
export const registerTokenGetter = (fn: () => Promise<string>) => {
  getAccessToken = fn;
};

api.interceptors.request.use(async (config) => {
  if (getAccessToken) {
    const token = await getAccessToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

A small bootstrap component calls `useAuth0().getAccessTokenSilently` and registers it once:

```typescript
function AuthBootstrap() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  useEffect(() => {
    if (isAuthenticated) registerTokenGetter(getAccessTokenSilently);
  }, [isAuthenticated, getAccessTokenSilently]);
  return null;
}
```

## Admin gating in the client

Server-side gating is the security boundary. Client-side gating exists only to hide UI from non-admins.

```typescript
// client/src/hooks/useRequireAdmin.ts
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

const ROLES_CLAIM = 'https://snapcount/roles';

export function useRequireAdmin() {
  const { getAccessTokenSilently } = useAuth0();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const claims = await getAccessTokenSilently({ detailedResponse: true });
        const decoded = JSON.parse(atob(claims.access_token.split('.')[1]));
        const roles = decoded[ROLES_CLAIM] as string[] | undefined;
        setIsAdmin(!!roles?.includes('admin'));
      } catch {
        setIsAdmin(false);
      }
    })();
  }, [getAccessTokenSilently]);

  return isAdmin;
}
```

`<RequireAdmin>` wraps `/admin/*` routes and redirects non-admins. It's UX, not security.

## First-login user creation

On the first authenticated request, the server's `GET /api/users/me` upserts the user from the JWT, sets `role` based on the claim, and seeds a starter deck. This is the single-source flow — no separate signup endpoint, no separate webhook.

## Token lifecycle

- Access tokens expire after 24h (Auth0 default for SPA + API).
- The Auth0 SDK refreshes silently using a hidden iframe.
- On refresh failure, the user is redirected to log in again.
- Logout: `useAuth0().logout({ logoutParams: { returnTo: window.location.origin } })`.

## Production checklist

- [ ] Separate Auth0 tenant for production (don't share dev and prod tenants).
- [ ] Production callback URLs in the Auth0 SPA settings (no `localhost`).
- [ ] `ADMIN_EMAILS` set as a server env secret and as the Auth0 Action secret.
- [ ] `JWT_SECRET` rotated (only used as a dev fallback; should be removed in prod).
- [ ] CORS on the server restricted to the production frontend origin.
- [ ] Rate limiting on `/api/sessions/:id/snap` (e.g. 30/min per user) to discourage scripted abuse.
