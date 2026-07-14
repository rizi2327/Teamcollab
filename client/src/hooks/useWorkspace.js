// src/hooks/useWorkspace.js
// Custom hook — all workspace API calls in one place.
// Components import this hook instead of calling axios directly.

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useWorkspace() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── Create workspace ────────────────────────────────────────────────────────
  const createWorkspace = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/workspaces`, payload);
      return { success: true, workspace: data.workspace };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create workspace';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Get all workspaces ──────────────────────────────────────────────────────
  const getWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/workspaces`);
      return { success: true, workspaces: data.workspaces };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch workspaces';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Get single workspace ────────────────────────────────────────────────────
  const getWorkspace = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/workspaces/${id}`);
      return { success: true, workspace: data.workspace };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch workspace';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Update workspace ────────────────────────────────────────────────────────
  const updateWorkspace = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.patch(`${API_URL}/workspaces/${id}`, payload);
      return { success: true, workspace: data.workspace };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update workspace';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Delete (archive) workspace ──────────────────────────────────────────────
  const deleteWorkspace = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_URL}/workspaces/${id}`);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete workspace';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createWorkspace,
    getWorkspaces,
    getWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}