import { redisClient } from "../libs/redis";

const MESSAGE_LIMIT = 15;
const WINDOW_MS = 10_000;

export async function isRateLimtied(userId: string): Promise<boolean> {
    const currentCount = await redisClient.get(`rate_limit:${userId}`);
    if (currentCount && parseInt(currentCount) >= MESSAGE_LIMIT) {
        return true;
    }

    const newCount = await redisClient.set(`rate_limit:${userId}`, 1 , {
        EX: WINDOW_MS / 1000,
        NX: true
    });

    if (newCount === null) {
        await redisClient.incr(`rate_limit:${userId}`);
    }
    
    return false;
}