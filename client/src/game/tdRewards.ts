import type { TdRewardId } from '@/services/sessionsApi';

export const TD_REWARD_POOL: TdRewardId[] = ['hail-mary', 'power-boost', 'star-playmaker', 'draft-point'];

export function pickThreeTdOffers(): TdRewardId[] {
  const a = [...TD_REWARD_POOL];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a.slice(0, 3);
}

export const TD_OFFER_COPY: Record<TdRewardId, { title: string; blurb: string }> = {
  'hail-mary': {
    title: 'Hail Mary card',
    blurb: 'Queue the Hail Mary for your roster.',
  },
  'power-boost': {
    title: 'Power surge',
    blurb: '+2 to your in-game power boost next kickoff.',
  },
  'star-playmaker': {
    title: 'Star playmaker',
    blurb: 'Sharpen mismatch playmaker scaling.',
  },
  'draft-point': {
    title: 'Draft point',
    blurb: '+1 DP credited now.',
  },
};
