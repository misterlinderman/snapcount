import type { SnapResult } from './types';

/** Dev-only: warn when optimistic `pendingAdvance` differs from server slice after snap. */
export function warnIfSnapMismatch(
  optimistic: SnapResult | null | undefined,
  serverSlicePending: SnapResult | null | undefined
): void {
  if (!import.meta.env.DEV) return;
  if (optimistic === serverSlicePending) return;
  if (optimistic != null && serverSlicePending != null && JSON.stringify(optimistic) === JSON.stringify(serverSlicePending)) {
    return;
  }
  console.warn('[Snapcount] Optimistic snap differs from server response', {
    optimistic,
    server: serverSlicePending,
  });
}
