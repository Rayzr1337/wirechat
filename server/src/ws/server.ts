import { server } from "../server";
import { WebSocketServer, WebSocket } from "ws";
import { validateIncomingMessage } from "./protocol/validate";
import { redisClient } from "../libs/redis";
import { Duplex } from "stream";
import { sendMessage, editMessage, deleteMessage } from "../services/messages.service";
import { joinRoom, leaveRoom, getRoomMembers } from "../services/rooms.service";
import type { IncomingMessage, OutgoingMessage } from "./protocol/schemas";

interface AuthenticatedSocket extends WebSocket {
  user?: { id: string };
}

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

const wss = new WebSocketServer({ noServer: true });

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

async function broadcastToRoom(roomId: string, message: OutgoingMessage, excludeUserId?: string) {
  const members = await getRoomMembers(roomId);
  const memberIds = new Set(members.map(m => m.userId));
  
  wss.clients.forEach((client) => {
    const authClient = client as AuthenticatedSocket;
    if (authClient.readyState === WebSocket.OPEN && 
        authClient.user && 
        memberIds.has(authClient.user.id) &&
        authClient.user.id !== excludeUserId) {
      authClient.send(JSON.stringify(message));
    }
  });
}

wss.on("connection", (ws: AuthenticatedSocket) => {
  console.log("New WebSocket connection established");

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
          await joinRoom(userId, incomingMessage.payload.roomId);
          const joinMsg: OutgoingMessage = {
            type: "USER_JOINED",
            payload: {
              roomId: incomingMessage.payload.roomId,
              userId,
              timestamp: new Date().toISOString()
            }
          };
          await broadcastToRoom(incomingMessage.payload.roomId, joinMsg);
          break;
        }
        case "LEAVE_ROOM": {
          await leaveRoom(userId, incomingMessage.payload.roomId);
          const leaveMsg: OutgoingMessage = {
            type: "USER_LEFT",
            payload: {
              roomId: incomingMessage.payload.roomId,
              userId,
              timestamp: new Date().toISOString()
            }
          };
          await broadcastToRoom(incomingMessage.payload.roomId, leaveMsg);
          break;
        }
        case "MESSAGE": {
          const msg = await sendMessage(userId, incomingMessage.payload.roomId, incomingMessage.payload.content);
          const outMsg: OutgoingMessage = {
            type: "MESSAGE",
            payload: {
              id: msg.id,
              roomId: msg.roomId,
              senderId: msg.senderId ?? "",
              content: msg.content,
              createdAt: msg.createdAt.toISOString()
            }
          };
          await broadcastToRoom(incomingMessage.payload.roomId, outMsg);
          break;
        }
        case "EDIT_MESSAGE": {
          const edited = await editMessage(incomingMessage.payload.messageId, userId, incomingMessage.payload.content);
          const outMsg: OutgoingMessage = {
            type: "MESSAGE_EDITED",
            payload: {
              id: edited.id,
              roomId: edited.roomId,
              content: edited.content,
              editedAt: edited.editedAt!.toISOString()
            }
          };
          await broadcastToRoom(edited.roomId, outMsg);
          break;
        }
        case "DELETE_MESSAGE": {
          const deleted = await deleteMessage(incomingMessage.payload.messageId, userId);
          const outMsg: OutgoingMessage = {
            type: "MESSAGE_DELETED",
            payload: {
              id: deleted.id,
              roomId: deleted.roomId
            }
          };
          await broadcastToRoom(deleted.roomId, outMsg);
          break;
        }
        case "TYPING": {
          const typingMsg: OutgoingMessage = {
            type: "TYPING",
            payload: {
              roomId: incomingMessage.payload.roomId,
              userId
            }
          };
          await broadcastToRoom(incomingMessage.payload.roomId, typingMsg, userId);
          break;
        }
      }
    } catch (err) {
      if (err instanceof Error && "code" in err) {
        const appError = err as { code: string; message: string; statusCode?: number };
        sendError(ws, appError.code, appError.message);
      } else {
        console.error("Error handling message:", err);
        sendError(ws, "INTERNAL_ERROR", "Internal server error");
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});