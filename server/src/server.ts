import { createApp } from "./app";
import  { createServer, Server } from "node:http";
import dotenv from "dotenv";
import { wss, attachWebsocketServer } from "./ws/server";
import { closeBroadcastListener } from "./ws/broadcast";
import { redisClient } from "./libs/redis";
import { prisma } from "./libs/prisma";
import { getAllSockets } from "./ws/roomRegistry";

dotenv.config();

export function createHttpServer() {
    const app = createApp();
    const server = createServer(app);
    attachWebsocketServer(server);

    return server;
}

export function registerShutdown(server: Server) {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;          
    shuttingDown = true;
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    const force = setTimeout(() => {
      console.error("Shutdown timed out, forcing exit.");
      process.exit(1);
    }, 10_000);
    force.unref();

    const httpClosed = new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeIdleConnections?.();   
    wss.close();

    const sockets = [...getAllSockets()];   
    console.log(`Closing ${sockets.length} active WebSocket connection(s)...`);
    await Promise.all(
      sockets.map(
        (ws) =>
          new Promise<void>((resolve) => {
            if (ws.readyState === ws.CLOSED) return resolve();
            ws.once("close", () => resolve());
            try {
              ws.close(1001, "Server shutting down");
            } catch {
              resolve();
            }
          })
      )
    );

    await httpClosed;

    console.log("Closing Redis connections...");
    await closeBroadcastListener().catch(() => {});
    await redisClient.quit().catch(() => {});

    console.log("Disconnecting database...");
    await prisma.$disconnect().catch(() => {});

    console.log("Graceful shutdown complete.");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
