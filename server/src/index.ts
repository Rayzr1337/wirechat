import { createHttpServer, registerShutdown } from "./server";
import { prisma } from "./libs/prisma";
import { redisClient as redis } from "./libs/redis";
import { initBroadcastListener } from "./ws/broadcast";
import { startHeartbeat } from "./ws/heartbeat";
import { startPresenceSweep } from "./ws/presence";

const PORT = process.env.PORT || 3000;

async function main() {
    await prisma.$connect();

    await redis.connect();

    try {
        await initBroadcastListener();
    } catch (error) {
        console.error("Failed to initialize broadcast listener:", error);
        process.exit(1);
    }

    const server = createHttpServer();
    registerShutdown(server);

    startHeartbeat();
    startPresenceSweep();
    

    server.on("error", (err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
