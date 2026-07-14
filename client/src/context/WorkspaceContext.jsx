// src/context/WorkspaceContext.jsx
// Feature 2.2 — Global workspace state
//
// Provides:
//   workspaces       — full list of user's workspaces
//   activeWorkspace  — the currently selected workspace
//   setActive(id)    — switch active workspace
//   refreshWorkspaces() — re-fetch from API
//   loading / error

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ACTIVE_KEY = 'tc_active_workspace'; // persist last selected workspace

const WorkspaceContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function WorkspaceProvider({ children }) {
  const [workspaces,      setWorkspaces]      = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  // ── Fetch all workspaces ─────────────────────────────────────────────────
  const refreshWorkspaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${API_URL}/workspaces`);
      const list = data.workspaces || [];
      setWorkspaces(list);

      // Restore last active workspace from localStorage
      const savedId = localStorage.getItem(ACTIVE_KEY);
      const saved   = list.find((w) => w._id === savedId);

      if (saved) {
        setActiveWorkspace(saved);
      } else if (list.length > 0) {
        // Default to the most recent workspace
        setActiveWorkspace(list[0]);
        localStorage.setItem(ACTIVE_KEY, list[0]._id);
      } else {
        setActiveWorkspace(null);
        localStorage.removeItem(ACTIVE_KEY);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => { refreshWorkspaces(); }, [refreshWorkspaces]);

  // ── Set active workspace ─────────────────────────────────────────────────
  const setActive = useCallback((workspaceOrId) => {
    const id = typeof workspaceOrId === 'string' ? workspaceOrId : workspaceOrId._id;
    const ws = workspaces.find((w) => w._id === id);
    if (ws) {
      setActiveWorkspace(ws);
      localStorage.setItem(ACTIVE_KEY, id);
    }
  }, [workspaces]);

  // ── Add a newly created workspace to the list ────────────────────────────
  const addWorkspace = useCallback((workspace) => {
    setWorkspaces((prev) => [workspace, ...prev]);
    setActiveWorkspace(workspace);
    localStorage.setItem(ACTIVE_KEY, workspace._id);
  }, []);

  // ── Remove an archived workspace from the list ───────────────────────────
  const removeWorkspace = useCallback((id) => {
    setWorkspaces((prev) => {
      const next = prev.filter((w) => w._id !== id);
      // If we archived the active one, switch to next available
      setActiveWorkspace((cur) => {
        if (cur?._id === id) {
          const fallback = next[0] || null;
          localStorage.setItem(ACTIVE_KEY, fallback?._id || '');
          return fallback;
        }
        return cur;
      });
      return next;
    });
  }, []);

  // ── Update workspace in list (after PATCH) ───────────────────────────────
  const updateWorkspaceInList = useCallback((updated) => {
    setWorkspaces((prev) =>
      prev.map((w) => (w._id === updated._id ? updated : w))
    );
    setActiveWorkspace((cur) =>
      cur?._id === updated._id ? updated : cur
    );
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      loading,
      error,
      setActive,
      addWorkspace,
      removeWorkspace,
      updateWorkspaceInList,
      refreshWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaceContext must be used inside <WorkspaceProvider>');
  return ctx;
}