// src/components/ChatMessage.jsx — updated for Feature 4.3
// CHANGE: accepts senderOnline prop and shows an OnlineDot next to the sender name

import OnlineDot from './OnlineDot';
import '../styles/ChatMessage.css';

function Avatar({ name, size = 28 }) {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="cm-avatar"
      style={{
        '--avatar-size': `${size}px`,
        '--avatar-color': color,
        '--avatar-font-size': `${size * 0.4}px`,
      }}
    >
      {initials}
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday)     return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

export default function ChatMessage({
  message, isOwn, showAvatar, showDateDivider, dateLabel,
  senderOnline = false,  // ← NEW 4.3
}) {
  const isOptimistic = message._optimistic;
  const side = isOwn ? 'own' : 'theirs';

  return (
    <>
      {/* ── Date divider ── */}
      {showDateDivider && (
        <div className="cm-date-divider">
          <div className="cm-date-divider-line" />
          <span className="cm-date-divider-label">{dateLabel}</span>
          <div className="cm-date-divider-line" />
        </div>
      )}

      {/* ── Message row ── */}
      <div className={`cm-row ${side}`}>
        {/* Avatar with online dot — left side for others only */}
        {!isOwn && (
          <div className="cm-avatar-slot">
            {showAvatar && (
              <div className="cm-avatar-wrap">
                <Avatar name={message.sender?.name} size={28} />
                {/* ── Online dot on avatar ── NEW 4.3 ── */}
                <OnlineDot
                  online={senderOnline}
                  size={8}
                  pulse={false}
                  className="cm-avatar-dot"
                />
              </div>
            )}
          </div>
        )}

        <div className={`cm-bubble-col ${side}`}>
          {/* Sender name + online status — only on first in a run, others only */}
          {!isOwn && showAvatar && (
            <div className="cm-sender-row">
              <span className="cm-sender-name">
                {message.sender?.name || 'Unknown'}
              </span>
              {/* ── "Online" text label next to name ── NEW 4.3 ── */}
              {senderOnline && (
                <span className="cm-sender-online-label">· online</span>
              )}
            </div>
          )}

          {/* Bubble */}
          <div className={`cm-bubble ${side} ${isOptimistic ? 'optimistic' : ''}`}>
            {message.text}
          </div>

          {/* Timestamp */}
          <span className={`cm-timestamp ${side}`}>
            {isOptimistic ? 'Sending…' : formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </>
  );
}