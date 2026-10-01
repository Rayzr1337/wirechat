import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as messagesService from '@/services/messages.service';
import { messageRepository } from '@/repositories/message.repository';
import { roomRepository } from '@/repositories/room.repository';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { createTestUser, createTestRoom, createTestMessage, clearTestCounters } from '@/../tests/utils/factories';
import { AppError } from '@/middleware/error.middleware';

vi.mock('@/repositories/message.repository');
vi.mock('@/repositories/room.repository');
vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

describe('messages.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const message = createTestMessage({ id: 'msg-1', roomId: 'room-1', senderId: 'user-1', content: 'Hello' });

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(true);
      vi.mocked(messageRepository.createMessage).mockResolvedValue(message);

      const result = await messagesService.sendMessage('user-1', 'room-1', 'Hello');

      expect(result).toEqual(message);
      expect(roomRepository.getRoomById).toHaveBeenCalledWith('room-1');
      expect(roomRepository.isMemberOfRoom).toHaveBeenCalledWith('room-1', 'user-1');
      expect(messageRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          room: { connect: { id: 'room-1' } },
          sender: { connect: { id: 'user-1' } },
          content: 'Hello',
        })
      );
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(messagesService.sendMessage('user-1', 'room-999', 'Hello'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });

    it('throws NOT_IN_ROOM if user not a member', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(false);

      await expect(messagesService.sendMessage('user-1', 'room-1', 'Hello'))
        .rejects.toMatchObject({ code: 'NOT_IN_ROOM', statusCode: 403 });
    });
  });

  describe('editMessage', () => {
    it('edits message successfully', async () => {
      const message = createTestMessage({ id: 'msg-1', senderId: 'user-1', content: 'Old content' });
      const updatedMessage = { ...message, content: 'New content', editedAt: new Date() };

      vi.mocked(messageRepository.getMessageById).mockResolvedValue(message);
      vi.mocked(messageRepository.updateMessage).mockResolvedValue(updatedMessage);

      const result = await messagesService.editMessage('msg-1', 'user-1', 'New content');

      expect(result).toEqual(updatedMessage);
      expect(messageRepository.getMessageById).toHaveBeenCalledWith('msg-1');
      expect(messageRepository.updateMessage).toHaveBeenCalledWith('msg-1', {
        content: 'New content',
        editedAt: expect.any(Date),
      });
    });

    it('throws MESSAGE_NOT_FOUND for non-existent message', async () => {
      vi.mocked(messageRepository.getMessageById).mockResolvedValue(null);

      await expect(messagesService.editMessage('msg-999', 'user-1', 'New content'))
        .rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND', statusCode: 404 });
    });

    it('throws UNAUTHORIZED if user not the sender', async () => {
      const message = createTestMessage({ id: 'msg-1', senderId: 'user-2', content: 'Hello' });

      vi.mocked(messageRepository.getMessageById).mockResolvedValue(message);

      await expect(messagesService.editMessage('msg-1', 'user-1', 'New content'))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 403 });
    });
  });

  describe('deleteMessage', () => {
    it('deletes message successfully', async () => {
      const message = createTestMessage({ id: 'msg-1', senderId: 'user-1', content: 'Hello' });

      vi.mocked(messageRepository.getMessageById).mockResolvedValue(message);
      vi.mocked(messageRepository.deleteMessage).mockResolvedValue(message);

      const result = await messagesService.deleteMessage('msg-1', 'user-1');

      expect(result).toEqual(message);
      expect(messageRepository.getMessageById).toHaveBeenCalledWith('msg-1');
      expect(messageRepository.deleteMessage).toHaveBeenCalledWith('msg-1');
    });

    it('throws MESSAGE_NOT_FOUND for non-existent message', async () => {
      vi.mocked(messageRepository.getMessageById).mockResolvedValue(null);

      await expect(messagesService.deleteMessage('msg-999', 'user-1'))
        .rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND', statusCode: 404 });
    });

    it('throws UNAUTHORIZED if user not the sender', async () => {
      const message = createTestMessage({ id: 'msg-1', senderId: 'user-2', content: 'Hello' });

      vi.mocked(messageRepository.getMessageById).mockResolvedValue(message);

      await expect(messagesService.deleteMessage('msg-1', 'user-1'))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 403 });
    });
  });

  describe('getMessageById', () => {
    it('returns message by id', async () => {
      const message = createTestMessage({ id: 'msg-1', content: 'Hello' });

      vi.mocked(messageRepository.getMessageById).mockResolvedValue(message);

      const result = await messagesService.getMessageById('msg-1');

      expect(result).toEqual(message);
      expect(messageRepository.getMessageById).toHaveBeenCalledWith('msg-1');
    });

    it('throws MESSAGE_NOT_FOUND for non-existent message', async () => {
      vi.mocked(messageRepository.getMessageById).mockResolvedValue(null);

      await expect(messagesService.getMessageById('msg-999'))
        .rejects.toMatchObject({ code: 'MESSAGE_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('getMessages', () => {
    it('returns messages for room', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const messages = [
        createTestMessage({ id: 'msg-1', roomId: 'room-1', content: 'Message 1' }),
        createTestMessage({ id: 'msg-2', roomId: 'room-1', content: 'Message 2' }),
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(messageRepository.getMessagesByRoomId).mockResolvedValue(messages);

      const result = await messagesService.getMessages('room-1', { limit: 50 });

      expect(result).toEqual(messages);
      expect(roomRepository.getRoomById).toHaveBeenCalledWith('room-1');
      expect(messageRepository.getMessagesByRoomId).toHaveBeenCalledWith('room-1', { limit: 50 });
    });

    it('returns messages with cursor', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const messages = [
        createTestMessage({ id: 'msg-1', roomId: 'room-1', content: 'Message 1' }),
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(messageRepository.getMessagesByRoomId).mockResolvedValue(messages);

      const result = await messagesService.getMessages('room-1', { limit: 10, cursor: 'msg-2' });

      expect(result).toEqual(messages);
      expect(messageRepository.getMessagesByRoomId).toHaveBeenCalledWith('room-1', { limit: 10, cursor: 'msg-2' });
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(messagesService.getMessages('room-999'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });
  });
});