import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { adminApi, type CardWinRateRow } from '@/services/adminApi';
import { MATCHUP_DEFENSE_COLS, MATCHUP_OFFENSE_ROWS } from './constants';

const STALE_MS = 5 * 60 * 1000;
const STATS_QK = ['admin', 'stats'] as const;
const MIN_PLAYS_WINRATE = 5;

function heatmapCellBg(yards: number | null): string {
  if (yards === null || !Number.isFinite(yards)) return 'var(--cream)';
  const clamped = Math.min(14, Math.max(-10, yards));
  const t = (clamped + 10) / 24;
  if (t <= 0.5) {
    const u = t * 2;
    return `color-mix(in srgb, var(--red) ${Math.round((1 - u) * 88)}%, var(--cream))`;
  }
  const u = (t - 0.5) * 2;
  return `color-mix(in srgb, var(--cream) ${Math.round((1 - u) * 55)}%, var(--green-field))`;
}

function winRateHistogram(rows: CardWinRateRow[]) {
  const q = rows.filter((r) => r.playCount >= MIN_PLAYS_WINRATE);
  return [
    { label: '<35%', count: q.filter((r) => r.winRate < 0.35).length, outlier: true },
    { label: '35–45%', count: q.filter((r) => r.winRate >= 0.35 && r.winRate < 0.45).length, outlier: false },
    { label: '45–55%', count: q.filter((r) => r.winRate >= 0.45 && r.winRate < 0.55).length, outlier: false },
    { label: '55–60%', count: q.filter((r) => r.winRate >= 0.55 && r.winRate <= 0.6).length, outlier: false },
    { label: '>60%', count: q.filter((r) => r.winRate > 0.6).length, outlier: true },
  ];
}

function outlierCards(rows: CardWinRateRow[]): CardWinRateRow[] {
  return rows.filter(
    (r) =>
      r.playCount >= MIN_PLAYS_WINRATE &&
      (r.winRate > 0.6 || r.winRate < 0.35)
  );
}

function matchupMap(stats: { balance: { matchupYardAvg: Array<{ off: string; def: string; avgYards: number; count: number }> } } | undefined): Map<string, { avgYards: number; count: number }> {
  const m = new Map<string, { avgYards: number; count: number }>();
  for (const row of stats?.balance.matchupYardAvg ?? []) {
    m.set(`${row.off}|${row.def}`, { avgYards: row.avgYards, count: row.count });
  }
  return m;
}

function AdminDashboardPage(): JSX.Element {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: STATS_QK,
    queryFn: () => adminApi.stats.get(),
    staleTime: STALE_MS,
  });

  const recompute = useMutation({
    mutationFn: () => adminApi.stats.recompute(),
    onSuccess: (payload) => {
      qc.setQueryData(STATS_QK, payload);
    },
  });

  if (isLoading) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading dashboard…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm" style={{ color: 'var(--red)' }}>Could not load stats.</p>;
  }

  const nodes = Object.entries(data.sessions.byNode).sort((a, b) => Number(a[0]) - Number(b[0]));
  const hist = winRateHistogram(data.balance.cardWinRates);
  const outliers = outlierCards(data.balance.cardWinRates);
  const mm = matchupMap(data);
  const sparkPts = data.users.sparkline7d.map((v, i) => ({ day: `D${i + 1}`, v }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            As of {new Date(data.asOf).toLocaleString()} · Cached up to 5 minutes server-side.
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            {data.users.total} registered users · {data.users.activeLast7d} distinct players with session activity (7d)
          </p>
        </div>
        <button
          type="button"
          className="min-h-10 rounded border px-4 text-sm font-medium outline-none disabled:opacity-50"
          style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}
          disabled={recompute.isPending}
          onClick={() => recompute.mutate()}
        >
          {recompute.isPending ? 'Recomputing…' : 'Refresh stats now'}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Tile title="Active users (24h)">
          <p className="text-3xl tabular-nums" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
            {data.users.activeLast24h}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Distinct users with a play-log event in the last 24 hours.
          </p>
          <div className="mt-3 h-14 w-full min-w-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkPts} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="day" hide />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 2']} />
                <Tooltip
                  formatter={(value) => [`${value} users`, 'Distinct that day']}
                  labelFormatter={(l) => `UTC series ${l}`}
                />
                <Line type="monotone" dataKey="v" stroke="var(--blue-mid)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>
            Sparkline: distinct users per UTC day (last 7 days, oldest → newest).
          </p>
        </Tile>

        <Tile title="Active sessions">
          <p className="text-3xl tabular-nums" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
            {data.sessions.active}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            {data.sessions.completedLast7d} completed in the last 7 days
          </p>
          {nodes.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
              {nodes.map(([node, count]) => (
                <li key={node}>
                  Season node {node}: {count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>No active sessions.</p>
          )}
        </Tile>

        <Tile title="Card win rate distribution">
          <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>
            Cards with fewer than {MIN_PLAYS_WINRATE} plays are excluded from the histogram.
          </p>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <Tooltip />
                <Bar dataKey="count" name="Cards">
                  {hist.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.outlier ? 'var(--red-mid)' : 'var(--blue-mid)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {outliers.length > 0 ? (
            <div className="mt-2 rounded border px-2 py-2 text-xs" style={{ borderColor: 'var(--rule)' }}>
              <p className="font-medium" style={{ color: 'var(--red)' }}>Outliers (above 60% or below 35% win rate)</p>
              <ul className="mt-1 max-h-24 overflow-y-auto font-mono text-[11px]" style={{ color: 'var(--ink2)' }}>
                {outliers.map((c) => (
                  <li key={c.cardId}>
                    {c.cardId} · {(c.winRate * 100).toFixed(1)}% ({c.playCount} plays)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Tile>
      </div>

      <Tile title="Matchup yard average heatmap (7d)">
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
          Average yards per play by offensive type × defensive front. Scale: red (bad for offense) → cream → green.
        </p>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[400px] border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className="border p-1" style={{ borderColor: 'var(--rule)' }} />
                {MATCHUP_DEFENSE_COLS.map((c) => (
                  <th key={c} className="border p-1 font-medium" style={{ borderColor: 'var(--rule)', color: 'var(--ink2)' }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATCHUP_OFFENSE_ROWS.map((row) => (
                <tr key={row}>
                  <th className="border p-1 text-left font-medium" style={{ borderColor: 'var(--rule)' }}>
                    {row}
                  </th>
                  {MATCHUP_DEFENSE_COLS.map((col) => {
                    const key = `${row}|${col}`;
                    const s = mm.get(key);
                    const y = s?.avgYards ?? null;
                    return (
                      <td
                        key={col}
                        className="border p-1 tabular-nums"
                        style={{
                          borderColor: 'var(--rule)',
                          backgroundColor: heatmapCellBg(y),
                          color: 'var(--ink)',
                        }}
                        title={s ? `${s.count} plays` : undefined}
                      >
                        {y !== null ? y.toFixed(1) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tile>

      <Tile title="Recent admin actions">
        {Array.isArray(data.recentAudit) && data.recentAudit.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm">
            {data.recentAudit.map((entry, i) => {
              const e = entry as Record<string, unknown>;
              const ts = e.timestamp instanceof Date ? e.timestamp.toISOString() : String(e.timestamp ?? '');
              return (
                <li
                  key={`${String(e._id ?? i)}`}
                  className="rounded border px-2 py-1.5"
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>{String(e.action ?? '')}</span>
                  {' '}
                  <span style={{ color: 'var(--muted)' }}>·</span> {String(e.target ?? '')}
                  <br />
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {String(e.actor ?? '')} · {ts ? new Date(ts).toLocaleString() : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>No audit entries yet.</p>
        )}
      </Tile>
    </div>
  );
}

function Tile({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section
      className="rounded border p-4 shadow-sm"
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--white)' }}
    >
      <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default AdminDashboardPage;
