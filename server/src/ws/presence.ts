import { roomRepository } from "../repositories/room.repository";
import { z } from "zod";
import { broadcastToRoom } from "./broadcast";
import type { presenceUpdateSchema } from "./protocol/schemas";
import { redisClient } from "../libs/redis";

const STALE_THRESHOLD_MS = 45_000;
const SWEEP_INTERVAL_MS = 60_000;
const PRESENCE_ZSET = "presence:heartbeats";
const PRESENCE_SOCKETS = "presence:sockets";

type PresenceUpdate = z.infer<typeof presenceUpdateSchema>;

export async function broadcastPresenceUpdate(userId: string, isOnline: boolean) {
  const presenceMsg: PresenceUpdate = {
    type: "PRESENCE_UPDATE",
    payload: { userId, isOnline },
  };

  const memberships = await roomRepository.getRoomsForUser(userId);

  for (const membership of memberships) {
    await broadcastToRoom(membership.roomId, presenceMsg);
  }
}

export async function addUserConnection(userId: string, socketId: string): Promise<boolean> {
  const socketsKey = `${PRESENCE_SOCKETS}:${userId}`;
  const results = await redisClient.multi().sAdd(socketsKey, socketId).sCard(socketsKey).exec() as unknown as [number, number];
  return results[1] === 1;
}

export async function removeUserConnection(userId: string, socketId: string): Promise<boolean> {
  const socketsKey = `${PRESENCE_SOCKETS}:${userId}`;
  const results = await redisClient.multi().sRem(socketsKey, socketId).sCard(socketsKey).exec() as unknown as [number, number];
  return results[1] === 0;
}

let sweepHandle: NodeJS.Timeout | null = null;

export function startPresenceSweep() {
  if (sweepHandle) return;

  sweepHandle = setInterval(async () => {
    try {
      const cutoff = Date.now() - STALE_THRESHOLD_MS;
      const staleUserIds = await redisClient.zRangeByScore(PRESENCE_ZSET, 0, cutoff);

      for (const userId of staleUserIds) {
        await redisClient.zRem(PRESENCE_ZSET, userId);
        await redisClient.del(`${PRESENCE_SOCKETS}:${userId}`);
        await broadcastPresenceUpdate(userId, false);
      }
    } catch (err) {
      console.error("Presence sweep failed:", err);
    }
  }, SWEEP_INTERVAL_MS);
}

export function stopPresenceSweep() {
  if (sweepHandle) {
    clearInterval(sweepHandle);
    sweepHandle = null;
  }
}
