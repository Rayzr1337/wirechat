import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/redis', () => {
  const mockRedis = {
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
  };
  return { redisClient: mockRedis };
});

vi.mock('@/ws/roomRegistry', () => ({
  getLocalRoomSockets: vi.fn().mockReturnValue(new Set()),
}));

import { broadcastToRoom } from '@/ws/broadcast';
import { redisClient } from '@/libs/redis';

describe('broadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisClient.incr.mockResolvedValue(1);
    redisClient.decr.mockResolvedValue(0);
    redisClient.zAdd.mockResolvedValue(1);
    redisClient.zRem.mockResolvedValue(1);
    redisClient.zRangeByScore.mockResolvedValue([]);
    redisClient.getDel.mockResolvedValue(null);
    redisClient.publish.mockResolvedValue(1);
    redisClient.pSubscribe.mockResolvedValue(undefined);
    redisClient.quit.mockResolvedValue('OK');
    redisClient.del.mockResolvedValue(1);
    redisClient.duplicate.mockReturnThis();
    redisClient.connect.mockResolvedValue(undefined);
    redisClient.on.mockReturnThis();
  });

  describe('broadcastToRoom', () => {
    it('publishes message to redis channel', async () => {
      const message = {
        type: 'MESSAGE',
        payload: { id: 'msg-1', roomId: 'room-1', content: 'test' },
      };
      await broadcastToRoom('room-1', message);

      expect(redisClient.publish).toHaveBeenCalledWith(
        'room:room-1',
        JSON.stringify({ message, excludeUserId: undefined })
      );
    });

    it('includes excludeUserId when provided', async () => {
      const message = {
        type: 'TYPING',
        payload: { roomId: 'room-1', userId: 'user-1' },
      };
      await broadcastToRoom('room-1', message, 'user-1');

      expect(redisClient.publish).toHaveBeenCalledWith(
        'room:room-1',
        JSON.stringify({ message, excludeUserId: 'user-1' })
      );
    });
  });
});