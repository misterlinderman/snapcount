import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { adminApi } from '@/services/adminApi';

function AdminUserDetailPage(): JSX.Element {
  const { userId = '' } = useParams<{ userId: string }>();
  const decodedId = decodeURIComponent(userId);
  const qc = useQueryClient();
  const [dpAmount, setDpAmount] = useState('1');
  const [dpReason, setDpReason] = useState('');
  const [endReason, setEndReason] = useState('');
  const [endSessionId, setEndSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['admin', 'users', decodedId],
    queryFn: () => adminApi.users.get(decodedId),
    enabled: !!decodedId,
  });

  const activeSessionsQuery = useQuery({
    queryKey: ['admin', 'sessions', 'for-user', decodedId],
    queryFn: () => adminApi.sessions.list({ user: decodedId, status: 'active', page: 1, limit: 10 }),
    enabled: !!decodedId,
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) => adminApi.users.updateRole(id, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setError(null);
    },
    onError: (e) => {
      if (isAxiosError(e)) setError(e.response?.data?.message || e.message);
      else setError('Role update failed');
    },
  });

  const grantMut = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason: string }) =>
      adminApi.users.grantDp(id, { amount, reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setDpReason('');
      setError(null);
    },
    onError: (e) => {
      if (isAxiosError(e)) setError(e.response?.data?.message || e.message);
      else setError('Grant DP failed');
    },
  });

  const endMut = useMutation({
    mutationFn: ({ id, sessionId, reason }: { id: string; sessionId: string; reason: string }) =>
      adminApi.users.endSession(id, { sessionId, reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setEndReason('');
      setEndSessionId('');
      setError(null);
    },
    onError: (e) => {
      if (isAxiosError(e)) setError(e.response?.data?.message || e.message);
      else setError('End session failed');
    },
  });

  const u = detailQuery.data?.user;
  const activeItems = activeSessionsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <p>
        <Link
          to="/admin/users"
          className="text-sm underline outline-none"
          style={{ color: 'var(--blue)' }}
        >
          ← Back to user search
        </Link>
      </p>

      {error ? (
        <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
      ) : null}

      {detailQuery.isLoading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading user…</p>
      ) : u ? (
        <div className="space-y-6">
          <header>
            <h1
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
            >
              {u.displayName}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{u.email}</p>
            <p className="mt-1 text-xs font-mono" style={{ color: 'var(--muted)' }}>{u._id}</p>
            <p className="mt-2 text-sm">
              Role: <strong>{u.role}</strong>
            </p>
            <p className="text-sm">Stats: {u.stats.gamesPlayed} games, {u.stats.touchdowns} TD</p>
          </header>

          <div className="flex flex-wrap gap-2">
            {u.role === 'user' ? (
              <button
                type="button"
                className="min-h-9 rounded border px-3 text-sm"
                style={{ borderColor: 'var(--gold)', color: 'var(--ink2)' }}
                disabled={roleMut.isPending}
                onClick={() => {
                  if (window.confirm('Promote this user to admin?')) {
                    roleMut.mutate({ id: u._id, role: 'admin' });
                  }
                }}
              >
                Promote to admin
              </button>
            ) : (
              <button
                type="button"
                className="min-h-9 rounded border px-3 text-sm"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                disabled={roleMut.isPending}
                onClick={() => {
                  if (window.confirm('Demote this admin to user?')) {
                    roleMut.mutate({ id: u._id, role: 'user' });
                  }
                }}
              >
                Demote to user
              </button>
            )}
          </div>

          <div className="rounded border p-3" style={{ borderColor: 'var(--rule)' }}>
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Grant DP (default deck)
            </h2>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1 text-xs">
                Amount
                <input
                  type="number"
                  min={1}
                  className="min-h-9 rounded border px-2 text-sm"
                  style={{ borderColor: 'var(--rule)' }}
                  value={dpAmount}
                  onChange={(e) => setDpAmount(e.target.value)}
                />
              </label>
              <label className="flex-[2] flex flex-col gap-1 text-xs">
                Reason (required)
                <input
                  type="text"
                  className="min-h-9 rounded border px-2 text-sm"
                  style={{ borderColor: 'var(--rule)' }}
                  value={dpReason}
                  onChange={(e) => setDpReason(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="min-h-9 rounded px-3 text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--green-field)' }}
                disabled={grantMut.isPending || !dpReason.trim()}
                onClick={() => {
                  const n = Number(dpAmount);
                  if (!Number.isFinite(n) || n < 1) return;
                  grantMut.mutate({ id: u._id, amount: Math.floor(n), reason: dpReason.trim() });
                }}
              >
                Grant
              </button>
            </div>
          </div>

          <div className="rounded border p-3" style={{ borderColor: 'var(--rule)' }}>
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              End active session
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              Marks the chosen session abandoned (audit-logged). Session must belong to this user and be active.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1 text-xs">
                Session
                <select
                  className="min-h-9 rounded border px-2 text-sm"
                  style={{ borderColor: 'var(--rule)' }}
                  value={endSessionId}
                  onChange={(e) => setEndSessionId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {activeItems.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s._id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-[2] flex flex-col gap-1 text-xs">
                Reason (required)
                <input
                  type="text"
                  className="min-h-9 rounded border px-2 text-sm"
                  style={{ borderColor: 'var(--rule)' }}
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="min-h-9 rounded px-3 text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--red-mid)' }}
                disabled={endMut.isPending || !endSessionId || !endReason.trim()}
                onClick={() => {
                  if (!window.confirm('End this session for the user?')) return;
                  endMut.mutate({ id: u._id, sessionId: endSessionId, reason: endReason.trim() });
                }}
              >
                End session
              </button>
            </div>
            {activeItems.length === 0 && !activeSessionsQuery.isLoading ? (
              <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>No active sessions for this user.</p>
            ) : null}
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Decks</h2>
            <ul className="mt-1 text-sm">
              {detailQuery.data?.decks.map((d) => (
                <li key={d._id} className="py-1">
                  {d.name} · DP {d.dp}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Recent sessions
            </h2>
            <ul className="mt-1 space-y-1 text-sm">
              {detailQuery.data?.recentSessions.map((s) => {
                const r = s.game?.scoreRed;
                const b = s.game?.scoreBlue;
                const score =
                  typeof r === 'number' && typeof b === 'number' ? ` · ${r}–${b}` : '';
                return (
                  <li key={s._id}>
                    <Link
                      to={`/admin/sessions/${encodeURIComponent(s._id)}`}
                      className="underline outline-none hover:opacity-80"
                      style={{ color: 'var(--blue)' }}
                    >
                      {s._id}
                    </Link>
                    <span style={{ color: 'var(--muted)' }}>
                      {' '}
                      {s.status}
                      {score}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--red)' }}>User not found.</p>
      )}
    </div>
  );
}

export default AdminUserDetailPage;
