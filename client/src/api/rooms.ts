import { request } from './client';

export interface Room {
  id: string;
  type: 'GROUP' | 'DIRECT';
  name: string | null;
  version: number;
  myRole?: string;
  unreadCount?: number;
  members?: { userId: string; username: string; avatarUrl: string | null }[];
}

export interface RoomMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface RoomPresence {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  isOnline: boolean;
  lastSeen: string | null;
}

export function getRooms() {
  return request<Room[]>('/api/rooms/me');
}

export function createRoom(roomName: string) {
  return request<{ message: string; room: Room }>('/api/rooms', { method: 'POST', body: { roomName } })
    .then((data) => data.room);
}

export function createDirectRoom(targetUserId: string) {
  return request<{ message: string; room: Room }>('/api/rooms/direct', { method: 'POST', body: { targetUserId } })
    .then((data) => data.room);
}

export function joinRoom(roomId: string) {
  return request<{ message: string }>(`/api/rooms/${roomId}/join`, { method: 'POST' });
}

export function leaveRoom(roomId: string) {
  return request<{ message: string }>(`/api/rooms/${roomId}/leave`, { method: 'POST' });
}

export function getRoomMembers(roomId: string) {
  return request<RoomMember[]>(`/api/rooms/${roomId}/members`);
}

export function getRoomPresences(roomId: string) {
  return request<RoomPresence[]>(`/api/rooms/${roomId}/presences`);
}

export function getRoomById(roomId: string) {
  return request<Room>(`/api/rooms/${roomId}`);
}

export function deleteRoom(roomId: string) {
  return request<{ message: string }>(`/api/rooms/${roomId}`, { method: 'DELETE' });
}

export function transferOwnership(roomId: string, newOwnerId: string) {
  return request<{ message: string }>(`/api/rooms/${roomId}/transfer-ownership`, {
    method: 'POST',
    body: { newOwnerId },
  });
}

export function promoteMember(roomId: string, memberId: string) {
  return request<{ message: string }>(`/api/rooms/${roomId}/promote`, {
    method: 'POST',
    body: { memberId },
  });
}

export function demoteMember(roomId: string, adminId: string) {
  return request<{ message: string }>(`/api/rooms/${roomId}/demote`, {
    method: 'POST',
    body: { adminId },
  });
}

export function kickMember(roomId: string, memberId: string) {
  return request<{ message: string }>(`/api/rooms/${roomId}/kick`, {
    method: 'POST',
    body: { memberId },
  });
}
