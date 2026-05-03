import api from './api';
import type { DeckDTO } from '@/game/sessionBridge';

export const decksApi = {
  list: (): Promise<DeckDTO[]> => api.get<DeckDTO[]>('/decks').then((r) => r.data),
  getDefault: (): Promise<DeckDTO> => api.get<DeckDTO>('/decks/default').then((r) => r.data),
  getById: (id: string): Promise<DeckDTO> => api.get<DeckDTO>(`/decks/${id}`).then((r) => r.data),
};
