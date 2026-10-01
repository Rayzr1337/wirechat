import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/ws/roomRegistry', () => ({
  addSocketToRoom: vi.fn(),
}));

vi.mock('@/services/rooms.service', () => ({
  joinRoom: vi.fn(),
}));

import { handleJoinRoom } from '@/ws/handlers/join.handler';
import { joinRoom } from '@/services/rooms.service';
import { addSocketToRoom } from '@/ws/roomRegistry';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { AppError } from '@/middleware/error.middleware';
import { clearTestCounters } from '@/../tests/utils/factories';

describe('handleJoinRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  it('joins room and broadcasts USER_JOINED on success', async () => {
    (joinRoom as any).mockResolvedValue(undefined);

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleJoinRoom('user-1', socket, incomingMessage);

    expect(joinRoom).toHaveBeenCalledWith('user-1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(addSocketToRoom).toHaveBeenCalledWith('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', socket);
    expect(socket.rooms?.has('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBe(true);
  });

  it('broadcasts USER_JOINED with correct payload', async () => {
    (joinRoom as any).mockResolvedValue(undefined);

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleJoinRoom('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        type: 'USER_JOINED',
        payload: expect.objectContaining({
          roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          userId: 'user-1',
        }),
      })
    );
  });

  it('throws AppError when joinRoom throws ROOM_NOT_FOUND', async () => {
    (joinRoom as any).mockRejectedValue(new AppError(404, 'ROOM_NOT_FOUND', 'Room not found!'));

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    };

    await expect(handleJoinRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when joinRoom throws CANNOT_JOIN_DIRECT_ROOM', async () => {
    (joinRoom as any).mockRejectedValue(new AppError(400, 'CANNOT_JOIN_DIRECT_ROOM', 'Cannot join direct room'));

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await expect(handleJoinRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when joinRoom throws EMAIL_NOT_VERIFIED', async () => {
    (joinRoom as any).mockRejectedValue(new AppError(403, 'EMAIL_NOT_VERIFIED', 'Email not verified'));

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await expect(handleJoinRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when joinRoom throws ALREADY_MEMBER', async () => {
    (joinRoom as any).mockRejectedValue(new AppError(400, 'ALREADY_MEMBER', 'Already a member'));

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await expect(handleJoinRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when joinRoom throws USER_NOT_FOUND', async () => {
    (joinRoom as any).mockRejectedValue(new AppError(404, 'USER_NOT_FOUND', 'User not found'));

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await expect(handleJoinRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('broadcasts timestamp in ISO format', async () => {
    (joinRoom as any).mockResolvedValue(undefined);

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleJoinRoom('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        payload: expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        }),
      })
    );
  });

  it('adds room to socket.rooms set', async () => {
    (joinRoom as any).mockResolvedValue(undefined);

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
      type: 'JOIN_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleJoinRoom('user-1', socket, incomingMessage);

    expect(socket.rooms).toContain('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });
});