import { request } from './client';

export interface Message {
  id: string;
  roomId: string;
  senderId: string | null;
  content: string;
  createdAt: string;
  editedAt: string | null;
  sender?: { username: string; avatarUrl: string | null } | null;
}

export function getMessages(roomId: string, options: { limit?: number; cursor?: string } = {}) {
  const { limit = 50, cursor } = options;
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) {
    params.set('cursor', cursor);
  }
  return request<Message[]>(`/api/messages/${roomId}?${params.toString()}`);
}

export function getMessageById(messageId: string) {
  return request<Message>(`/api/messages/message/${messageId}`);
}
