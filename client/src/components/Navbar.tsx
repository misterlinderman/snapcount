import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/services/usersApi';

function Navbar() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const location = useLocation();

  const { data: me } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: usersApi.getMe,
    enabled: isAuthenticated,
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: 'var(--white)',
        borderColor: 'var(--rule)',
      }}
    >
      <div
        className="mx-auto flex h-14 w-full max-w-[var(--shell-max-width)] items-center justify-between gap-4 px-[var(--shell-pad-x)]"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span
            className="text-sm font-semibold tracking-wide sm:text-base"
            style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
          >
            Snapcount
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden items-center space-x-6 md:flex">
          <Link
            to="/"
            className={`text-sm transition-colors ${
              isActive('/') ? '' : 'opacity-80 hover:opacity-100'
            }`}
            style={{
              fontFamily: 'var(--font-serif)',
              color: isActive('/') ? 'var(--blue)' : 'var(--ink)',
            }}
          >
            Home
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/season"
                className={`text-sm transition-colors ${
                  isActive('/season') ? '' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  fontFamily: 'var(--font-serif)',
                  color: isActive('/season') ? 'var(--blue)' : 'var(--ink)',
                }}
              >
                Season
              </Link>
              <Link
                to="/dashboard"
                className={`text-sm transition-colors ${
                  isActive('/dashboard') ? '' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  fontFamily: 'var(--font-serif)',
                  color: isActive('/dashboard') ? 'var(--blue)' : 'var(--ink)',
                }}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className={`text-sm transition-colors ${
                  isActive('/profile') ? '' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  fontFamily: 'var(--font-serif)',
                  color: isActive('/profile') ? 'var(--blue)' : 'var(--ink)',
                }}
              >
                Profile
              </Link>
              {me?.role === 'admin' ? (
                <Link
                  to="/admin"
                  className={`text-sm transition-colors ${
                    location.pathname.startsWith('/admin') ? '' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: location.pathname.startsWith('/admin') ? 'var(--gold)' : 'var(--ink)',
                  }}
                >
                  Admin
                </Link>
              ) : null}
            </>
          )}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="h-8 w-8 rounded-full"
                    style={{ boxShadow: '0 0 0 1px var(--rule)' }}
                  />
                )}
                <span
                  className="max-w-[10rem] truncate text-sm"
                  style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}
                >
                  {user?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="rounded border px-3 py-1.5 text-sm transition-opacity hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-serif)',
                  borderColor: 'var(--rule)',
                  color: 'var(--ink)',
                  backgroundColor: 'var(--cream)',
                }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => loginWithRedirect()}
              className="rounded px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-90"
              style={{
                fontFamily: 'var(--font-serif)',
                backgroundColor: 'var(--blue)',
              }}
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
