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
      className="sticky top-0 z-50 border-b backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(20, 26, 34, 0.92)',
        borderColor: 'var(--bg-border)',
      }}
    >
      <div
        className="mx-auto flex h-14 w-full max-w-[var(--shell-max-width)] items-center justify-between gap-4 px-[var(--shell-pad-x)]"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span
            className="text-sm font-bold uppercase tracking-[0.12em] sm:text-base"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
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
              fontFamily: 'var(--font-body)',
              color: isActive('/') ? 'var(--gold-bright)' : 'var(--text-secondary)',
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
                  fontFamily: 'var(--font-body)',
                  color: isActive('/season') ? 'var(--gold-bright)' : 'var(--text-secondary)',
                }}
              >
                Season
              </Link>
              <Link
                to="/how-to-play"
                className={`text-sm transition-colors ${
                  isActive('/how-to-play') ? '' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  fontFamily: 'var(--font-body)',
                  color: isActive('/how-to-play') ? 'var(--gold-bright)' : 'var(--text-secondary)',
                }}
              >
                How to play
              </Link>
              <Link
                to="/dashboard"
                className={`text-sm transition-colors ${
                  isActive('/dashboard') ? '' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  fontFamily: 'var(--font-body)',
                  color: isActive('/dashboard') ? 'var(--gold-bright)' : 'var(--text-secondary)',
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
                  fontFamily: 'var(--font-body)',
                  color: isActive('/profile') ? 'var(--gold-bright)' : 'var(--text-secondary)',
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
                    fontFamily: 'var(--font-body)',
                    color: location.pathname.startsWith('/admin')
                      ? 'var(--rogue-purple-bright)'
                      : 'var(--text-secondary)',
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
                  fontFamily: 'var(--font-body)',
                  borderColor: 'var(--bg-border)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-raised)',
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
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                backgroundColor: 'var(--blitz-red)',
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
