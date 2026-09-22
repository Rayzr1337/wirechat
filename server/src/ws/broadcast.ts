import { redisClient } from "../libs/redis";
import { getLocalRoomSockets } from "./roomRegistry";
import type { OutgoingMessage } from "./protocol/schemas";

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

        for (const ws of sockets) {
            if (ws.readyState === ws.OPEN) {
                try {
                    ws.send(message);
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

export async function broadcastToRoom(roomId: string, message: OutgoingMessage) {
    await redisClient.publish(`room:${roomId}`, JSON.stringify(message));
};

