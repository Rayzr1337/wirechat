import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';

const roomSockets = new Map<string, Set<WebSocket>>();

vi.mock('@/ws/roomRegistry', () => ({
  addSocketToRoom: vi.fn((roomId: string, ws: WebSocket) => {
    if (!roomSockets.has(roomId)) {
      roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId)!.add(ws);
  }),
  removeSocketFromRoom: vi.fn((roomId: string, ws: WebSocket) => {
    roomSockets.get(roomId)?.delete(ws);
    if (roomSockets.get(roomId)?.size === 0) {
      roomSockets.delete(roomId);
    }
  }),
  getLocalRoomSockets: vi.fn((roomId: string) => roomSockets.get(roomId) ?? new Set()),
}));

import { addSocketToRoom, removeSocketFromRoom, getLocalRoomSockets } from '@/ws/roomRegistry';

describe('roomRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roomSockets.clear();
  });

  describe('addSocketToRoom', () => {
    it('adds socket to room', () => {
      const mockWs = { on: vi.fn(), send: vi.fn() } as any;
      addSocketToRoom('room-1', mockWs);

      expect(addSocketToRoom).toHaveBeenCalledWith('room-1', mockWs);
    });

    it('creates new room set if not exists', () => {
      const mockWs = { on: vi.fn(), send: vi.fn() } as any;
      addSocketToRoom('new-room', mockWs);

      const sockets = getLocalRoomSockets('new-room');
      expect(sockets.has(mockWs)).toBe(true);
    });

    it('adds multiple sockets to same room', () => {
      const ws1 = { on: vi.fn(), send: vi.fn() } as any;
      const ws2 = { on: vi.fn(), send: vi.fn() } as any;
      addSocketToRoom('room-1', ws1);
      addSocketToRoom('room-1', ws2);

      const sockets = getLocalRoomSockets('room-1');
      expect(sockets.size).toBe(2);
      expect(sockets.has(ws1)).toBe(true);
      expect(sockets.has(ws2)).toBe(true);
    });
  });

  describe('removeSocketFromRoom', () => {
    it('removes socket from room', () => {
      const mockWs = { on: vi.fn(), send: vi.fn() } as any;
      addSocketToRoom('room-1', mockWs);
      removeSocketFromRoom('room-1', mockWs);

      const sockets = getLocalRoomSockets('room-1');
      expect(sockets.has(mockWs)).toBe(false);
    });

    it('deletes room if empty after removal', () => {
      const mockWs = { on: vi.fn(), send: vi.fn() } as any;
      addSocketToRoom('room-1', mockWs);
      removeSocketFromRoom('room-1', mockWs);

      const sockets = getLocalRoomSockets('room-1');
      expect(sockets.size).toBe(0);
    });

    it('handles removal from non-existent room gracefully', () => {
      const mockWs = { on: vi.fn(), send: vi.fn() } as any;
      // Should not throw
      removeSocketFromRoom('non-existent', mockWs);
    });
  });

  describe('getLocalRoomSockets', () => {
    it('returns set of sockets for room', () => {
      const ws1 = { on: vi.fn(), send: vi.fn() } as any;
      const ws2 = { on: vi.fn(), send: vi.fn() } as any;
      addSocketToRoom('room-1', ws1);
      addSocketToRoom('room-1', ws2);

      const sockets = getLocalRoomSockets('room-1');
      expect(sockets.size).toBe(2);
    });

    it('returns empty set for non-existent room', () => {
      const sockets = getLocalRoomSockets('non-existent');
      expect(sockets).toBeInstanceOf(Set);
      expect(sockets.size).toBe(0);
    });
  });
});