import { useInfiniteQuery } from '@tanstack/react-query';
import { getMessages, type Message } from '../api/messages';

export function useInfiniteMessages(roomId: string | null) {
  return useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!roomId) return [];
      return getMessages(roomId, { cursor: pageParam ?? undefined });
    },
    enabled: !!roomId,
    initialPageParam: undefined,
    getNextPageParam: (lastPage: Message[]) => {
      if (lastPage.length < 50) return undefined; 
      return lastPage[lastPage.length - 1].id;
    },
  });
}
