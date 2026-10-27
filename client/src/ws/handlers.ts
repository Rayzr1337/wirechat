import { queryClient } from '../lib/queryClient';
import { usePresenceStore } from '../stores/presenceStore';
import { useTypingStore } from '../stores/typingStore';
import { useUiStore } from '../stores/uiStore';
import { useSocketStore } from '../stores/socketStore';
import { useUnreadStore } from '../stores/unreadStore';
import type { Room } from '../api/rooms';
import type { OutgoingMessage } from '../ws/protocol/schemas';

export function handleInbound(data: OutgoingMessage) {
  const presenceStore = usePresenceStore.getState();
  const typingStore = useTypingStore.getState();
  const uiStore = useUiStore.getState();

  switch (data.type) {
    case 'MESSAGE': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      useUnreadStore.getState().setLastSeenVersion(roomId, data.payload.roomVersion);
      break;
    }

    case 'USER_JOINED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] });
      break;
    }

    case 'USER_LEFT': {
      const { roomId, userId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] });
      const me = queryClient.getQueryData<{ id: string }>(['me']);
      if (userId && me && userId === me.id) {
        const room = queryClient.getQueryData<Room>(['rooms', roomId]);
        useSocketStore.getState().removeJoinedRoom(roomId);
        queryClient.removeQueries({ queryKey: ['rooms', roomId] });
        queryClient.removeQueries({ queryKey: ['messages', roomId] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        useUiStore.getState().setForcedExit({ roomId, roomName: room?.name ?? 'the room' });
      }
      break;
    }

    case 'DIRECT_ROOM_CREATED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      useSocketStore.getState().send('JOIN_ROOM', { roomId });
      break;
    }

    case 'TYPING': {
      const { roomId, userId } = data.payload;
      typingStore.setTyping(roomId, userId, true);
      break;
    }

    case 'PRESENCE_UPDATE': {
      const { userId, isOnline } = data.payload;
      presenceStore.setPresence(userId, isOnline);
      break;
    }

    case 'USER_UPDATED': {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      break;
    }

    case 'MESSAGE_EDITED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
      useUnreadStore.getState().setLastSeenVersion(roomId, data.payload.roomVersion);
      break;
    }

    case 'MESSAGE_DELETED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
      useUnreadStore.getState().setLastSeenVersion(roomId, data.payload.roomVersion);
      break;
    }

    case 'ROOM_DELETED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.removeQueries({ queryKey: ['rooms', roomId] });
      queryClient.removeQueries({ queryKey: ['messages', roomId] });
      break;
    }

    case 'ERROR': {
      const { message } = data.payload;
      uiStore.addToast(message, 'error');
      break;
    }
  }
}
