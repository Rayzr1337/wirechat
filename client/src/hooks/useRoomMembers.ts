import { useQuery } from '@tanstack/react-query';
import { getRoomMembers, type RoomMember } from '../api/rooms';

export function useRoomMembers(roomId: string | null) {
  return useQuery<RoomMember[]>({
    queryKey: ['rooms', roomId, 'members'],
    queryFn: async () => {
      if (!roomId) return [];
      return getRoomMembers(roomId);
    },
    enabled: !!roomId,
  });
}
