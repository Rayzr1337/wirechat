import type { WebSocket } from "ws";

const roomSockets = new Map<string, Set<WebSocket>>();
const userSockets = new Map<string, Set<WebSocket>>();

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

export function addUserSocket(userId: string, ws: WebSocket) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(ws);
}

export function removeUserSocket(userId: string, ws: WebSocket) {
  userSockets.get(userId)?.delete(ws);
  if (userSockets.get(userId)?.size === 0) {
    userSockets.delete(userId);
  }
}

export function getUserSockets(userId: string): Set<WebSocket> {
  return userSockets.get(userId) ?? new Set();
}

export function removeUserFromRoom(roomId: string, userId: string) {
  const sockets = roomSockets.get(roomId);
  if (!sockets) return;

  for (const ws of sockets) {
    const authSocket = ws as { user?: { id: string } };
    if (authSocket.user && authSocket.user.id === userId) {
      sockets.delete(ws);
    }
  }

  if (sockets.size === 0) {
    roomSockets.delete(roomId);
  }
}