import { useEffect } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { connect as wsConnect, disconnect as wsDisconnect } from './client';
import { handleInbound } from './handlers';

export function useWebSocket() {
  const { connected } = useSocketStore();

  useEffect(() => {
    wsConnect(handleInbound).catch(() => {
      // WebSocket connection failed — app continues without real-time features
    });

    return () => {
      wsDisconnect();
    };
  }, []);

  return { connected };
}
