// src/hooks/useChat.js
// Feature 4.2 — Manages chat messages for the active workspace.
// Handles history loading, sending (with optimistic updates), and
// receiving new messages via the socket.

import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// A simple UUID-lite for generating tempIds
const tempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function useChat(workspaceId) {
  const { socket, connected, joinWorkspace } = useSocket();

  const [messages,       setMessages]       = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMore,        setHasMore]        = useState(false);
  const [page,           setPage]           = useState(1);
  const [sendError,      setSendError]      = useState('');

  // ref to avoid stale-closure issues in socket callbacks
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;

  // ── Load history (REST) ───────────────────────────────────────────────────
  const loadHistory = useCallback(async (pageNum = 1) => {
    if (!workspaceId) return;
    setHistoryLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/messages`, {
        params: { workspace: workspaceId, page: pageNum, limit: 50 },
      });
      if (pageNum === 1) {
        setMessages(data.messages);       // fresh load
      } else {
        setMessages((prev) => [...data.messages, ...prev]); // prepend older messages
      }
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load chat history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [workspaceId]);

  // ── Load more (older) messages ────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (hasMore && !historyLoading) loadHistory(page + 1);
  }, [hasMore, historyLoading, page, loadHistory]);

  // ── Send message (socket) ────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (!text?.trim() || !connected || !socket) {
      setSendError('Not connected — please wait');
      return;
    }
    setSendError('');

    const tid = tempId();
    const optimistic = {
      _id:       tid,
      tempId:    tid,
      text:      text.trim(),
      workspace: workspaceId,
      sender:    null,          // filled in when server echoes back
      createdAt: new Date().toISOString(),
      _optimistic: true,        // flag so UI can style it differently if needed
    };

    // Show immediately — will be replaced by the server echo
    setMessages((prev) => [...prev, optimistic]);

    // Emit with socket.io acknowledgement callback
    socket.emit('send-message', { workspaceId, text: text.trim(), tempId: tid }, (ack) => {
      if (!ack?.success) {
        // Remove the optimistic message and show the error
        setMessages((prev) => prev.filter((m) => m._id !== tid));
        setSendError(ack?.message || 'Failed to send message');
      }
      // On success, the server broadcasts 'new-message' which replaces the temp
    });
  }, [connected, socket, workspaceId]);

  // ── Called by WorkspaceView when a 'new-message' event arrives ─────────────
  // Exported so the caller can wire it up with useSocketEvent.
  const handleIncomingMessage = useCallback((msg) => {
    // Only process messages for the current workspace
    if ((msg.workspace?._id || msg.workspace) !== workspaceIdRef.current) return;

    setMessages((prev) => {
      // Replace optimistic placeholder if tempId matches
      if (msg.tempId) {
        const hasTemp = prev.some((m) => m._id === msg.tempId);
        if (hasTemp) {
          return prev.map((m) => m._id === msg.tempId ? { ...msg, _optimistic: false } : m);
        }
      }
      // Avoid duplicates (can happen if the sender also receives broadcast)
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }, []);

  return {
    messages,
    historyLoading,
    hasMore,
    sendError,
    loadHistory,
    loadMore,
    sendMessage,
    handleIncomingMessage,
  };
}