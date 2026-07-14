// src/components/NotificationItem.jsx
// Feature 5.1 — Single notification row in the dropdown.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Type → icon mapping ───────────────────────────────────────────────────────
const TYPE_ICONS = {
  task_assigned:        '📋',
  task_status_changed:  '🔄',
  message_received:     '💬',
  invite_received:      '✉️',
  invite_accepted:      '🎉',
  member_removed:       '👋',
};

function Avatar({ name, size = 32 }) {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationItem({ notification, onMarkRead, onDelete, onClose }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);

  const handleClick = () => {
    if (!notification.read) onMarkRead(notification._id);

    // Deep-link based on notification type
    if (notification.workspace) {
      const workspaceId = notification.workspace._id || notification.workspace;
      navigate(`/workspaces/${workspaceId}`);
      onClose?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', gap: 10, padding: '12px 16px',
        background: !notification.read ? '#F8F7FF' : hover ? '#FAFAFE' : 'transparent',
        cursor: 'pointer', position: 'relative',
        borderLeft: !notification.read ? '3px solid #6C63FF' : '3px solid transparent',
        transition: 'background .12s',
      }}
    >
      {/* Icon/Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {notification.actor ? (
          <Avatar name={notification.actor.name} size={36} />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#F0EEF5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>
            {TYPE_ICONS[notification.type] || '🔔'}
          </div>
        )}
        {/* Type badge overlay */}
        <span style={{
          position: 'absolute', bottom: -2, right: -2,
          fontSize: 11, background: '#fff', borderRadius: '50%',
          width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #F0EEF5',
        }}>
          {TYPE_ICONS[notification.type] || '🔔'}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, color: '#1a1a2e', margin: 0, lineHeight: 1.45,
          fontWeight: !notification.read ? 500 : 400,
        }}>
          {notification.message}
        </p>
        <p style={{ fontSize: 11, color: '#aaa', margin: '4px 0 0' }}>
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Delete button — appears on hover */}
      {hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification._id); }}
          title="Delete"
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 20, height: 20, borderRadius: 6,
            background: '#F5F5FB', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#aaa', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}

      {/* Unread dot */}
      {!notification.read && !hover && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          width: 7, height: 7, borderRadius: '50%', background: '#6C63FF',
        }} />
      )}
    </div>
  );
}