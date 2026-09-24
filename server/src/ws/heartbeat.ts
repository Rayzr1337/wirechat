import type { AuthenticatedSocket } from "./server";
import { wss } from "./server";

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_MISSED_PINGS = 2;

let heartbeatHandle: NodeJS.Timeout | null = null;

export function startHeartbeat() {
  if (heartbeatHandle) return;

  heartbeatHandle = setInterval(() => {
    wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedSocket;

      if ((authWs.missedPings ?? 0) >= MAX_MISSED_PINGS) {
        authWs.terminate(); 
        return;
      }

      authWs.missedPings = (authWs.missedPings ?? 0) + 1;
      authWs.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopHeartbeat() {
  if (heartbeatHandle) {
    clearInterval(heartbeatHandle);
    heartbeatHandle = null;
  }
}