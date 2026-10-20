import { useSocketStore } from '../stores/socketStore';
import { outgoingMessageSchema, type OutgoingMessage } from './protocol/schemas';

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let isManuallyDisconnected = false;
let reconnectAttempts = 0;
let messageHandler: ((data: OutgoingMessage) => void) | null = null;

const RECONNECT_DELAYS = [3000, 5000, 10000];
const MAX_RECONNECT_DELAY = 30000;

function getWsUrl() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost';
}

async function fetchTicket(): Promise<string> {
  const res = await fetch('/api/auth/ws-ticket', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch WS ticket');
  const data = await res.json();
  return data.ticket;
}

function setupSocket(socket: WebSocket, onMessage: (data: OutgoingMessage) => void) {
  socket.onmessage = (event) => {
    if (typeof event.data !== 'string') return;
    try {
      const parsed = JSON.parse(event.data);
      const result = outgoingMessageSchema.safeParse(parsed);
      if (result.success) {
        onMessage(result.data);
      }
    } catch {
      // ignore malformed messages
    }
  };
}

export async function connect(onMessage: (data: OutgoingMessage) => void) {
  messageHandler = onMessage;
  isManuallyDisconnected = false;
  reconnectAttempts = 0;
  await establishConnection();
}

export function disconnect() {
  isManuallyDisconnected = true;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  reconnectAttempts = 0;
  messageHandler = null;
  const { disconnect: disconnectSocket } = useSocketStore.getState();
  disconnectSocket();
}

async function waitForSocket(maxWaitMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const { connected, socket } = useSocketStore.getState();
    if (connected && socket) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function establishConnection() {
  if (!messageHandler) throw new Error('No message handler');
  const ticket = await fetchTicket();
  const url = `${getWsUrl()}/ws?ticket=${encodeURIComponent(ticket)}`;
  const { connect: connectSocket } = useSocketStore.getState();
  connectSocket(url, scheduleReconnect);

  const connected = await waitForSocket();
  if (!connected) return;

  const socket = useSocketStore.getState().socket;
  if (socket) {
    setupSocket(socket, messageHandler);
  }

  const { joinedRooms, send } = useSocketStore.getState();
  for (const roomId of joinedRooms) {
    send('JOIN_ROOM', { roomId });
  }
}

function scheduleReconnect() {
  if (isManuallyDisconnected) return;
  reconnectAttempts++;
  const delayIndex = Math.min(reconnectAttempts - 1, RECONNECT_DELAYS.length - 1);
  const delay = Math.min(RECONNECT_DELAYS[delayIndex], MAX_RECONNECT_DELAY);
  reconnectTimeout = setTimeout(async () => {
    try {
      await establishConnection();
      reconnectAttempts = 0;
    } catch {
      scheduleReconnect();
    }
  }, delay);
}
