// src/hooks/useOnlinePresence.js
// Feature 4.3 — Tracks which workspace members are currently online.
//
// Uses the socket events already emitted by the server (Feature 4.1):
//   workspace-online-users  — full list on joining a room
//   user-joined-workspace   — someone came online
//   user-went-offline       — someone disconnected all tabs
//   user-left-workspace     — someone navigated away from this workspace
//
// Returns a Set of online userIds so any component can call .has(userId).

import { useState, useEffect, useCallback } from 'react';
import { useSocketEvent } from './useSocketEvent';
import { useSocket }      from '../context/SocketContext';

export function useOnlinePresence(workspaceId) {
  const { joinWorkspace, connected } = useSocket();

  // Set<userId:string>
  const [onlineIds, setOnlineIds] = useState(new Set());

  // Re-join the workspace room and reset presence when workspace or connection changes
  useEffect(() => {
    if (!workspaceId || !connected) return;
    joinWorkspace(workspaceId);
    // Reset until we hear back from the server
    setOnlineIds(new Set());
  }, [workspaceId, connected, joinWorkspace]);

  // ── Full presence snapshot on room join ──────────────────────────────────
  useSocketEvent('workspace-online-users', useCallback(({ workspaceId: wid, onlineUserIds }) => {
    if (wid !== workspaceId) return;
    setOnlineIds(new Set(onlineUserIds));
  }, [workspaceId]));

  // ── Someone came online ──────────────────────────────────────────────────
  useSocketEvent('user-joined-workspace', useCallback(({ userId }) => {
    setOnlineIds((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }, []));

  // ── Someone went fully offline (closed all tabs) ─────────────────────────
  useSocketEvent('user-went-offline', useCallback(({ userId }) => {
    setOnlineIds((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []));

  // ── Someone left this workspace (navigated away) ─────────────────────────
  useSocketEvent('user-left-workspace', useCallback(({ userId }) => {
    setOnlineIds((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []));

  return {
    onlineIds,                                          // Set<userId>
    isOnline: (userId) => onlineIds.has(userId?.toString()),  // convenience helper
    onlineCount: onlineIds.size,
  };
}