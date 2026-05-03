import api from './api';
import type { Card, GameContent, MatchupMatrix, Playmaker, Upgrade } from '@/game/types';

export interface MatchupsApiPayload {
  matrix: MatchupMatrix['matrix'];
  labels: Record<string, string>;
  version?: number;
}

export async function fetchGameContentBundle(): Promise<GameContent> {
  const [cards, playmakers, upgrades, matchups] = await Promise.all([
    api.get<Card[]>('/content/cards').then((r) => r.data),
    api.get<Playmaker[]>('/content/playmakers').then((r) => r.data),
    api.get<Upgrade[]>('/content/upgrades').then((r) => r.data),
    api.get<MatchupsApiPayload>('/content/matchups').then((r) => r.data),
  ]);

  return {
    cards: new Map(cards.map((c) => [c._id, c])),
    playmakers: new Map(playmakers.map((p) => [p._id, p])),
    upgrades: new Map(upgrades.map((u) => [u._id, u])),
    matchups: {
      matrix: matchups.matrix as MatchupMatrix['matrix'],
      labels: matchups.labels,
    },
    matchupVersion: matchups.version,
  };
}
