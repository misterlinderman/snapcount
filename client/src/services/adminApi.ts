import type { CardType, CardRarity, PlaymakerRarity } from '@/game/types';
import api from './api';

export type AdminMatchupMatrix = Record<CardType, Record<CardType, number>>;

export interface AdminMatchupResponse {
  version: number;
  matrix: AdminMatchupMatrix;
  labels: Record<string, string>;
  updatedAt: string;
  updatedBy?: string;
}

export interface MatchupYardStat {
  avgYards: number;
  count: number;
}

export interface CardWinRateRow {
  cardId: string;
  winRate: number;
  playCount: number;
}

export interface MatchupYardRow {
  off: string;
  def: string;
  avgYards: number;
  count: number;
}

export interface AdminDashboardStats {
  asOf: string;
  users: {
    total: number;
    activeLast7d: number;
    activeLast24h: number;
    sparkline7d: number[];
  };
  sessions: {
    active: number;
    completedLast7d: number;
    byNode: Record<string, number>;
  };
  balance: {
    cardWinRates: CardWinRateRow[];
    matchupYardAvg: MatchupYardRow[];
  };
  recentAudit: unknown[];
}

export interface AdminUserListItem {
  _id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  defaultDeck?: string;
  stats: {
    seasonsStarted: number;
    seasonsWon: number;
    gamesWon: number;
    gamesPlayed: number;
    touchdowns: number;
    interceptionsThrown: number;
    interceptionsCaught: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetailResponse {
  user: AdminUserListItem;
  decks: Array<{
    _id: string;
    name: string;
    dp: number;
    updatedAt: string;
  }>;
  recentSessions: Array<{
    _id: string;
    status: string;
    result?: string;
    phase?: unknown;
    season?: unknown;
    updatedAt: string;
    game?: { scoreRed?: number; scoreBlue?: number };
  }>;
}

export interface AdminSessionListRow {
  _id: string;
  user: string;
  status: string;
  result?: string;
  updatedAt: string;
  game?: { scoreRed?: number; scoreBlue?: number };
}

export interface AdminAuditEntry {
  _id: string;
  actor: string;
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  timestamp: string;
}

export interface AdminPaginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface AdminCardRow {
  _id: string;
  side: 'offense' | 'defense';
  type: CardType;
  name: string;
  basePower: number;
  notes?: string;
  rarity: CardRarity;
  draftCost?: number;
  isActive: boolean;
}

export interface AdminPlaymakerRow {
  _id: string;
  side: 'offense' | 'defense';
  position: string;
  name: string;
  baseBoost: number;
  affinityTypes: CardType[];
  rarity: PlaymakerRarity;
  recruitCost?: number;
  specialEffect?: string;
  isActive: boolean;
}

export interface AdminUpgradeRow {
  _id: string;
  baseCardId: string;
  name: string;
  effect: {
    powerOverride?: number;
    bonusVs?: { type: CardType; bonus: number };
    sideEffect?: string;
  };
  dpCost: number;
  isActive: boolean;
}

export interface AdminAuditLatest {
  actor: string;
  timestamp: string;
  action: string;
  target: string;
}

export const adminApi = {
  cards: {
    list: async (
      params?: { side?: string; type?: string; q?: string; includeInactive?: boolean }
    ): Promise<AdminCardRow[]> => {
      const { data } = await api.get<AdminCardRow[]>('/admin/cards', {
        params: { includeInactive: true, ...params },
      });
      return data;
    },
    create: async (body: Partial<AdminCardRow> & { _id: string }): Promise<AdminCardRow> => {
      const { data } = await api.post<AdminCardRow>('/admin/cards', body);
      return data;
    },
    update: async (id: string, body: Partial<AdminCardRow>): Promise<AdminCardRow> => {
      const { data } = await api.put<AdminCardRow>(`/admin/cards/${encodeURIComponent(id)}`, body);
      return data;
    },
    deactivate: async (id: string): Promise<AdminCardRow> => {
      const { data } = await api.delete<AdminCardRow>(`/admin/cards/${encodeURIComponent(id)}`);
      return data;
    },
  },
  playmakers: {
    list: async (
      params?: { side?: string; type?: string; q?: string; includeInactive?: boolean }
    ): Promise<AdminPlaymakerRow[]> => {
      const { data } = await api.get<AdminPlaymakerRow[]>('/admin/playmakers', {
        params: { includeInactive: true, ...params },
      });
      return data;
    },
    create: async (body: Partial<AdminPlaymakerRow> & { _id: string }): Promise<AdminPlaymakerRow> => {
      const { data } = await api.post<AdminPlaymakerRow>('/admin/playmakers', body);
      return data;
    },
    update: async (id: string, body: Partial<AdminPlaymakerRow>): Promise<AdminPlaymakerRow> => {
      const { data } = await api.put<AdminPlaymakerRow>(`/admin/playmakers/${encodeURIComponent(id)}`, body);
      return data;
    },
    deactivate: async (id: string): Promise<AdminPlaymakerRow> => {
      const { data } = await api.delete<AdminPlaymakerRow>(`/admin/playmakers/${encodeURIComponent(id)}`);
      return data;
    },
  },
  upgrades: {
    list: async (params?: { includeInactive?: boolean }): Promise<AdminUpgradeRow[]> => {
      const { data } = await api.get<AdminUpgradeRow[]>('/admin/upgrades', {
        params: { includeInactive: true, ...params },
      });
      return data;
    },
    create: async (body: Partial<AdminUpgradeRow> & { _id: string; baseCardId: string; name: string; dpCost: number }): Promise<AdminUpgradeRow> => {
      const { data } = await api.post<AdminUpgradeRow>('/admin/upgrades', body);
      return data;
    },
    update: async (id: string, body: Partial<AdminUpgradeRow>): Promise<AdminUpgradeRow> => {
      const { data } = await api.put<AdminUpgradeRow>(`/admin/upgrades/${encodeURIComponent(id)}`, body);
      return data;
    },
    deactivate: async (id: string): Promise<AdminUpgradeRow> => {
      const { data } = await api.delete<AdminUpgradeRow>(`/admin/upgrades/${encodeURIComponent(id)}`);
      return data;
    },
  },
  audit: {
    latest: async (scope: 'cards' | 'playmakers' | 'upgrades'): Promise<AdminAuditLatest | null> => {
      const { data } = await api.get<AdminAuditLatest | null>('/admin/audit/latest', { params: { scope } });
      return data;
    },
    list: async (params?: {
      q?: string;
      actor?: string;
      target?: string;
      action?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }): Promise<AdminPaginated<AdminAuditEntry>> => {
      const { data } = await api.get<AdminPaginated<AdminAuditEntry>>('/admin/audit', { params });
      return data;
    },
  },
  matchups: {
    get: async (): Promise<AdminMatchupResponse> => {
      const { data } = await api.get<AdminMatchupResponse>('/admin/matchups');
      return data;
    },
    put: async (body: { matrix: AdminMatchupMatrix; labels: Record<string, string> }): Promise<AdminMatchupResponse> => {
      const { data } = await api.put<AdminMatchupResponse>('/admin/matchups', body);
      return data;
    },
  },
  stats: {
    get: async (): Promise<AdminDashboardStats> => {
      const { data } = await api.get<AdminDashboardStats>('/admin/stats');
      return data;
    },
    recompute: async (): Promise<AdminDashboardStats> => {
      const { data } = await api.post<AdminDashboardStats>('/admin/stats/recompute');
      return data;
    },
  },
  users: {
    list: async (params?: { q?: string; page?: number; limit?: number }): Promise<AdminPaginated<AdminUserListItem>> => {
      const { data } = await api.get<AdminPaginated<AdminUserListItem>>('/admin/users', { params });
      return data;
    },
    get: async (id: string): Promise<AdminUserDetailResponse> => {
      const { data } = await api.get<AdminUserDetailResponse>(`/admin/users/${encodeURIComponent(id)}`);
      return data;
    },
    updateRole: async (id: string, role: 'user' | 'admin'): Promise<AdminUserListItem> => {
      const { data } = await api.put<AdminUserListItem>(`/admin/users/${encodeURIComponent(id)}/role`, { role });
      return data;
    },
    grantDp: async (id: string, body: { amount: number; reason: string }): Promise<{ deck: unknown }> => {
      const { data } = await api.post<{ deck: unknown }>(`/admin/users/${encodeURIComponent(id)}/grant-dp`, body);
      return data;
    },
    endSession: async (id: string, body: { sessionId: string; reason: string }): Promise<unknown> => {
      const { data } = await api.post(`/admin/users/${encodeURIComponent(id)}/end-session`, body);
      return data;
    },
  },
  sessions: {
    list: async (params?: {
      status?: 'active' | 'completed' | 'abandoned';
      user?: string;
      page?: number;
      limit?: number;
    }): Promise<AdminPaginated<AdminSessionListRow>> => {
      const { data } = await api.get<AdminPaginated<AdminSessionListRow>>('/admin/sessions', { params });
      return data;
    },
    get: async (id: string): Promise<Record<string, unknown>> => {
      const { data } = await api.get<Record<string, unknown>>(`/admin/sessions/${encodeURIComponent(id)}`);
      return data;
    },
  },
};
