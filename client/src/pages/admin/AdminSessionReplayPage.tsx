import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/adminApi';

function isEventList(v: unknown): v is Array<Record<string, unknown>> {
  return Array.isArray(v);
}

function formatGameScore(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const r = g.scoreRed;
  const b = g.scoreBlue;
  if (typeof r === 'number' && typeof b === 'number') {
    return `Red ${r} – Blue ${b} (last stored snapshot — not necessarily after this step)`;
  }
  return null;
}

function AdminSessionReplayPage(): JSX.Element {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const decoded = decodeURIComponent(sessionId);
  const [eventIdx, setEventIdx] = useState(0);

  const sessionQuery = useQuery({
    queryKey: ['admin', 'sessions', 'one', decoded],
    queryFn: () => adminApi.sessions.get(decoded),
    enabled: !!decoded,
  });

  const events = useMemo(() => {
    const raw = sessionQuery.data?.events;
    return isEventList(raw) ? raw : [];
  }, [sessionQuery.data]);

  useEffect(() => {
    setEventIdx(0);
  }, [decoded, sessionQuery.data?.updatedAt]);

  const current = events[eventIdx] ?? null;
  const previous = eventIdx > 0 ? events[eventIdx - 1] : null;
  const snapshotNote = formatGameScore(sessionQuery.data?.game);

  return (
    <div className="space-y-6">
      <p>
        <Link
          to="/admin/sessions"
          className="text-sm underline outline-none"
          style={{ color: 'var(--blue)' }}
        >
          ← Back to sessions
        </Link>
      </p>

      {sessionQuery.isLoading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading session…</p>
      ) : sessionQuery.data ? (
        <>
          <header>
            <h1
              className="font-mono text-sm font-semibold break-all"
              style={{ color: 'var(--ink)' }}
            >
              {decoded}
            </h1>
            <p className="mt-2 text-sm">
              Status <strong>{String(sessionQuery.data.status ?? '')}</strong> · User{' '}
              <strong>{String(sessionQuery.data.user ?? '')}</strong>
            </p>
            {snapshotNote ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                {snapshotNote}
              </p>
            ) : null}
            <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--muted)' }}>
              Per-play field state is not snapshotted in the database. Below: previous log entry vs this entry.
              Reconstructing full state at each step needs an engine replay (stretch goal).
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="min-h-9 rounded border px-3 text-sm disabled:opacity-40"
              style={{ borderColor: 'var(--rule)' }}
              disabled={eventIdx <= 0}
              onClick={() => setEventIdx((i) => Math.max(0, i - 1))}
            >
              Prev event
            </button>
            <button
              type="button"
              className="min-h-9 rounded border px-3 text-sm disabled:opacity-40"
              style={{ borderColor: 'var(--rule)' }}
              disabled={eventIdx >= events.length - 1}
              onClick={() => setEventIdx((i) => Math.min(events.length - 1, i + 1))}
            >
              Next event
            </button>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {events.length > 0 ? `${eventIdx + 1} / ${events.length}` : '0 events'}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Before this event (prior log entry)
              </h2>
              {previous ? (
                <pre
                  className="max-h-[420px] overflow-auto rounded border p-3 text-xs leading-relaxed"
                  style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--cream)', color: 'var(--ink)' }}
                >
                  {JSON.stringify(previous, null, 2)}
                </pre>
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>—</p>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                This event
              </h2>
              {current ? (
                <pre
                  className="max-h-[420px] overflow-auto rounded border p-3 text-xs leading-relaxed"
                  style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--cream)', color: 'var(--ink)' }}
                >
                  {JSON.stringify(current, null, 2)}
                </pre>
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>No events on this session.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--red)' }}>Session not found.</p>
      )}
    </div>
  );
}

export default AdminSessionReplayPage;
