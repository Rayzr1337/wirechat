import { useQuery } from '@tanstack/react-query';
import { getRoomById, type Room } from '../api/rooms';

export function useRoom(roomId: string | null) {
  return useQuery<Room | null>({
    queryKey: ['rooms', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      return getRoomById(roomId);
    },
    enabled: !!roomId,
  });
}
