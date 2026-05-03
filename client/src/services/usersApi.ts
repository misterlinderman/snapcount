import api from './api';

export interface CurrentUser {
  _id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  defaultDeck?: string;
}

export async function getMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/users/me');
  return data;
}

export const usersApi = {
  getMe,
};
