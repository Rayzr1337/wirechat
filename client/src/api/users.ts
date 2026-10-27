import { request } from './client';

export interface SearchedUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export function searchUsers(query: string) {
  const params = new URLSearchParams();
  params.set('q', query);
  return request<SearchedUser[]>(`/api/users/search?${params.toString()}`);
}
