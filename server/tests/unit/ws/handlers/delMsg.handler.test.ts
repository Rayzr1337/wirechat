import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/messages.service', () => ({
  deleteMessage: vi.fn(),
}));

import { handleDeleteMessage } from '@/ws/handlers/delMsg.handler';
import { deleteMessage } from '@/services/messages.service';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { AppError } from '@/middleware/error.middleware';
import { clearTestCounters } from '@/../tests/utils/factories';

describe('handleDeleteMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  it('deletes message and broadcasts MESSAGE_DELETED on success', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    (deleteMessage as any).mockResolvedValue(mockMsg);

    const socket = {
      userId: 'user-1',
      rooms: new Set<string>(),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'DELETE_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    };

    await handleDeleteMessage('user-1', socket, incomingMessage);

    expect(deleteMessage).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'user-1'
    );
  });

  it('broadcasts MESSAGE_DELETED with correct payload', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    (deleteMessage as any).mockResolvedValue(mockMsg);

    const socket = {
      userId: 'user-1',
      rooms: new Set<string>(),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'DELETE_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    };

    await handleDeleteMessage('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        type: 'MESSAGE_DELETED',
        payload: expect.objectContaining({
          id: mockMsg.id,
          roomId: mockMsg.roomId,
        }),
      })
    );
  });

  it('throws AppError when deleteMessage throws MESSAGE_NOT_FOUND', async () => {
    (deleteMessage as any).mockRejectedValue(new AppError(404, 'MESSAGE_NOT_FOUND', 'Message not found!'));

    const socket = {
      userId: 'user-1',
      rooms: new Set<string>(),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'DELETE_MESSAGE' as const,
      payload: {
        messageId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      },
    };

    await expect(handleDeleteMessage('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when deleteMessage throws UNAUTHORIZED', async () => {
    (deleteMessage as any).mockRejectedValue(new AppError(403, 'UNAUTHORIZED', 'You can only delete your own messages'));

    const socket = {
      userId: 'user-1',
      rooms: new Set<string>(),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'DELETE_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    };

    await expect(handleDeleteMessage('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('uses correct userId from parameter', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    (deleteMessage as any).mockResolvedValue(mockMsg);

    const socket = {
      userId: 'user-2',
      rooms: new Set<string>(),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-2' },
    };
    const incomingMessage = {
      type: 'DELETE_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    };

    await handleDeleteMessage('user-2', socket, incomingMessage);

    expect(deleteMessage).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'user-2'
    );
  });
});