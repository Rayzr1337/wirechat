import { server } from "../server";
import { WebSocketServer, WebSocket } from "ws";
import { validateIncomingMessage } from "./protocol/validate";
import { redisClient } from "../libs/redis";
import { Duplex } from "stream";
import { AppError } from "../middleware/error.middleware";
import type { IncomingMessage, ErrorCode } from "./protocol/schemas";
import { removeSocketFromRoom } from "./roomRegistry";

import { handleJoinRoom } from "./handlers/join.handler";
import { handleLeaveRoom } from "./handlers/leave.handler";
import { handleMessage } from "./handlers/message.handler";
import { handleEditMessage } from "./handlers/editMsg.handler";
import { handleDeleteMessage } from "./handlers/delMsg.handler";
import { handleTypingIndicator } from "./handlers/typing.handler";

import { broadcastPresenceUpdate } from "./presence";

const PRESENCE_ZSET = "presence:heartbeats";

export interface AuthenticatedSocket extends WebSocket {
  user?: { id: string };
  rooms?: Set<string>;
  missedPings?: number;
}


function sendError(ws: WebSocket, code: ErrorCode, message: string) {
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

export const wss = new WebSocketServer({ noServer: true });

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
        authSocket.user = user;
        wss.emit("connection", authSocket, request);
    });
});

wss.on("connection", async (ws: AuthenticatedSocket) => {
  console.log("New WebSocket connection established");
  ws.rooms = new Set<string>();
  ws.missedPings = 0;

  const count = await redisClient.incr(`presence:count:${ws.user!.id}`);
  await redisClient.zAdd(PRESENCE_ZSET, { score: Date.now(), value: ws.user!.id });

  if (count === 1) {
    await broadcastPresenceUpdate(ws.user!.id, true);
  }

  ws.on("message", async (message) => {
    const raw = message.toString();
    const result = validateIncomingMessage(raw);

    if (!result.success) {
      console.error("Invalid message received:", result.message);
      sendError(ws, result.code, "Invalid message format.");
      return;
    }
    
    const incomingMessage = result.data as IncomingMessage;
    const userId = ws.user?.id;
    
    if (!userId) {
      sendError(ws, "UNAUTHORIZED", "Not authenticated");
      return;
    }

    try {
      switch (incomingMessage.type) {
        case "JOIN_ROOM": {
          await handleJoinRoom(userId, ws, incomingMessage);
          break;
        }
        case "LEAVE_ROOM": {
          await handleLeaveRoom(userId, ws, incomingMessage);
          break;
        }
        case "MESSAGE": {
          await handleMessage(userId, ws, incomingMessage);
          break;
        }
        case "EDIT_MESSAGE": {
          await handleEditMessage(userId, ws, incomingMessage);
          break;
        }
        case "DELETE_MESSAGE": {
          await handleDeleteMessage(userId, ws, incomingMessage);
          break;
        }
        case "TYPING": {
          await handleTypingIndicator(userId, ws, incomingMessage);
          break;
        }
      }
    } catch (err) {
      if (err instanceof AppError) {
        sendError(ws, err.code, err.message);
      } else {
        console.error("Error handling message:", err);
        sendError(ws, "INTERNAL_SERVER_ERROR", "Internal server error");
      }
    }
  });

  ws.on("pong", async () => {
    ws.missedPings = 0; 
    await redisClient.zAdd(PRESENCE_ZSET, { score: Date.now(), value: ws.user!.id });
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("close", async () => {
    console.log("WebSocket connection closed");
    if (ws.rooms) {
      for (const roomId of ws.rooms) {
        removeSocketFromRoom(roomId, ws);
      }
    }

    if (ws.user) {
      const count = await redisClient.decr(`presence:count:${ws.user.id}`);
      if (count <= 0) {
        await redisClient.del(`presence:count:${ws.user.id}`);
        await redisClient.zRem(PRESENCE_ZSET, ws.user.id);
        await broadcastPresenceUpdate(ws.user.id, false);
      }
    }
  });
});
