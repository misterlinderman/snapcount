import { ReactNode, useMemo, useState } from 'react';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Used for sortable columns when `sortable` is true */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableFilterDef<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  /** @param value selected option value (never "all" if you use allOptionValue) */
  match: (row: T, value: string) => boolean;
  /** Sentinel for "no filter"; defaults to `all` */
  allValue?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchMatch?: (row: T, q: string) => boolean;
  filters?: DataTableFilterDef<T>[];
  onEdit?: (row: T) => void;
  onDeactivate?: (row: T) => void;
  deactivateLabel?: string;
  deactivateDisabled?: (row: T) => boolean;
  emptyMessage?: string;
}

type SortDir = 'asc' | 'desc';

function DataTable<T>({
  rows,
  columns,
  rowKey,
  isLoading,
  searchPlaceholder = 'Search…',
  searchMatch,
  filters = [],
  onEdit,
  onDeactivate,
  deactivateLabel = 'Deactivate',
  deactivateDisabled,
  emptyMessage = 'No rows match.',
}: DataTableProps<T>): JSX.Element {
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((f) => [f.id, f.allValue ?? 'all']))
  );
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const displayRows = useMemo(() => {
    let out = [...rows];
    const q = search.trim().toLowerCase();
    if (q && searchMatch) {
      out = out.filter((r) => searchMatch(r, q));
    }
    for (const f of filters) {
      const v = filterState[f.id] ?? f.allValue ?? 'all';
      const all = f.allValue ?? 'all';
      if (v !== all) {
        out = out.filter((r) => f.match(r, v));
      }
    }
    if (sortCol) {
      const col = columns.find((c) => c.id === sortCol);
      if (col?.sortable && col.sortValue) {
        const dir = sortDir === 'asc' ? 1 : -1;
        out.sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          if (typeof va === 'number' && typeof vb === 'number') {
            return (va - vb) * dir;
          }
          return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' }) * dir;
        });
      }
    }
    return out;
  }, [rows, search, searchMatch, filters, filterState, sortCol, sortDir, columns]);

  const toggleSort = (colId: string) => {
    const col = columns.find((c) => c.id === colId);
    if (!col?.sortable) return;
    if (sortCol !== colId) {
      setSortCol(colId);
      setSortDir('asc');
    } else {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    }
  };

  if (isLoading) {
    return <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label
          className="flex min-w-[12rem] max-w-md flex-1 flex-col text-xs"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}
        >
          Search
          <input
            className="mt-1 min-h-10 rounded border px-2 text-sm"
            style={{
              borderColor: 'var(--rule)',
              backgroundColor: 'var(--surface-panel)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-serif)',
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>
        {filters.map((f) => (
          <label key={f.id} className="flex flex-col text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}>
            {f.label}
            <select
              className="mt-1 min-h-10 rounded border px-2 text-sm"
              style={{
                borderColor: 'var(--rule)',
                backgroundColor: 'var(--surface-panel)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-serif)',
              }}
              value={filterState[f.id] ?? f.allValue ?? 'all'}
              onChange={(e) => setFilterState((s) => ({ ...s, [f.id]: e.target.value }))}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--rule)' }}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-panel)', borderBottom: '1px solid var(--rule)' }}>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={`p-3 font-semibold ${col.headerClassName ?? ''} ${
                    col.sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}
                  onClick={() => col.sortable && toggleSort(col.id)}
                  onKeyDown={(e) => {
                    if (col.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      toggleSort(col.id);
                    }
                  }}
                  role={col.sortable ? 'button' : undefined}
                  tabIndex={col.sortable ? 0 : undefined}
                >
                  {col.header}
                  {col.sortable && sortCol === col.id ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              {onEdit || onDeactivate ? (
                <th className="p-3 font-semibold text-right" style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }} />
              ) : null}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDeactivate ? 1 : 0)}
                  className="p-6 text-center"
                  style={{ color: 'var(--muted)', fontFamily: 'var(--font-serif)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayRows.map((row) => (
                <tr key={rowKey(row)} style={{ borderBottom: '1px solid var(--rule)' }}>
                  {columns.map((col) => (
                    <td key={col.id} className={`p-3 ${col.cellClassName ?? ''}`}>
                      {col.cell(row)}
                    </td>
                  ))}
                  {onEdit || onDeactivate ? (
                    <td className="p-3 text-right">
                      {onEdit ? (
                        <button
                          type="button"
                          className="mr-2 min-h-10 rounded border px-3 text-xs"
                          style={{
                            borderColor: 'var(--rule)',
                            fontFamily: 'var(--font-serif)',
                            color: 'var(--ink)',
                          }}
                          onClick={() => onEdit(row)}
                        >
                          Edit
                        </button>
                      ) : null}
                      {onDeactivate ? (
                        <button
                          type="button"
                          className="min-h-10 rounded border px-3 text-xs"
                          style={{
                            borderColor: 'var(--red-mid)',
                            fontFamily: 'var(--font-serif)',
                            color: 'var(--red)',
                          }}
                          disabled={deactivateDisabled?.(row)}
                          onClick={() => onDeactivate(row)}
                        >
                          {deactivateLabel}
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
