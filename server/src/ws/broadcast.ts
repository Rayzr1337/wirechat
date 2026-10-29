import { redisClient } from "../libs/redis";
import { getLocalRoomSockets, getUserSockets, removeUserFromRoom, addSocketToRoom } from "./roomRegistry";
import type { OutgoingMessage } from "./protocol/schemas";
import { AuthenticatedSocket } from "./server";

const subscriber = redisClient.duplicate();
let subscriberReady = false;

export async function initBroadcastListener() {
    if (subscriberReady) return;

    try {
        await subscriber.connect();
    } catch (error) {
        console.error("Failed to connect to Redis for broadcast listener:", error);
        throw error;
    }

    await subscriber.pSubscribe("room:*", (message, channel) => {
        const roomId = channel.split(":")[1];
        const sockets = getLocalRoomSockets(roomId);
        const { message: outgoingMessage, excludeUserId } = JSON.parse(message) as { message: OutgoingMessage; excludeUserId?: string };

        for (const ws of sockets) {
            const authSocket = ws as AuthenticatedSocket;
            if (authSocket.readyState === ws.OPEN && authSocket.user && authSocket.user.id !== excludeUserId) {
                try {
                    authSocket.send(JSON.stringify(outgoingMessage));
                } catch (err) {
                    console.error("Failed to send message to WebSocket:", err);
                }
            }
        }
    });

    await subscriber.pSubscribe("user:*", (message, channel) => {
        const userId = channel.split(":")[1];
        const { message: outgoingMessage } = JSON.parse(message) as { message: OutgoingMessage };
        const sockets = getUserSockets(userId);

        for (const ws of sockets) {
            const authSocket = ws as AuthenticatedSocket;
            if (authSocket.readyState === ws.OPEN) {
                try {
                    authSocket.send(JSON.stringify(outgoingMessage));
                } catch (err) {
                    console.error("Failed to send message to WebSocket:", err);
                }
            }
        }
    });

    await subscriber.pSubscribe("room_socket:*", (message, channel) => {
        const roomId = channel.split(":")[1];
        const { userId } = JSON.parse(message) as { userId: string };
        removeUserFromRoom(roomId, userId);
    });

    await subscriber.pSubscribe("room_register:*", (message, channel) => {
        const roomId = channel.split(":")[1];
        const { userId } = JSON.parse(message) as { userId: string };
        const sockets = getUserSockets(userId);
        for (const ws of sockets) {
            addSocketToRoom(roomId, ws);
            (ws as AuthenticatedSocket).rooms?.add(roomId);
        }
    });

    subscriberReady = true;
}

export async function closeBroadcastListener() {
  await subscriber.quit();
}

export async function broadcastToRoom(roomId: string, message: OutgoingMessage, excludeUserId?: string) {
  const payload = { message, excludeUserId };
  await redisClient.publish(`room:${roomId}`, JSON.stringify(payload));
}

export async function broadcastToUser(userId: string, message: OutgoingMessage) {
  await redisClient.publish(`user:${userId}`, JSON.stringify({ message }));
}

export async function broadcastSocketLeave(roomId: string, userId: string) {
  await redisClient.publish(`room_socket:${roomId}`, JSON.stringify({ userId }));
}
