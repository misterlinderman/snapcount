import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type ApiTokenGetter = () => Promise<string | null>;

let tokenGetter: ApiTokenGetter | null = null;

/** Register Auth0 (or other) access-token provider. Avoid persisting JWTs in localStorage. */
export function registerApiTokenGetter(getter: ApiTokenGetter | null): void {
  tokenGetter = getter;
}

api.interceptors.request.use(
  async (config) => {
    if (tokenGetter) {
      try {
        const token = await tokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          delete config.headers.Authorization;
        }
      } catch {
        delete config.headers.Authorization;
      }
    }
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
