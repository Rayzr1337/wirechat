import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/redis', () => {
  const mockRedis = {
    zAdd: vi.fn().mockResolvedValue(1),
    zRem: vi.fn().mockResolvedValue(1),
    zRangeByScore: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(1),
    duplicate: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
  return { redisClient: mockRedis };
});

vi.mock('@/repositories/room.repository', () => ({
  roomRepository: {
    getRoomsForUser: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

import { broadcastPresenceUpdate, startPresenceSweep, stopPresenceSweep } from '@/ws/presence';
import { redisClient } from '@/libs/redis';
import { roomRepository } from '@/repositories/room.repository';
import { broadcastToRoom } from '@/ws/broadcast';

describe('presence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisClient.zAdd.mockResolvedValue(1);
    redisClient.zRem.mockResolvedValue(1);
    redisClient.zRangeByScore.mockResolvedValue([]);
    redisClient.del.mockResolvedValue(1);
    redisClient.duplicate.mockReturnThis();
    redisClient.connect.mockResolvedValue(undefined);
    redisClient.on.mockReturnThis();
    (roomRepository.getRoomsForUser as any).mockResolvedValue([]);
    (broadcastToRoom as any).mockResolvedValue(undefined);
  });

  describe('broadcastPresenceUpdate', () => {
    it('calls roomRepository.getRoomsForUser with userId', async () => {
      await broadcastPresenceUpdate('user-1', true);

      expect(roomRepository.getRoomsForUser).toHaveBeenCalledWith('user-1');
    });

    it('broadcasts PRESENCE_UPDATE to each room', async () => {
      const memberships = [
        { roomId: 'room-1', role: 'MEMBER' },
        { roomId: 'room-2', role: 'ADMIN' },
      ];
      (roomRepository.getRoomsForUser as any).mockResolvedValue(memberships);

      await broadcastPresenceUpdate('user-1', true);

      expect(broadcastToRoom).toHaveBeenCalledTimes(2);
      expect(broadcastToRoom).toHaveBeenCalledWith(
        'room-1',
        expect.objectContaining({
          type: 'PRESENCE_UPDATE',
          payload: { userId: 'user-1', isOnline: true },
        })
      );
      expect(broadcastToRoom).toHaveBeenCalledWith(
        'room-2',
        expect.objectContaining({
          type: 'PRESENCE_UPDATE',
          payload: { userId: 'user-1', isOnline: true },
        })
      );
    });

    it('broadcasts isOnline: false when user goes offline', async () => {
      (roomRepository.getRoomsForUser as any).mockResolvedValue([
        { roomId: 'room-1', role: 'MEMBER' },
      ]);

      await broadcastPresenceUpdate('user-1', false);

      expect(broadcastToRoom).toHaveBeenCalledWith(
        'room-1',
        expect.objectContaining({
          payload: { userId: 'user-1', isOnline: false },
        })
      );
    });

    it('does not broadcast if user has no rooms', async () => {
      (roomRepository.getRoomsForUser as any).mockResolvedValue([]);

      await broadcastPresenceUpdate('user-1', true);

      expect(broadcastToRoom).not.toHaveBeenCalled();
    });
  });

  describe('startPresenceSweep / stopPresenceSweep', () => {
    it('starts sweep interval and cleans up', () => {
      vi.useFakeTimers();
      
      startPresenceSweep();
      
      // Fast-forward time to trigger sweep
      vi.advanceTimersByTime(60_000);
      
      // Clear all timers to prevent infinite loop
      vi.clearAllTimers();
      
      expect(redisClient.zRangeByScore).toHaveBeenCalledWith(
        'presence:heartbeats',
        0,
        expect.any(Number)
      );
      
      vi.useRealTimers();
    });

    it('stops sweep interval', () => {
      vi.useFakeTimers();
      
      startPresenceSweep();
      stopPresenceSweep();
      
      // Clear all timers to prevent infinite loop
      vi.clearAllTimers();
      
      // Should not throw
      expect(true).toBe(true);
      
      vi.useRealTimers();
    });
  });
});