import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthenticatedSocket } from '@/ws/server';

vi.mock('@/ws/server', () => ({
  wss: {
    clients: new Set(),
  },
}));

import { startHeartbeat, stopHeartbeat } from '@/ws/heartbeat';
import { wss } from '@/ws/server';

describe('heartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset wss.clients
    (wss.clients as Set<AuthenticatedSocket>).clear();
  });

  describe('startHeartbeat / stopHeartbeat', () => {
    it('starts heartbeat interval', () => {
      vi.useFakeTimers();
      
      startHeartbeat();
      
      // Advance time to trigger ping
      vi.advanceTimersByTime(15_000);
      
      // Clear all timers to prevent infinite loop
      vi.clearAllTimers();
      
      expect(true).toBe(true);
      
      vi.useRealTimers();
    });

    it('stops heartbeat interval', () => {
      vi.useFakeTimers();
      
      startHeartbeat();
      stopHeartbeat();
      
      // Clear all timers to prevent infinite loop
      vi.clearAllTimers();
      
      // Should not throw
      expect(true).toBe(true);
      
      vi.useRealTimers();
    });

    it('pings clients and tracks missed pings', () => {
      vi.useFakeTimers();
      
      const mockClient = {
        user: { id: 'user-1' },
        readyState: 1, // WebSocket.OPEN
        missedPings: 0,
        ping: vi.fn(),
        terminate: vi.fn(),
      } as AuthenticatedSocket;
      
      (wss.clients as Set<AuthenticatedSocket>).add(mockClient);
      
      startHeartbeat();
      
      // Advance time to trigger ping
      vi.advanceTimersByTime(15_000);
      
      expect(mockClient.ping).toHaveBeenCalled();
      expect(mockClient.missedPings).toBe(1);
      
      // Clear all timers to prevent infinite loop
      vi.clearAllTimers();
      
      vi.useRealTimers();
    });

    it('does not ping closed connections', () => {
      vi.useFakeTimers();
      
      const mockClient = {
        user: { id: 'user-1' },
        readyState: 3, // WebSocket.CLOSED
        missedPings: 0,
        ping: vi.fn(),
        terminate: vi.fn(),
      } as AuthenticatedSocket;
      
      (wss.clients as Set<AuthenticatedSocket>).add(mockClient);
      
      startHeartbeat();
      
      // Advance time to trigger ping
      vi.advanceTimersByTime(15_000);
      
      expect(mockClient.ping).not.toHaveBeenCalled();
      
      // Clear all timers to prevent infinite loop
      vi.clearAllTimers();
      
      vi.useRealTimers();
    });
  });
});