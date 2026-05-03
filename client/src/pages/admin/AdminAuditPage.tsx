import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminAuditEntry } from '@/services/adminApi';
import { flattenJsonDiff } from './auditDiff';

function formatJson(v: unknown): string {
  if (v === undefined || v === null) return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

interface AuditDetailModalProps {
  entry: AdminAuditEntry | null;
  onClose: () => void;
}

function AuditDetailModal({ entry, onClose }: AuditDetailModalProps): JSX.Element | null {
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, onClose]);

  if (!entry) return null;

  const diffRows = flattenJsonDiff(entry.before ?? null, entry.after ?? null);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'rgba(15, 20, 25, 0.45)' }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded border shadow-lg"
        style={{ backgroundColor: 'var(--white)', borderColor: 'var(--rule)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-4 py-3"
          style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--cream)' }}
        >
          <div>
            <h2 id="audit-detail-title" className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              {entry.action}
            </h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              {entry.target} · {entry.actor} · {new Date(entry.timestamp).toLocaleString()}
            </p>
            {entry.reason ? (
              <p className="mt-1 text-xs italic" style={{ color: 'var(--ink2)' }}>Reason: {entry.reason}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="min-h-10 shrink-0 rounded border px-3 text-sm outline-none ring-offset-2 focus-visible:ring-2"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-5rem)] overflow-y-auto p-4">
          {diffRows.length > 0 ? (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Changed fields
              </h3>
              <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--rule)' }}>
                <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--cream)' }}>
                      <th className="border p-2 font-medium" style={{ borderColor: 'var(--rule)' }}>Path</th>
                      <th className="border p-2 font-medium" style={{ borderColor: 'var(--rule)', color: 'var(--red)' }}>Before</th>
                      <th className="border p-2 font-medium" style={{ borderColor: 'var(--rule)', color: 'var(--green-field)' }}>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffRows.map((r) => (
                      <tr key={r.path}>
                        <td className="border p-2 align-top font-mono text-[11px]" style={{ borderColor: 'var(--rule)', color: 'var(--ink2)' }}>
                          {r.path}
                        </td>
                        <td className="border p-2 align-top font-mono text-[11px] whitespace-pre-wrap break-all" style={{ borderColor: 'var(--rule)' }}>
                          {r.before}
                        </td>
                        <td className="border p-2 align-top font-mono text-[11px] whitespace-pre-wrap break-all" style={{ borderColor: 'var(--rule)' }}>
                          {r.after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mb-4 text-xs" style={{ color: 'var(--muted)' }}>No field-level diff (snapshots equal or empty).</p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Before</h3>
              <pre
                className="max-h-60 overflow-auto rounded border p-3 text-[11px] leading-relaxed"
                style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--cream)', color: 'var(--ink)' }}
              >
                {formatJson(entry.before)}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>After</h3>
              <pre
                className="max-h-60 overflow-auto rounded border p-3 text-[11px] leading-relaxed"
                style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--cream)', color: 'var(--ink)' }}
              >
                {formatJson(entry.after)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminAuditPage(): JSX.Element {
  const [q, setQ] = useState('');
  const [actor, setActor] = useState('');
  const [target, setTarget] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({
    q: '',
    actor: '',
    target: '',
    action: '',
    from: '',
    to: '',
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminAuditEntry | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', applied, page],
    queryFn: () =>
      adminApi.audit.list({
        q: applied.q.trim() || undefined,
        actor: applied.actor.trim() || undefined,
        target: applied.target.trim() || undefined,
        action: applied.action.trim() || undefined,
        from: applied.from.trim() || undefined,
        to: applied.to.trim() || undefined,
        page,
        limit: 25,
      }),
  });

  const apply = useCallback((e: FormEvent): void => {
    e.preventDefault();
    setPage(1);
    setApplied({
      q: q.trim(),
      actor: actor.trim(),
      target: target.trim(),
      action: action.trim(),
      from: from.trim(),
      to: to.trim(),
    });
  }, [q, actor, target, action, from, to]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside
        className="shrink-0 lg:sticky lg:top-20 lg:w-64"
        aria-label="Audit filters"
      >
        <div className="rounded border p-4" style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--white)' }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
            Filters
          </h2>
          <form onSubmit={apply} className="mt-3 flex flex-col gap-3">
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Search (actor, target, or action)
              <input
                type="search"
                className="mt-1 block min-h-10 w-full rounded border px-2 text-sm outline-none"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Actor
              <input
                type="text"
                className="mt-1 block min-h-10 w-full rounded border px-2 text-sm outline-none"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Target
              <input
                type="text"
                className="mt-1 block min-h-10 w-full rounded border px-2 text-sm outline-none"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              Action
              <input
                type="text"
                className="mt-1 block min-h-10 w-full rounded border px-2 text-sm outline-none"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g. card.update"
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              From (date)
              <input
                type="date"
                className="mt-1 block min-h-10 w-full rounded border px-2 text-sm outline-none"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--muted)' }}>
              To (date)
              <input
                type="date"
                className="mt-1 block min-h-10 w-full rounded border px-2 text-sm outline-none"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="min-h-10 rounded text-sm font-medium text-white outline-none"
              style={{ backgroundColor: 'var(--blue-mid)' }}
            >
              Apply filters
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <header>
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
          >
            Audit log
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Append-only admin writes. Click a row for before / after and a field diff.
          </p>
        </header>

        <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--rule)' }}>
          {isLoading ? (
            <p className="p-4 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--cream)' }}>
                  <th className="border-b p-2 text-xs font-bold uppercase tracking-wide" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>Time</th>
                  <th className="border-b p-2 text-xs font-bold uppercase tracking-wide" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>Action</th>
                  <th className="border-b p-2 text-xs font-bold uppercase tracking-wide" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>Target</th>
                  <th className="border-b p-2 text-xs font-bold uppercase tracking-wide" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>Actor</th>
                  <th className="border-b p-2 text-xs font-bold uppercase tracking-wide" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((e) => (
                  <tr
                    key={e._id}
                    className="cursor-pointer outline-none hover:bg-[var(--cream)] focus-visible:ring-2"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(e)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        setSelected(e);
                      }
                    }}
                  >
                    <td className="border-b p-2 align-top text-xs tabular-nums" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="border-b p-2 align-top font-medium" style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}>{e.action}</td>
                    <td className="border-b p-2 align-top font-mono text-xs break-all" style={{ borderColor: 'var(--rule)', color: 'var(--ink2)' }}>{e.target}</td>
                    <td className="border-b p-2 align-top font-mono text-xs break-all" style={{ borderColor: 'var(--rule)', color: 'var(--ink2)' }}>{e.actor}</td>
                    <td className="border-b p-2 align-top text-xs italic" style={{ borderColor: 'var(--rule)', color: 'var(--muted)' }}>
                      {e.reason ? (e.reason.length > 40 ? `${e.reason.slice(0, 40)}…` : e.reason) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.total > data.limit ? (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="rounded px-3 py-1 disabled:opacity-40"
              style={{ color: 'var(--blue)' }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ color: 'var(--muted)' }}>Page {page} of {Math.ceil(data.total / data.limit)}</span>
            <button
              type="button"
              className="rounded px-3 py-1 disabled:opacity-40"
              style={{ color: 'var(--blue)' }}
              disabled={page * data.limit >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <AuditDetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default AdminAuditPage;
