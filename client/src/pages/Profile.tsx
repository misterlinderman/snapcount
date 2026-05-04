import { useAuth0 } from '@auth0/auth0-react';

function Profile() {
  const { user } = useAuth0();

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-1">
      <h1
        className="mb-8 text-3xl font-bold uppercase tracking-[0.04em]"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
      >
        Profile
      </h1>

      <div className="card">
        <div className="flex items-start gap-6">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name || 'User'}
              className="h-24 w-24 rounded-full"
              style={{ boxShadow: '0 0 0 2px var(--bg-border)' }}
            />
          )}
          <div className="flex-1">
            <h2 className="mb-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {user.name}
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              {user.email}
            </p>

            {user.email_verified && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--success-green)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                }}
              >
                <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Email Verified
              </span>
            )}
          </div>
        </div>

        <hr className="my-6" style={{ borderColor: 'var(--bg-border)' }} />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Account Details
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                User ID
              </label>
              <p
                className="break-all rounded-lg px-3 py-2 font-mono text-sm"
                style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)' }}
              >
                {user.sub}
              </p>
            </div>

            {user.nickname && (
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Nickname
                </label>
                <p style={{ color: 'var(--text-primary)' }}>{user.nickname}</p>
              </div>
            )}

            {user.updated_at && (
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Last Updated
                </label>
                <p style={{ color: 'var(--text-primary)' }}>
                  {new Date(user.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        <hr className="my-6" style={{ borderColor: 'var(--bg-border)' }} />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Raw User Data
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This is the full user object from Auth0. Useful for debugging.
          </p>
          <pre
            className="overflow-x-auto rounded-lg p-4 text-sm"
            style={{
              backgroundColor: 'var(--bg-void)',
              color: 'var(--gold-bright)',
              border: '1px solid var(--bg-border)',
            }}
          >
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Profile;
