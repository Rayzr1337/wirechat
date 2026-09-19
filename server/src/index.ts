import { server } from "./server";
import "./ws/server"; 
import { prisma } from "./libs/prisma";
import { redisClient as redis } from "./libs/redis";

const PORT = process.env.PORT || 3000;

async function main() {
    await prisma.$connect();

    await redis.connect();

    server.on("error", (err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = async (signal: NodeJS.Signals) => {
        console.log(`Received ${signal}, shutting down`);
        await new Promise<void>((resolve) => server.close(() => resolve()));
        console.log("HTTP server closed");
        await prisma.$disconnect();
        await redis.quit();

        console.log("Prisma and redis disconnected.");
        process.exit(0);
    };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});