import { server } from "../server";
import { WebSocketServer, type WebSocket } from "ws";
import { validateIncomingMessage } from "./protocol/validate";
import { redisClient } from "../libs/redis";
import { Duplex } from "stream";

// Define an interface for the authenticated WebSocket connection

interface AuthenticatedSocket extends WebSocket {
  user?: { id: string };
}

// Helper functions for sending error messages and rejecting upgrade requests
function sendError(ws: WebSocket, code: string, message: string) {
  ws.send(JSON.stringify({
    type: "ERROR",
    payload: { code, message },
  }));
};

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  500: "Internal Server Error",
};

export function rejectUpgrade(socket: Duplex, statusCode: number, reason: string) {
  const statusText = STATUS_TEXT[statusCode] ?? "Error";

  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
    `Connection: close\r\n` +
    `Content-Type: text/plain\r\n` +
    `Content-Length: ${Buffer.byteLength(reason)}\r\n` +
    `\r\n` +
    reason
  );

  socket.destroy();
}

// Create a WebSocket server that will handle the upgrade requests

const wss = new WebSocketServer({ noServer: true });

// Handle the upgrade requests to authenticate users based on the ticket

server.on("upgrade", async (request, socket, head) => {
    const parsedUrl = new URL(request.url || "", `http://${request.headers.host}`);
    const ticket = parsedUrl.searchParams.get("ticket");

    if (!ticket) {
        return rejectUpgrade(socket, 400, "Invalid or missing ticket.");
    }

    const userId = await redisClient.getDel(`ticket:${ticket}`).then((userId) => {
        if (!userId) {
            return rejectUpgrade(socket, 401, "Invalid or expired ticket.");
        } 

        return userId;
      }).catch((err) => {
        console.error("Redis error:", err);
        return rejectUpgrade(socket, 500, "Internal server error.");
    });

    if (!userId) return;
    const user = { id: userId };

    wss.handleUpgrade(request, socket, head, (ws) => {
        const authSocket = ws as AuthenticatedSocket;
        authSocket.user = user; // Attach the authenticated user to the socket
        wss.emit("connection", authSocket, request);
    });
});

wss.on("connection", (ws: AuthenticatedSocket) => {
  console.log("New WebSocket connection established");

  ws.on("message", (message) => {
    const raw = message.toString();
    const result = validateIncomingMessage(raw);

    if (!result.success) {
      console.error("Invalid message received:", result.message);
      sendError(ws, result.code, "Invalid message format.");
      return;
    }
    
    const incomingMessage = result.data;
    console.log(`Valid message from ${ws.user?.id}:`, incomingMessage);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});