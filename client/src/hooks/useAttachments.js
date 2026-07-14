// src/hooks/useAttachments.js
// Feature 7.1 — upload/delete task attachments
//
// Separate from useTask.js because uploads need multipart/form-data and
// progress tracking, which is different enough from the plain JSON
// create/update/delete calls to warrant its own hook.

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useAttachments() {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  // ── Upload a file to a task ──────────────────────────────────────────────
  const uploadAttachment = useCallback(async (taskId, file) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(`${API_URL}/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      return { success: true, attachment: data.attachment };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload file';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  // ── Delete an attachment ─────────────────────────────────────────────────
  const deleteAttachment = useCallback(async (taskId, attachmentId) => {
    setDeletingId(attachmentId);
    setError(null);
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}/attachments/${attachmentId}`);
      return { success: true, attachmentId };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete file';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setDeletingId(null);
    }
  }, []);

  return { uploading, progress, deletingId, error, uploadAttachment, deleteAttachment };
}