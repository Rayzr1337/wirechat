import { redisClient } from "../libs/redis";
import { getLocalRoomSockets } from "./roomRegistry";
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

    subscriberReady = true;
}

export async function closeBroadcastListener() {
  await subscriber.quit();
}

export async function broadcastToRoom(roomId: string, message: OutgoingMessage, excludeUserId?: string) {
  const payload = { message, excludeUserId };
  await redisClient.publish(`room:${roomId}`, JSON.stringify(payload));
}