import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/messages.service', () => ({
  editMessage: vi.fn(),
}));

import { handleEditMessage } from '@/ws/handlers/editMsg.handler';
import { editMessage } from '@/services/messages.service';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { AppError } from '@/middleware/error.middleware';
import { clearTestCounters } from '@/../tests/utils/factories';

describe('handleEditMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  it('edits message and broadcasts MESSAGE_EDITED on success', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      content: 'Updated content',
      editedAt: new Date('2024-01-01T10:05:00Z'),
    };
    (editMessage as any).mockResolvedValue(mockMsg);

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
      type: 'EDIT_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        content: 'Updated content',
      },
    };

    await handleEditMessage('user-1', socket, incomingMessage);

    expect(editMessage).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'user-1',
      'Updated content'
    );
  });

  it('broadcasts MESSAGE_EDITED with correct payload', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      content: 'Updated content',
      editedAt: new Date('2024-06-15T14:30:00.123Z'),
    };
    (editMessage as any).mockResolvedValue(mockMsg);

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
      type: 'EDIT_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        content: 'Updated content',
      },
    };

    await handleEditMessage('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        type: 'MESSAGE_EDITED',
        payload: expect.objectContaining({
          id: mockMsg.id,
          roomId: mockMsg.roomId,
          content: 'Updated content',
        }),
      })
    );
  });

  it('throws AppError when editMessage throws MESSAGE_NOT_FOUND', async () => {
    (editMessage as any).mockRejectedValue(new AppError(404, 'MESSAGE_NOT_FOUND', 'Message not found!'));

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
      type: 'EDIT_MESSAGE' as const,
      payload: {
        messageId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        content: 'Updated',
      },
    };

    await expect(handleEditMessage('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when editMessage throws UNAUTHORIZED', async () => {
    (editMessage as any).mockRejectedValue(new AppError(403, 'UNAUTHORIZED', 'You can only edit your own messages'));

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
      type: 'EDIT_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        content: 'Updated',
      },
    };

    await expect(handleEditMessage('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('broadcasts editedAt in ISO format', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      content: 'Updated content',
      editedAt: new Date('2024-06-15T14:30:00.123Z'),
    };
    (editMessage as any).mockResolvedValue(mockMsg);

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
      type: 'EDIT_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        content: 'Updated content',
      },
    };

    await handleEditMessage('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        payload: expect.objectContaining({
          editedAt: '2024-06-15T14:30:00.123Z',
        }),
      })
    );
  });

  it('falls back to current time if editedAt is null', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      content: 'Updated content',
      editedAt: null,
    };
    (editMessage as any).mockResolvedValue(mockMsg);

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
      type: 'EDIT_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        content: 'Updated content',
      },
    };

    await handleEditMessage('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        payload: expect.objectContaining({
          editedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        }),
      })
    );
  });

  it('uses correct userId from parameter', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      content: 'Updated',
      editedAt: new Date(),
    };
    (editMessage as any).mockResolvedValue(mockMsg);

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
      type: 'EDIT_MESSAGE' as const,
      payload: {
        messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        content: 'Updated',
      },
    };

    await handleEditMessage('user-2', socket, incomingMessage);

    expect(editMessage).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'user-2',
      'Updated'
    );
  });
});