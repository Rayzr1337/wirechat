import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messageRepository } from '@/repositories/message.repository';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { clearTestCounters } from '@/../tests/utils/factories';

describe('MessageRepository Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
  });

  describe('createMessage', () => {
    it('creates message with provided data', async () => {
      const message = {
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user-1',
        content: 'Hello world',
        createdAt: new Date(),
        editedAt: null,
      };
      mockPrisma.message.create.mockResolvedValue(message);

      const created = await messageRepository.createMessage({
        room: { connect: { id: 'room-1' } },
        sender: { connect: { id: 'user-1' } },
        content: 'Hello world',
      });

      expect(created.id).toBe('msg-1');
      expect(created.content).toBe('Hello world');
      expect(created.roomId).toBe('room-1');
      expect(created.senderId).toBe('user-1');
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          room: { connect: { id: 'room-1' } },
          sender: { connect: { id: 'user-1' } },
          content: 'Hello world',
        },
      });
    });
  });

  describe('getMessageById', () => {
    it('returns message when found', async () => {
      const message = {
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user-1',
        content: 'Hello world',
        createdAt: new Date(),
        editedAt: null,
      };
      mockPrisma.message.findUnique.mockResolvedValue(message);

      const found = await messageRepository.getMessageById('msg-1');

      expect(found).not.toBeNull();
      expect(found!.id).toBe('msg-1');
      expect(found!.content).toBe('Hello world');
      expect(mockPrisma.message.findUnique).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
    });

    it('returns null when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const found = await messageRepository.getMessageById('msg-999');

      expect(found).toBeNull();
    });
  });

  describe('updateMessage', () => {
    it('updates message content and editedAt', async () => {
      const updated = {
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user-1',
        content: 'Updated content',
        createdAt: new Date(),
        editedAt: new Date(),
      };
      mockPrisma.message.update.mockResolvedValue(updated);

      const result = await messageRepository.updateMessage('msg-1', {
        content: 'Updated content',
        editedAt: new Date(),
      });

      expect(result.content).toBe('Updated content');
      expect(result.editedAt).not.toBeNull();
      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: { content: 'Updated content', editedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMessage', () => {
    it('deletes message by id', async () => {
      const message = {
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user-1',
        content: 'Hello world',
        createdAt: new Date(),
        editedAt: null,
      };
      mockPrisma.message.delete.mockResolvedValue(message);

      const result = await messageRepository.deleteMessage('msg-1');

      expect(result.id).toBe('msg-1');
      expect(mockPrisma.message.delete).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
    });
  });

  describe('getMessagesByRoomId', () => {
    it('returns messages for room with default limit', async () => {
      const messages = [
        {
          id: 'msg-2',
          roomId: 'room-1',
          senderId: 'user-2',
          content: 'Second message',
          createdAt: new Date('2024-01-01T10:05:00Z'),
          editedAt: null,
        },
        {
          id: 'msg-1',
          roomId: 'room-1',
          senderId: 'user-1',
          content: 'First message',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          editedAt: null,
        },
      ];
      mockPrisma.message.findMany.mockResolvedValue(messages);

      const result = await messageRepository.getMessagesByRoomId('room-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('msg-2'); // Descending order
      expect(result[1].id).toBe('msg-1');
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { roomId: 'room-1' },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('respects custom limit', async () => {
      const messages = [
        { id: 'msg-1', roomId: 'room-1', senderId: 'user-1', content: 'First', createdAt: new Date(), editedAt: null },
        { id: 'msg-2', roomId: 'room-1', senderId: 'user-2', content: 'Second', createdAt: new Date(), editedAt: null },
      ];
      mockPrisma.message.findMany.mockResolvedValue(messages);

      const result = await messageRepository.getMessagesByRoomId('room-1', { limit: 10 });

      expect(result).toHaveLength(2);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('uses cursor for pagination', async () => {
      const messages = [
        { id: 'msg-1', roomId: 'room-1', senderId: 'user-1', content: 'First', createdAt: new Date(), editedAt: null },
      ];
      mockPrisma.message.findMany.mockResolvedValue(messages);

      const result = await messageRepository.getMessagesByRoomId('room-1', { 
        limit: 50, 
        cursor: 'msg-2' 
      });

      expect(result).toHaveLength(1);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'msg-2' },
          skip: 1,
        })
      );
    });

    it('returns empty array when room has no messages', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await messageRepository.getMessagesByRoomId('room-999');

      expect(result).toEqual([]);
    });
  });
});