// src/hooks/useNotifications.js
// Feature 5.1 — Manages the notification list, unread count, and
// live updates via the 'new-notification' socket event.

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocketEvent } from './useSocketEvent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [page,          setPage]          = useState(1);

  // ── Fetch unread count only (lightweight, called on app load) ────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/notifications/unread-count`);
      setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err.message);
    }
  }, []);

  // ── Fetch full notification list (called when dropdown opens) ────────────
  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/notifications`, {
        params: { page: pageNum, limit: 20 },
      });
      if (pageNum === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      setUnreadCount(data.unreadCount);
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) fetchNotifications(page + 1);
  }, [hasMore, loading, page, fetchNotifications]);

  // ── Mark one as read ───────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await axios.patch(`${API_URL}/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark as read:', err.message);
    }
  }, []);

  // ── Mark all as read ─────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await axios.patch(`${API_URL}/notifications/mark-all-read`);
    } catch (err) {
      console.error('Failed to mark all as read:', err.message);
    }
  }, []);

  // ── Delete a notification ────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    const wasUnread = notifications.find((n) => n._id === id)?.read === false;
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await axios.delete(`${API_URL}/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification:', err.message);
    }
  }, [notifications]);

  // ── Receive new notifications live via socket ────────────────────────────
  useSocketEvent('new-notification', useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []));

  // ── Fetch unread count once on mount ──────────────────────────────────────
  useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}