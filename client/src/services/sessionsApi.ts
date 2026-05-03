import type { Team } from '@/game/types';
import type { DeckDTO, GameSessionDTO, SnapStateSlice } from '@/game/sessionBridge';
import type { GameEvent } from '@/game/types';
import api from './api';

export interface SnapResponse {
  state: SnapStateSlice;
  events: GameEvent[];
}

/** POST /sessions/:id/td-reward body.rewardId */
export type TdRewardId = 'hail-mary' | 'power-boost' | 'star-playmaker' | 'draft-point';

export interface EndGameResponse {
  winner: Team;
  dpEarned: number;
  totals: {
    scoreRed: number;
    scoreBlue: number;
  };
}

export interface LockerMutationResponse {
  session: GameSessionDTO;
  deck: DeckDTO;
}

export const sessionsApi = {
  getActive: async (): Promise<GameSessionDTO | null> => {
    const r = await api.get<GameSessionDTO>('/sessions/active', {
      validateStatus: (s) => s === 200 || s === 204,
    });
    if (r.status === 204) return null;
    return r.data;
  },

  getById: (id: string): Promise<GameSessionDTO> =>
    api.get<GameSessionDTO>(`/sessions/${id}`).then((res) => res.data),

  create: (deckId: string): Promise<GameSessionDTO> =>
    api.post<GameSessionDTO>('/sessions', { deckId }).then((res) => res.data),

  coinToss: (sessionId: string, body: { side: 'offense' | 'defense' }): Promise<GameSessionDTO> =>
    api.post<GameSessionDTO>(`/sessions/${sessionId}/coin-toss`, body).then((res) => res.data),

  snap: (sessionId: string, body: { playId: string; cardId: string; playmakerId: string }): Promise<SnapResponse> =>
    api.post<SnapResponse>(`/sessions/${sessionId}/snap`, body).then((res) => res.data),

  redraw: (sessionId: string): Promise<GameSessionDTO> =>
    api.post<GameSessionDTO>(`/sessions/${sessionId}/redraw`, {}).then((res) => res.data),

  fieldGoal: (
    sessionId: string,
    body: { playId: string }
  ): Promise<{ state: SnapStateSlice; events: GameEvent[] }> =>
    api
      .post<{ state: SnapStateSlice; events: GameEvent[] }>(`/sessions/${sessionId}/field-goal`, body)
      .then((res) => res.data),

  nextPlay: (sessionId: string): Promise<GameSessionDTO> =>
    api.post<GameSessionDTO>(`/sessions/${sessionId}/next-play`, {}).then((res) => res.data),

  tdReward: (sessionId: string, body: { rewardId: TdRewardId }): Promise<GameSessionDTO> =>
    api.post<GameSessionDTO>(`/sessions/${sessionId}/td-reward`, body).then((res) => res.data),

  endGame: (sessionId: string): Promise<EndGameResponse> =>
    api.post<EndGameResponse>(`/sessions/${sessionId}/end`, {}).then((res) => res.data),

  lockerDraft: (
    sessionId: string,
    body: { cardId: string; cutCardIds?: string[] }
  ): Promise<LockerMutationResponse> =>
    api.post<LockerMutationResponse>(`/sessions/${sessionId}/locker/draft`, body).then((res) => res.data),

  lockerUpgrade: (sessionId: string, body: { cardId: string; upgradeId: string }): Promise<LockerMutationResponse> =>
    api.post<LockerMutationResponse>(`/sessions/${sessionId}/locker/upgrade`, body).then((res) => res.data),

  lockerRecruit: (sessionId: string, body: { playmakerId: string }): Promise<LockerMutationResponse> =>
    api.post<LockerMutationResponse>(`/sessions/${sessionId}/locker/recruit`, body).then((res) => res.data),

  lockerClose: (sessionId: string): Promise<GameSessionDTO> =>
    api.post<GameSessionDTO>(`/sessions/${sessionId}/locker/close`, {}).then((res) => res.data),

  abandon: (sessionId: string): Promise<{ ok: boolean }> =>
    api.post<{ ok: boolean }>(`/sessions/${sessionId}/abandon`, {}).then((res) => res.data),
};
