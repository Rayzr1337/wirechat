import { server } from "../server";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {

});

wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");

  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
    // Echo the message back to the client
    ws.send(`Server received: ${message}`);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});