import type { Side } from '@/game/types';

export type SilhouettePosition = 'QB' | 'WR' | 'RB' | 'LB' | 'CB' | 'S';

export function normalizeSilhouettePosition(raw: string, side: Side): SilhouettePosition {
  const u = raw.trim().toUpperCase();
  if (u === 'QB' || u === 'Q') return 'QB';
  if (u === 'WR' || u === 'TE') return 'WR';
  if (u === 'RB' || u === 'FB' || u === 'HB') return 'RB';
  if (u === 'LB' || u === 'DE' || u === 'DT' || u === 'OL' || u === 'DL' || u === 'NT') return 'LB';
  if (u === 'CB') return 'CB';
  if (u === 'S' || u === 'SS' || u === 'FS') return 'S';
  return side === 'offense' ? 'QB' : 'LB';
}
