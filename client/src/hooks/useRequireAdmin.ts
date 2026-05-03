import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/services/usersApi';

export function useRequireAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: usersApi.getMe,
    retry: false,
  });

  return {
    isAdmin: data?.role === 'admin',
    isLoading,
  };
}
