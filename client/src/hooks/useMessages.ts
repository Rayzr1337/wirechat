import { useQuery } from '@tanstack/react-query';
import { getMessages, type Message } from '../api/messages';

export function useMessages(roomId: string | null, options: { limit?: number; cursor?: string } = {}) {
  return useQuery<Message[]>({
    queryKey: ['messages', roomId, options.cursor],
    queryFn: async () => {
      if (!roomId) return [];
      return getMessages(roomId, options);
    },
    enabled: !!roomId,
  });
}
