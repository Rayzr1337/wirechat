import type { WebSocket } from "ws";

const roomSockets = new Map<string, Set<WebSocket>>();

export function addSocketToRoom(roomId: string, ws: WebSocket) {
  if (!roomSockets.has(roomId)) {
    roomSockets.set(roomId, new Set());
  }
  roomSockets.get(roomId)!.add(ws);
}

export function removeSocketFromRoom(roomId: string, ws: WebSocket) {
  roomSockets.get(roomId)?.delete(ws);
  if (roomSockets.get(roomId)?.size === 0) {
    roomSockets.delete(roomId);
  }
}

export function getLocalRoomSockets(roomId: string): Set<WebSocket> {
  return roomSockets.get(roomId) ?? new Set();
}