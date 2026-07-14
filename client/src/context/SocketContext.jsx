// src/context/SocketContext.jsx
// Feature 4.1 — Manages the Socket.io client connection lifecycle.
//
// Responsibilities:
//   - Creates and authenticates the socket when the user is logged in
//   - Destroys it when the user logs out or the component unmounts
//   - Exposes the socket instance to the rest of the app via context
//   - Tracks connection status (connecting / connected / disconnected / error)
//
// INSTALL: npm install socket.io-client

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthContext } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function SocketProvider({ children }) {
  const { token, isLoggedIn } = useAuthContext();

  // socketRef holds the socket instance without triggering re-renders on connect
  const socketRef = useRef(null);

  const [connected, setConnected]   = useState(false);
  const [connError, setConnError]   = useState('');  // last connection error message
  const [status, setStatus]         = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

  // ── Connect ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !token) {
      // User logged out — disconnect and clean up
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
        setStatus('idle');
      }
      return;
    }

    // Don't create a second socket if one already exists and is connected
    if (socketRef.current?.connected) return;

    setStatus('connecting');
    setConnError('');

    const socket = io(SOCKET_URL, {
      auth: { token },                 // JWT sent with every connection attempt
      transports: ['websocket'],       // skip long-polling for lower latency
      reconnection: true,              // auto-reconnect on drop
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setConnected(true);
      setConnError('');
      setStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ Socket disconnected:', reason);
      setConnected(false);
      setStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      setConnError(err.message);
      setStatus('error');
      setConnected(false);
    });

    socket.on('reconnect', (attempt) => {
      console.log(`🔄 Socket reconnected after ${attempt} attempt(s)`);
      setConnected(true);
      setConnError('');
      setStatus('connected');
    });

    socket.on('reconnect_failed', () => {
      setConnError('Could not reconnect to the server');
      setStatus('error');
    });

    // Cleanup on unmount or when token changes (e.g. user switches account)
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setStatus('idle');
    };
  }, [isLoggedIn, token]);

  // ── joinWorkspace / leaveWorkspace helpers ────────────────────────────────
  // Wrap the raw socket.emit calls so consumers don't import socket directly
  const joinWorkspace = useCallback((workspaceId) => {
    if (socketRef.current?.connected && workspaceId) {
      socketRef.current.emit('join-workspace', workspaceId);
    }
  }, []);

  const leaveWorkspace = useCallback((workspaceId) => {
    if (socketRef.current?.connected && workspaceId) {
      socketRef.current.emit('leave-workspace', workspaceId);
    }
  }, []);

  // ── Generic event helper — subscribe to a socket event ───────────────────
  // Returns an unsubscribe function, usable in useEffect cleanup.
  // Usage: const off = on('new-message', handler); return () => off();
  const on = useCallback((event, handler) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,  // raw socket — use sparingly; prefer helpers below
      connected,
      status,
      connError,
      joinWorkspace,
      leaveWorkspace,
      on,
      emit,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}