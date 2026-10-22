import { useQuery } from '@tanstack/react-query';
import { searchUsers, type SearchedUser } from '../api/users';

export function useSearchUsers(query: string) {
  return useQuery<SearchedUser[]>({
    queryKey: ['users', 'search', query],
    queryFn: () => searchUsers(query),
    enabled: query.trim().length > 0,
  });
}
