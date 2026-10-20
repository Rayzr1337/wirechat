import { useEffect, useCallback } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { connect as wsConnect, disconnect as wsDisconnect } from './client';
import { handleInbound } from './handlers';

export function useWebSocket() {
  const { connected, send } = useSocketStore();

  useEffect(() => {
    wsConnect(handleInbound);

    return () => {
      wsDisconnect();
    };
  }, []);

  const sendMessage = useCallback((type: string, payload: Record<string, unknown>) => {
    send(type, payload);
  }, [send]);

  return { connected, send: sendMessage };
}
