import { server } from "../server";
import { WebSocketServer, type WebSocket } from "ws";
import { validateIncomingMessage } from "./protocol/validate";

interface AuthenticatedSocket extends WebSocket {
  user?: { id: string };
}

function sendError(ws: WebSocket, code: string, message: string) {
  ws.send(JSON.stringify({
    type: "ERROR",
    payload: { code, message },
  }));
};

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
    const fakeUser = { id: "12345" }; // Replace with actual authentication logic
    wss.handleUpgrade(request, socket, head, (ws) => {
        const authSocket = ws as AuthenticatedSocket;
        authSocket.user = fakeUser; // Attach the authenticated user to the socket
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