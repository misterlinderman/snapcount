export interface DiffRow {
  path: string;
  before: string;
  after: string;
}

function stringifyJson(v: unknown): string {
  if (v === undefined) return 'undefined';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/** Shallow-to-deep walk: leaf changes and added/removed keys at each object level. */
export function flattenJsonDiff(before: unknown, after: unknown): DiffRow[] {
  const rows: DiffRow[] = [];

  const walk = (a: unknown, b: unknown, path: string): void => {
    if (a === b) return;
    if (
      a !== null &&
      b !== null &&
      typeof a === 'object' &&
      typeof b === 'object' &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      const ao = a as Record<string, unknown>;
      const bo = b as Record<string, unknown>;
      const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
      for (const k of keys) {
        const p = path ? `${path}.${k}` : k;
        const av = ao[k];
        const bv = bo[k];
        if (av === undefined && bv !== undefined) {
          rows.push({ path: p, before: '(missing)', after: stringifyJson(bv) });
        } else if (av !== undefined && bv === undefined) {
          rows.push({ path: p, before: stringifyJson(av), after: '(removed)' });
        } else {
          walk(av, bv, p);
        }
      }
      return;
    }
    rows.push({
      path: path || '(root)',
      before: stringifyJson(a),
      after: stringifyJson(b),
    });
  };

  walk(before, after, '');
  return rows;
}
