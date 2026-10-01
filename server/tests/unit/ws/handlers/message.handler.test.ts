import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/libs/redis', () => ({
  redisClient: {
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    zAdd: vi.fn().mockResolvedValue(1),
    zRem: vi.fn().mockResolvedValue(1),
    zRangeByScore: vi.fn().mockResolvedValue([]),
    getDel: vi.fn().mockResolvedValue(null),
    publish: vi.fn().mockResolvedValue(1),
    pSubscribe: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    duplicate: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  },
}));

vi.mock('@/services/messages.service', () => ({
  sendMessage: vi.fn(),
}));

import { handleMessage } from '@/ws/handlers/message.handler';
import { sendMessage } from '@/services/messages.service';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { AppError } from '@/middleware/error.middleware';
import { clearTestCounters } from '@/../tests/utils/factories';

describe('handleMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  it('sends message and broadcasts to room on success', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      senderId: 'user-1',
      content: 'Hello world',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      editedAt: null,
    };
    (sendMessage as any).mockResolvedValue(mockMsg);

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
      type: 'MESSAGE' as const,
      payload: {
        roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        content: 'Hello world',
      },
    };

    await handleMessage('user-1', socket, incomingMessage);

    expect(sendMessage).toHaveBeenCalledWith(
      'user-1',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Hello world'
    );
  });

  it('broadcasts with correct createdAt format', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      senderId: 'user-1',
      content: 'Test',
      createdAt: new Date('2024-06-15T14:30:00.123Z'),
      editedAt: null,
    };
    (sendMessage as any).mockResolvedValue(mockMsg);

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
      type: 'MESSAGE' as const,
      payload: {
        roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        content: 'Test',
      },
    };

    await handleMessage('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        payload: expect.objectContaining({
          createdAt: '2024-06-15T14:30:00.123Z',
        }),
      })
    );
  });

  it('throws AppError when sendMessage throws ROOM_NOT_FOUND', async () => {
    (sendMessage as any).mockRejectedValue(new AppError(404, 'ROOM_NOT_FOUND', 'Room not found!'));

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
      type: 'MESSAGE' as const,
      payload: {
        roomId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        content: 'Hello',
      },
    };

    await expect(handleMessage('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when sendMessage throws NOT_IN_ROOM', async () => {
    (sendMessage as any).mockRejectedValue(new AppError(403, 'NOT_IN_ROOM', 'You must be a member'));

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
      type: 'MESSAGE' as const,
      payload: {
        roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        content: 'Hello',
      },
    };

    await expect(handleMessage('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when sendMessage throws UNAUTHORIZED', async () => {
    (sendMessage as any).mockRejectedValue(new AppError(401, 'UNAUTHORIZED', 'Invalid credentials'));

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
      type: 'MESSAGE' as const,
      payload: {
        roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        content: 'Hello',
      },
    };

    await expect(handleMessage('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('propagates unknown errors', async () => {
    (sendMessage as any).mockRejectedValue(new Error('Database connection failed'));

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
      type: 'MESSAGE' as const,
      payload: {
        roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        content: 'Hello',
      },
    };

    await expect(handleMessage('user-1', socket, incomingMessage))
      .rejects.toThrow('Database connection failed');
  });

  it('uses correct userId from parameter', async () => {
    const mockMsg = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      senderId: 'user-2',
      content: 'Hello',
      createdAt: new Date(),
      editedAt: null,
    };
    (sendMessage as any).mockResolvedValue(mockMsg);

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
      type: 'MESSAGE' as const,
      payload: {
        roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        content: 'Hello',
      },
    };

    await handleMessage('user-2', socket, incomingMessage);

    expect(sendMessage).toHaveBeenCalledWith('user-2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Hello');
  });
});