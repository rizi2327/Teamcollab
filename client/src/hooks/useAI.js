// src/hooks/useAI.js
// Feature 8.1 — summarizer, task breakdown, and assistant calls

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function extractErrorMessage(err) {
  return err.response?.data?.message || 'Something went wrong talking to the AI service';
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const summarizeWorkspace = useCallback(async (workspaceId) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/ai/${workspaceId}/summary`);
      return { success: true, summary: data.summary };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const previewBreakdown = useCallback(async (taskId) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/ai/tasks/${taskId}/breakdown/preview`);
      return { success: true, suggestions: data.suggestions };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const applyBreakdown = useCallback(async (taskId, subtasks) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/ai/tasks/${taskId}/breakdown/apply`, { subtasks });
      return { success: true, tasks: data.tasks, message: data.message };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const askAssistant = useCallback(async (workspaceId, question) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/ai/${workspaceId}/assistant`, { question });
      return { success: true, reply: data.reply };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, summarizeWorkspace, previewBreakdown, applyBreakdown, askAssistant };
}