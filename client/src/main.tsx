import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import { initBrowserSentry } from './sentryInit';
import { SentryUserSync } from './components/SentryUserSync';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/index.css';

initBrowserSentry();

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: audience,
          scope: 'openid profile email',
        }}
      >
        <SentryUserSync />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Auth0Provider>
    </QueryClientProvider>
  </React.StrictMode>
);
