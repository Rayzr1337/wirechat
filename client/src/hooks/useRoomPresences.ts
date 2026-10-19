import { useQuery } from '@tanstack/react-query';
import { getRoomPresences, type RoomPresence } from '../api/rooms';

export function useRoomPresences(roomId: string | null) {
  return useQuery<RoomPresence[]>({
    queryKey: ['rooms', roomId, 'presences'],
    queryFn: async () => {
      if (!roomId) return [];
      return getRoomPresences(roomId);
    },
    enabled: !!roomId,
  });
}
