import { vi } from 'vitest';
import type { AuthenticatedSocket } from '@/ws/server';
import type { WebSocket } from 'ws';

export function createMockSocket(overrides: Partial<{
  userId: string;
  rooms: Set<string>;
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  user: { id: string };
}> = {}): AuthenticatedSocket {
  const mockSend = vi.fn();
  const mockPing = vi.fn();
  const mockTerminate = vi.fn();
  const mockOn = vi.fn();

  return {
    userId: overrides.userId ?? 'user-1',
    rooms: overrides.rooms ?? new Set<string>(),
    readyState: overrides.readyState ?? 1, // WebSocket.OPEN
    send: overrides.send ?? mockSend,
    ping: overrides.ping ?? mockPing,
    terminate: overrides.terminate ?? mockTerminate,
    on: overrides.on ?? mockOn,
    user: overrides.user ?? { id: overrides.userId ?? 'user-1' },
  } as AuthenticatedSocket;
}

export const mockRedis = {
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
  zAdd: vi.fn().mockResolvedValue(1),
};

export const mockBroadcastToRoom = vi.fn().mockResolvedValue(undefined);
export const mockAddSocketToRoom = vi.fn();
export const mockRemoveSocketFromRoom = vi.fn();
export const mockGetLocalRoomSockets = vi.fn().mockReturnValue(new Set<WebSocket>());

export function resetWsmocks() {
  vi.clearAllMocks();
  mockRedis.incr.mockResolvedValue(1);
  mockRedis.decr.mockResolvedValue(0);
  mockRedis.zAdd.mockResolvedValue(1);
  mockRedis.zRem.mockResolvedValue(1);
  mockRedis.zRangeByScore.mockResolvedValue([]);
  mockRedis.getDel.mockResolvedValue(null);
  mockRedis.publish.mockResolvedValue(1);
  mockRedis.pSubscribe.mockResolvedValue(undefined);
  mockRedis.quit.mockResolvedValue('OK');
  mockRedis.del.mockResolvedValue(1);
  mockRedis.duplicate.mockReturnThis();
  mockRedis.connect.mockResolvedValue(undefined);
  mockRedis.on.mockReturnThis();
  mockBroadcastToRoom.mockResolvedValue(undefined);
  mockAddSocketToRoom.mockClear();
  mockRemoveSocketFromRoom.mockClear();
  mockGetLocalRoomSockets.mockReturnValue(new Set<WebSocket>());
}