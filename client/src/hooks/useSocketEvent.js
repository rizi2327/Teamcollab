// src/hooks/useSocketEvent.js
// Feature 4.1 — Clean hook for subscribing to a socket event in a component.
// Automatically unsubscribes when the component unmounts or the handler changes.
//
// Usage:
//   useSocketEvent('new-message', (msg) => setMessages(prev => [...prev, msg]));
//   useSocketEvent('user-joined-workspace', ({ userId, name }) => { ... });

import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export function useSocketEvent(event, handler) {
  const { on, connected } = useSocket();

  useEffect(() => {
    if (!connected || !event || !handler) return;
    // `on` returns an unsubscribe function
    const off = on(event, handler);
    return off;
  }, [on, connected, event, handler]);
}   