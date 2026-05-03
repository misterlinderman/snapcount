import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminSessionListRow } from '@/services/adminApi';

function sessionScore(row: AdminSessionListRow): string | null {
  const r = row.game?.scoreRed;
  const b = row.game?.scoreBlue;
  if (typeof r === 'number' && typeof b === 'number') {
    return `Red ${r} – Blue ${b}`;
  }
  return null;
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const s = status.toLowerCase();
  const bg =
    s === 'active'
      ? 'var(--green-turf)'
      : s === 'completed'
        ? 'var(--blue-mid)'
        : 'var(--muted)';
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: bg }}
    >
      {status}
    </span>
  );
}

function AdminSessionsPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const legacyOpen = searchParams.get('open');

  useEffect(() => {
    if (legacyOpen) {
      navigate(`/admin/sessions/${encodeURIComponent(legacyOpen)}`, { replace: true });
    }
  }, [legacyOpen, navigate]);

  const [status, setStatus] = useState<'active' | 'completed' | 'abandoned' | ''>('');
  const [userFilter, setUserFilter] = useState('');
  const [userFilterSubmit, setUserFilterSubmit] = useState('');
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['admin', 'sessions', status, userFilterSubmit, page],
    queryFn: () =>
      adminApi.sessions.list({
        status: status || undefined,
        user: userFilterSubmit.trim() || undefined,
        page,
        limit: 25,
      }),
  });

  const applyFilters = (e: FormEvent): void => {
    e.preventDefault();
    setPage(1);
    setUserFilterSubmit(userFilter.trim());
  };

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
        >
          Sessions
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Paginated list with status and score. Open a row for the event replay viewer.
        </p>
      </header>

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-2">
        <label className="text-xs" style={{ color: 'var(--muted)' }}>
          Status
          <select
            className="mt-1 block min-h-10 rounded border px-2 text-sm"
            style={{ borderColor: 'var(--rule)' }}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </label>
        <label className="min-w-[12rem] flex-1 text-xs" style={{ color: 'var(--muted)' }}>
          User id
          <input
            className="mt-1 block min-h-10 w-full rounded border px-2 text-sm"
            style={{ borderColor: 'var(--rule)' }}
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="min-h-10 rounded px-4 text-sm text-white"
          style={{ backgroundColor: 'var(--blue-mid)' }}
        >
          Apply
        </button>
      </form>

      <section className="rounded border" style={{ borderColor: 'var(--rule)' }}>
        {listQuery.isLoading ? (
          <p className="p-4 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <ul className="max-h-[min(70vh,560px)] divide-y overflow-y-auto" style={{ borderColor: 'var(--rule)' }}>
            {listQuery.data?.items.map((row) => {
              const id = row._id;
              const sc = sessionScore(row);
              const res = row.result ? ` · ${row.result}` : '';
              return (
                <li key={id}>
                  <Link
                    to={`/admin/sessions/${encodeURIComponent(id)}`}
                    className="flex min-h-14 flex-col gap-1 px-3 py-2 text-sm outline-none ring-offset-2 focus-visible:ring-2 hover:bg-[var(--cream)]"
                    style={{ color: 'var(--ink)' }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={row.status} />
                      <span className="font-mono text-xs">{id}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {row.user}
                      {sc ? ` · ${sc}` : ''}
                      {res}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {listQuery.data && listQuery.data.total > listQuery.data.limit ? (
          <div className="flex items-center justify-between border-t p-2 text-xs" style={{ borderColor: 'var(--rule)' }}>
            <button
              type="button"
              className="text-[var(--blue)] disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ color: 'var(--muted)' }}>Page {page}</span>
            <button
              type="button"
              className="text-[var(--blue)] disabled:opacity-40"
              disabled={page * listQuery.data.limit >= listQuery.data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default AdminSessionsPage;
