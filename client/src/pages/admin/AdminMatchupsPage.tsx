import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { CardType } from '@/game/types';
import {
  adminApi,
  type AdminMatchupMatrix,
  type AdminMatchupResponse,
} from '@/services/adminApi';
import { ALL_CARD_TYPES, MATCHUP_DEFENSE_COLS, MATCHUP_OFFENSE_ROWS } from './constants';

const STALE_STATS_MS = 5 * 60 * 1000;

function cloneMatrix(m: AdminMatchupMatrix): AdminMatchupMatrix {
  const next = {} as AdminMatchupMatrix;
  for (const r of ALL_CARD_TYPES) {
    next[r] = { ...m[r] };
  }
  return next;
}

function typeLabel(t: CardType): string {
  switch (t) {
    case 'run-in':
      return 'Run In';
    case 'run-out':
      return 'Run Out';
    case 'pass-s':
      return 'Pass S';
    case 'pass-m':
      return 'Pass M';
    case 'pass-d':
      return 'Pass D';
    case 'run-d':
      return 'Run D';
    default:
      return t.charAt(0).toUpperCase() + t.slice(1);
  }
}

const matchupQueryKey = ['admin', 'matchups'] as const;
const statsQueryKey = ['admin', 'stats'] as const;

function AdminMatchupsPage(): JSX.Element {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [draftMatrix, setDraftMatrix] = useState<AdminMatchupMatrix | null>(null);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: matchupQueryKey,
    queryFn: () => adminApi.matchups.get(),
  });

  const { data: stats } = useQuery({
    queryKey: statsQueryKey,
    queryFn: () => adminApi.stats.get(),
    staleTime: STALE_STATS_MS,
  });

  const matchupYardMap = useMemo(() => {
    const m: Record<string, { avgYards: number; count: number }> = {};
    for (const row of stats?.balance.matchupYardAvg ?? []) {
      m[`${row.off}|${row.def}`] = { avgYards: row.avgYards, count: row.count };
    }
    return m;
  }, [stats]);

  const matrix = useMemo(() => {
    if (editMode && draftMatrix) return draftMatrix;
    return data?.matrix ?? null;
  }, [data?.matrix, editMode, draftMatrix]);

  const labels = useMemo(() => {
    if (editMode) return draftLabels;
    return data?.labels ?? {};
  }, [data?.labels, editMode, draftLabels]);

  const enterEdit = useCallback(() => {
    if (!data) return;
    setFormError(null);
    setDraftMatrix(cloneMatrix(data.matrix));
    setDraftLabels({ ...data.labels });
    setEditMode(true);
  }, [data]);

  const exitEdit = useCallback(() => {
    setEditMode(false);
    setDraftMatrix(null);
    setDraftLabels({});
    setFormError(null);
  }, []);

  const saveMut = useMutation({
    mutationFn: (body: { matrix: AdminMatchupMatrix; labels: Record<string, string> }) =>
      adminApi.matchups.put(body),
    onMutate: async (nextBody) => {
      await qc.cancelQueries({ queryKey: matchupQueryKey });
      const prev = qc.getQueryData<AdminMatchupResponse>(matchupQueryKey);
      if (prev) {
        qc.setQueryData<AdminMatchupResponse>(matchupQueryKey, {
          ...prev,
          matrix: cloneMatrix(nextBody.matrix),
          labels: { ...nextBody.labels },
          version: prev.version + 1,
        });
      }
      return { prev } as { prev: AdminMatchupResponse | undefined };
    },
    onError: (err, _body, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(matchupQueryKey, ctx.prev);
      }
      if (isAxiosError(err)) setFormError(err.response?.data?.message || err.message);
      else setFormError('Save failed');
    },
    onSuccess: (res) => {
      qc.setQueryData(matchupQueryKey, res);
      void qc.invalidateQueries({ queryKey: statsQueryKey });
      exitEdit();
      setFormError(null);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: matchupQueryKey });
    },
  });

  const setCell = (row: CardType, col: CardType, raw: string): void => {
    if (!editMode || !draftMatrix) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setDraftMatrix((dm) => {
      if (!dm) return dm;
      const next = cloneMatrix(dm);
      next[row] = { ...next[row], [col]: n };
      return next;
    });
  };

  const setLabelForKey = (key: string, value: string): void => {
    setDraftLabels((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading matchup matrix…</p>;
  }
  if (isError || !data || !matrix) {
    return <p className="text-sm" style={{ color: 'var(--red)' }}>Could not load matchups.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
          >
            Matchups
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Version {data.version}
            {data.updatedAt ? ` · Updated ${new Date(data.updatedAt).toLocaleString()}` : ''}
            {data.updatedBy ? ` · ${data.updatedBy}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editMode ? (
            <button
              type="button"
              className="min-h-10 rounded border px-4 text-sm font-medium outline-none ring-offset-2 focus-visible:ring-2"
              style={{
                borderColor: 'var(--blue)',
                color: 'var(--blue)',
                backgroundColor: 'var(--surface-panel)',
              }}
              onClick={enterEdit}
            >
              Edit mode
            </button>
          ) : (
            <>
              <button
                type="button"
                className="min-h-10 rounded border px-4 text-sm outline-none ring-offset-2 focus-visible:ring-2"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                onClick={exitEdit}
                disabled={saveMut.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-h-10 rounded px-4 text-sm font-medium text-white outline-none ring-offset-2 focus-visible:ring-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--blue-mid)' }}
                disabled={saveMut.isPending || !draftMatrix}
                onClick={() => {
                  if (!draftMatrix) return;
                  saveMut.mutate({ matrix: draftMatrix, labels: draftLabels });
                }}
              >
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </header>

      {formError ? (
        <p className="rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          {formError}
        </p>
      ) : null}

      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Small badges show average yards per play (last 7 days) and sample count. Matrix cells are matchup power modifiers.
      </p>

      <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--rule)' }}>
        <table className="w-full min-w-[640px] border-collapse text-center text-sm">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 border p-2 text-left text-xs font-normal"
                style={{
                  borderColor: 'var(--rule)',
                  backgroundColor: 'var(--cream)',
                  color: 'var(--muted)',
                }}
              >
                Offense / Def
              </th>
              {MATCHUP_DEFENSE_COLS.map((c) => (
                <th
                  key={c}
                  className="border p-2 text-xs font-medium"
                  style={{ borderColor: 'var(--rule)', color: 'var(--ink2)' }}
                >
                  {typeLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATCHUP_OFFENSE_ROWS.map((row) => (
              <tr key={row}>
                <th
                  className="sticky left-0 z-10 border p-2 text-left text-xs font-medium"
                  style={{
                    borderColor: 'var(--rule)',
                    backgroundColor: 'var(--cream)',
                    color: 'var(--ink)',
                  }}
                >
                  {typeLabel(row)}
                </th>
                {MATCHUP_DEFENSE_COLS.map((col) => {
                  const key = `${row}|${col}`;
                    const stat = matchupYardMap[key];
                  const mod = matrix[row][col];
                  return (
                    <td
                      key={col}
                      className="border p-1 align-top"
                      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)' }}
                    >
                      {editMode ? (
                        <input
                          type="number"
                          step="1"
                          className="w-full min-w-[3rem] rounded border px-1 py-1 text-center tabular-nums outline-none"
                          style={{ borderColor: 'var(--rule)' }}
                          value={mod}
                          aria-label={`Modifier ${row} vs ${col}`}
                          onChange={(e) => setCell(row, col, e.target.value)}
                        />
                      ) : (
                        <div
                          className="py-1 tabular-nums font-semibold"
                          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
                        >
                          {mod > 0 ? `+${mod}` : mod}
                        </div>
                      )}
                      <div
                        className="mx-auto mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] tabular-nums"
                        style={{
                          backgroundColor: 'var(--cream)',
                          color: 'var(--muted)',
                        }}
                        title={stat ? `${stat.count} plays` : 'No plays in window'}
                      >
                        {stat ? `${stat.avgYards.toFixed(1)} yd` : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink2)' }}>
          Matchup labels
        </h2>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Human-readable blurbs keyed as <code className="text-[11px]">offType|defType</code>.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MATCHUP_OFFENSE_ROWS.flatMap((row) =>
            MATCHUP_DEFENSE_COLS.map((col) => {
              const key = `${row}|${col}`;
              return (
                <label key={key} className="flex flex-col gap-1 rounded border p-2 text-xs" style={{ borderColor: 'var(--rule)' }}>
                  <span style={{ color: 'var(--muted)' }}>{key}</span>
                  <input
                    type="text"
                    className="min-h-9 rounded border px-2 text-sm outline-none"
                    style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                    value={labels[key] ?? ''}
                    disabled={!editMode}
                    onChange={(e) => setLabelForKey(key, e.target.value)}
                  />
                </label>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminMatchupsPage;
