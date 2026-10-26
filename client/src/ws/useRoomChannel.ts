import { useEffect, useCallback, useRef } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useUiStore } from '../stores/uiStore';
import { useUnreadStore } from '../stores/unreadStore';
import { useRoom } from '../hooks/useRoom';
import { useMe } from '../hooks/useMe';
import { queryClient } from '../lib/queryClient';

export function useRoomChannel(roomId: string | null) {
  const { send, addJoinedRoom, removeJoinedRoom, connected } = useSocketStore();
  const { setActiveRoomId } = useUiStore();
  const { setLastSeenVersion, lastSeenVersion } = useUnreadStore();

  const { data: room } = useRoom(roomId);
  const { data: me } = useMe();

  const sendRef = useRef(send);
  const roomIdRef = useRef(roomId);
  const wasConnectedRef = useRef(connected);
  sendRef.current = send;
  roomIdRef.current = roomId;

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roomId || !me) return;

    send('JOIN_ROOM', { roomId });
    addJoinedRoom(roomId);
    setActiveRoomId(roomId);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });

    if (room) {
      const lastSeen = lastSeenVersion[roomId];
      if (lastSeen !== undefined && room.version !== lastSeen) {
        queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
      }
      setLastSeenVersion(roomId, room.version);
    }

    return () => {
      setActiveRoomId(null);
    };
  }, [roomId, me, send, addJoinedRoom, setActiveRoomId, room, setLastSeenVersion]);

  useEffect(() => {
    if (!roomId) return;

    const wasConnected = wasConnectedRef.current;
    wasConnectedRef.current = connected;

    if (!wasConnected && connected) {
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
    }
  }, [roomId, connected]);

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
    if (!roomId) return;
    send('LEAVE_ROOM', { roomId });
    removeJoinedRoom(roomId);
    const { activeRoomId } = useUiStore.getState();
    if (activeRoomId === roomId) {
      setActiveRoomId(null);
    }
  }, [send, roomId, removeJoinedRoom, setActiveRoomId]);

  return { sendMessage, editMessage, deleteMessage, sendTyping, leaveRoom };
}
