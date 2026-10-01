import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/ws/roomRegistry', () => ({
  removeSocketFromRoom: vi.fn(),
}));

vi.mock('@/services/rooms.service', () => ({
  leaveRoom: vi.fn(),
}));

import { handleLeaveRoom } from '@/ws/handlers/leave.handler';
import { leaveRoom } from '@/services/rooms.service';
import { removeSocketFromRoom } from '@/ws/roomRegistry';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { AppError } from '@/middleware/error.middleware';
import { clearTestCounters } from '@/../tests/utils/factories';

describe('handleLeaveRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  it('leaves room and broadcasts USER_LEFT on success', async () => {
    (leaveRoom as any).mockResolvedValue({ message: 'Left room successfully' });

    const socket = {
      userId: 'user-1',
      rooms: new Set(['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'LEAVE_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleLeaveRoom('user-1', socket, incomingMessage);

    expect(leaveRoom).toHaveBeenCalledWith('user-1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(removeSocketFromRoom).toHaveBeenCalledWith('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', socket);
    expect(socket.rooms?.has('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBe(false);
  });

  it('broadcasts USER_LEFT with correct payload', async () => {
    (leaveRoom as any).mockResolvedValue({ message: 'Left room successfully' });

    const socket = {
      userId: 'user-1',
      rooms: new Set(['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'LEAVE_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleLeaveRoom('user-1', socket, incomingMessage);

    const { broadcastToRoom } = await import('@/ws/broadcast');
    expect(broadcastToRoom).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      expect.objectContaining({
        type: 'USER_LEFT',
        payload: expect.objectContaining({
          roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          userId: 'user-1',
        }),
      })
    );
  });

  it('throws AppError when leaveRoom throws ROOM_NOT_FOUND', async () => {
    (leaveRoom as any).mockRejectedValue(new AppError(404, 'ROOM_NOT_FOUND', 'Room not found!'));

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
      type: 'LEAVE_ROOM' as const,
      payload: { roomId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' },
    };

    await expect(handleLeaveRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when leaveRoom throws NOT_IN_ROOM', async () => {
    (leaveRoom as any).mockRejectedValue(new AppError(400, 'NOT_IN_ROOM', 'Not in room'));

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
      type: 'LEAVE_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await expect(handleLeaveRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('throws AppError when leaveRoom throws CANNOT_LEAVE_DIRECT_ROOM', async () => {
    (leaveRoom as any).mockRejectedValue(new AppError(400, 'CANNOT_LEAVE_DIRECT_ROOM', 'Cannot leave direct room'));

    const socket = {
      userId: 'user-1',
      rooms: new Set(['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'LEAVE_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await expect(handleLeaveRoom('user-1', socket, incomingMessage))
      .rejects.toThrow(AppError);
  });

  it('removes room from socket.rooms set', async () => {
    (leaveRoom as any).mockResolvedValue({ message: 'Left room successfully' });

    const socket = {
      userId: 'user-1',
      rooms: new Set(['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'LEAVE_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleLeaveRoom('user-1', socket, incomingMessage);

    expect(socket.rooms).not.toContain('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });

  it('broadcasts timestamp in ISO format', async () => {
    (leaveRoom as any).mockResolvedValue({ message: 'Left room successfully' });

    const socket = {
      userId: 'user-1',
      rooms: new Set(['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']),
      readyState: 1,
      send: vi.fn(),
      ping: vi.fn(),
      terminate: vi.fn(),
      on: vi.fn(),
      user: { id: 'user-1' },
    };
    const incomingMessage = {
      type: 'LEAVE_ROOM' as const,
      payload: { roomId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    };

    await handleLeaveRoom('user-1', socket, incomingMessage);

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
});