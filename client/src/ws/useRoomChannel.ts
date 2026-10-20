import { useEffect, useCallback, useRef } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useUiStore } from '../stores/uiStore';
import { useUnreadStore } from '../stores/unreadStore';
import { useRoom } from '../hooks/useRoom';
import { useMe } from '../hooks/useMe';

export function useRoomChannel(roomId: string | null) {
  const { send, addJoinedRoom, removeJoinedRoom } = useSocketStore();
  const { setActiveRoomId } = useUiStore();
  const { clearUnread, setLastSeenVersion } = useUnreadStore();

  const { data: room } = useRoom(roomId);
  const { data: me } = useMe();

  const sendRef = useRef(send);
  const roomIdRef = useRef(roomId);
  sendRef.current = send;
  roomIdRef.current = roomId;

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId || !me) return;

    send('JOIN_ROOM', { roomId });
    addJoinedRoom(roomId);
    setActiveRoomId(roomId);
    clearUnread(roomId);

    if (room) {
      setLastSeenVersion(roomId, room.version);
    }

    return () => {
      setActiveRoomId(null);
    };
  }, [roomId, me, send, addJoinedRoom, setActiveRoomId, clearUnread, room, setLastSeenVersion]);

  useEffect(() => {
    if (!roomId || !room) return;
    setLastSeenVersion(roomId, room.version);
  }, [roomId, room, setLastSeenVersion]);

  const sendMessage = useCallback((content: string) => {
    send('MESSAGE', { roomId, content });
  }, [send, roomId]);

  const editMessage = useCallback((messageId: string, content: string) => {
    send('EDIT_MESSAGE', { messageId, content });
  }, [send, roomId]);

  const deleteMessage = useCallback((messageId: string) => {
    send('DELETE_MESSAGE', { messageId });
  }, [send, roomId]);

  const sendTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      sendRef.current('TYPING', { roomId: roomIdRef.current });
      typingTimerRef.current = null;
    }, 300);
  }, []);

  const leaveRoom = useCallback(() => {
    send('LEAVE_ROOM', { roomId });
    removeJoinedRoom(roomId!);
    const { activeRoomId } = useUiStore.getState();
    if (activeRoomId === roomId) {
      setActiveRoomId(null);
    }
  }, [send, roomId, removeJoinedRoom, setActiveRoomId]);

  return { sendMessage, editMessage, deleteMessage, sendTyping, leaveRoom };
}
