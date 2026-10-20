import { queryClient } from '../lib/queryClient';
import { useUnreadStore } from '../stores/unreadStore';
import { usePresenceStore } from '../stores/presenceStore';
import { useTypingStore } from '../stores/typingStore';
import { useUiStore } from '../stores/uiStore';
import type { OutgoingMessage } from '../ws/protocol/schemas';

export function handleInbound(data: OutgoingMessage) {
  const unreadStore = useUnreadStore.getState();
  const presenceStore = usePresenceStore.getState();
  const typingStore = useTypingStore.getState();
  const uiStore = useUiStore.getState();

  switch (data.type) {
    case 'MESSAGE': {
      const { roomId } = data.payload;
      if (uiStore.activeRoomId !== roomId) {
        unreadStore.incrementUnread(roomId);
      } else {
        unreadStore.clearUnread(roomId);
      }
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
      break;
    }

    case 'USER_JOINED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] });
      break;
    }

    case 'USER_LEFT': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'members'] });
      break;
    }

    case 'DIRECT_ROOM_CREATED': {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
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
      break;
    }

    case 'MESSAGE_EDITED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
      break;
    }

    case 'MESSAGE_DELETED': {
      const { roomId } = data.payload;
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
      break;
    }

    case 'ERROR': {
      const { code, message } = data.payload;
      uiStore.addToast(`${code}: ${message}`, 'error');
      break;
    }
  }
}
