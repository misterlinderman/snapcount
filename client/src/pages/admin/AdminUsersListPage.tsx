import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/adminApi';

function AdminUsersListPage(): JSX.Element {
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['admin', 'users', qDebounced, page],
    queryFn: () => adminApi.users.list({ q: qDebounced || undefined, page, limit: 20 }),
  });

  const runSearch = (e: FormEvent): void => {
    e.preventDefault();
    setPage(1);
    setQDebounced(q.trim());
  };

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
        >
          Users
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Search by email, display name, or Auth0 id. Open a user for profile, decks, and support actions.
        </p>
      </header>

      <form onSubmit={runSearch} className="flex flex-wrap gap-2">
        <input
          type="search"
          className="min-h-10 min-w-[200px] flex-1 rounded border px-3 text-sm outline-none"
          style={{ borderColor: 'var(--rule)' }}
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          className="min-h-10 rounded px-4 text-sm font-medium text-white outline-none"
          style={{ backgroundColor: 'var(--blue-mid)' }}
        >
          Search
        </button>
      </form>

      <section className="rounded border" style={{ borderColor: 'var(--rule)' }}>
        {listQuery.isLoading ? (
          <p className="p-4 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--rule)' }}>
            {listQuery.data?.items.map((item) => (
              <li key={item._id}>
                <Link
                  to={`/admin/users/${encodeURIComponent(item._id)}`}
                  className="flex min-h-12 flex-col items-start gap-0.5 px-3 py-2 text-left text-sm outline-none ring-offset-2 focus-visible:ring-2 hover:bg-[var(--cream)]"
                  style={{ color: 'var(--ink)' }}
                >
                  <span>{item.displayName}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.email}</span>
                  <span className="text-xs uppercase" style={{ color: 'var(--blue)' }}>{item.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {listQuery.data && listQuery.data.total > listQuery.data.limit ? (
          <div className="flex items-center justify-between border-t p-2 text-xs" style={{ borderColor: 'var(--rule)' }}>
            <button
              type="button"
              className="rounded px-2 py-1 disabled:opacity-40"
              style={{ color: 'var(--blue)' }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ color: 'var(--muted)' }}>Page {page}</span>
            <button
              type="button"
              className="rounded px-2 py-1 disabled:opacity-40"
              style={{ color: 'var(--blue)' }}
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

export default AdminUsersListPage;
