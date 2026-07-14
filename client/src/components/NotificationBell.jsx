// src/components/NotificationBell.jsx
// Feature 5.1 — Bell icon with unread badge, opens the dropdown panel.
// Placed in the Sidebar header (or top bar) of the app layout.

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem     from './NotificationItem';

export default function NotificationBell() {
  const {
    notifications, unreadCount, loading, hasMore,
    fetchNotifications, loadMore, markAsRead, markAllAsRead, deleteNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef   = useRef(null);

  // ── Load full list when dropdown opens ────────────────────────────────────
  useEffect(() => {
    if (open) fetchNotifications(1);
  }, [open]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // ── Close on Escape ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Bell button ── */}
      <button
        ref={btnRef}
        onClick={() => setOpen((p) => !p)}
        title="Notifications"
        style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 10,
          background: open ? '#F0EEFF' : '#F5F5FB',
          border: open ? '1.5px solid #D4D0FF' : '1.5px solid #E0DFF5',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .15s, border-color .15s',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            stroke={open ? '#6C63FF' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke={open ? '#6C63FF' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 16, height: 16, padding: '0 3px',
            borderRadius: 20, background: '#E24B4A', color: '#fff',
            fontSize: 9.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 44, right: 0, zIndex: 500,
            width: 360, maxHeight: 480,
            background: '#fff', borderRadius: 16,
            border: '1px solid #E0DFF5',
            boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
            animation: 'tc-dropdownIn .15s ease',
          }}
        >
          <style>{`@keyframes tc-dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid #F0EEF5', flexShrink: 0,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{ fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#bbb' }}>Loading…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 32 }}>🔔</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>You're all caught up</p>
                <p style={{ fontSize: 12, color: '#999', margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onMarkRead={markAsRead}
                  onDelete={deleteNotification}
                  onClose={() => setOpen(false)}
                />
              ))
            )}

            {hasMore && (
              <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  style={{ fontSize: 12, color: '#6C63FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}