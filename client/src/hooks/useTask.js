// src/hooks/useTask.js — FINAL after Feature 3.4 (Stage 3 complete)

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useTask() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── Create task (3.1) ────────────────────────────────────────────────────
  const createTask = useCallback(async (payload) => {
    setLoading(true); setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/tasks`, payload);
      return { success: true, task: data.task };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create task';
      setError(msg); return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Get tasks (3.2) ──────────────────────────────────────────────────────
  const getTasks = useCallback(async (filters) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, v);
      });
      const { data } = await axios.get(`${API_URL}/tasks?${params.toString()}`);
      return { success: true, tasks: data.tasks, counts: data.counts, pagination: data.pagination };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load tasks';
      setError(msg); return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  // ── Update task (3.3) ────────────────────────────────────────────────────
  const updateTask = useCallback(async (taskId, payload, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { data } = await axios.patch(`${API_URL}/tasks/${taskId}`, payload);
      return { success: true, task: data.task };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update task';
      setError(msg); return { success: false, message: msg };
    } finally { if (!silent) setLoading(false); }
  }, []);

  // ── Delete task (3.4) ────────────────────────────────────────────────────
  const deleteTask = useCallback(async (taskId) => {
    setLoading(true); setError(null);
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      return { success: true, taskId };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete task';
      setError(msg); return { success: false, message: msg };
    } finally { setLoading(false); }
  }, []);

  return { loading, error, createTask, getTasks, updateTask, deleteTask };
}