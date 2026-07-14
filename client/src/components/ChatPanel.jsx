// src/components/ChatPanel.jsx — updated for Feature 4.3
// CHANGE: accepts onlineIds prop and shows a green dot next to online senders

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat }        from '../hooks/useChat';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSocket }      from '../context/SocketContext';
import ChatMessage        from './ChatMessage';
import OnlineDot          from './OnlineDot';   // ← NEW 4.3
import '../styles/ChatPanel.css';

function TypingIndicator({ names }) {
  if (!names.length) return null;
  const label = names.length === 1 ? `${names[0]} is typing…` : `${names.slice(0, 2).join(', ')} are typing…`;
  return (
    <div className="cp-typing">
      <div className="cp-typing-dots">
        {[0, 1, 2].map((i) => (
          <span key={i} className="cp-typing-dot" />
        ))}
      </div>
      <span className="cp-typing-label">{label}</span>
    </div>
  );
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())       return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ChatPanel({ workspace, currentUser, isOpen, onClose, onlineIds = new Set() }) {
  const { joinWorkspace, connected, emit } = useSocket();
  const {
    messages, historyLoading, hasMore, sendError,
    loadHistory, loadMore, sendMessage, handleIncomingMessage,
  } = useChat(workspace?._id);

  const [input, setInput]             = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const listRef    = useRef(null);
  const isAtBottom = useRef(true);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    if (!workspace?._id || !isOpen || !connected) return;
    joinWorkspace(workspace._id);
    loadHistory(1);
  }, [workspace?._id, isOpen, connected]);

  useSocketEvent('new-message', handleIncomingMessage);

  useSocketEvent('user-typing', ({ userId, name }) => {
    if (userId === currentUser?._id) return;
    setTypingUsers((prev) => {
      if (prev[userId]?.timeout) clearTimeout(prev[userId].timeout);
      const timeout = setTimeout(() => {
        setTypingUsers((p) => { const n = { ...p }; delete n[userId]; return n; });
      }, 3000);
      return { ...prev, [userId]: { name, timeout } };
    });
  });

  useSocketEvent('user-stopped-typing', ({ userId }) => {
    setTypingUsers((prev) => {
      const next = { ...prev };
      if (next[userId]?.timeout) clearTimeout(next[userId].timeout);
      delete next[userId];
      return next;
    });
  });

  useEffect(() => {
    if (isAtBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!connected) return;
    emit('typing', { workspaceId: workspace._id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emit('stop-typing', { workspaceId: workspace._id }), 1500);
  };

  if (!isOpen) return null;

  const typingNames = Object.values(typingUsers).map((u) => u.name);

  // Count online members (excluding current user) for the header
  const onlineOthers = workspace?.members?.filter((m) => {
    const mid = m.user?._id || m.user;
    return mid !== currentUser?._id && onlineIds.has(mid?.toString());
  }).length ?? 0;

  const canSend = !!input.trim() && connected;

  let lastDate = '';
  let lastSenderId = '';

  return (
    <div className="cp-panel">
      {/* ── Header ── */}
      <div className="cp-header">
        <div className="cp-header-left">
          <span className="cp-header-icon">💬</span>
          <span className="cp-header-title">Chat</span>
          {/* ── Online count in header ── NEW 4.3 ── */}
          {onlineOthers > 0 && (
            <div className="cp-online-count">
              <OnlineDot online={true} size={6} />
              <span className="cp-online-count-text">{onlineOthers} online</span>
            </div>
          )}
          {!connected && (
            <span className="cp-offline-badge">Offline</span>
          )}
        </div>
        <button onClick={onClose} className="cp-close-btn">✕</button>
      </div>

      {/* ── Load more ── */}
      {hasMore && (
        <div className="cp-load-more-wrap">
          <button onClick={loadMore} disabled={historyLoading} className="cp-load-more-btn">
            {historyLoading ? 'Loading…' : '↑ Load earlier messages'}
          </button>
        </div>
      )}

      {/* ── Message list ── */}
      <div ref={listRef} onScroll={handleScroll} className="cp-list">
        {historyLoading && messages.length === 0 ? (
          <div className="cp-list-center">
            <p className="cp-list-loading-text">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="cp-empty-state">
            <span className="cp-empty-icon">💬</span>
            <p className="cp-empty-title">No messages yet</p>
            <p className="cp-empty-desc">Say hello to your team!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const senderId = msg.sender?._id || msg.sender;
            const isOwn = senderId === currentUser?._id;
            const msgDate = new Date(msg.createdAt).toDateString();
            const showDateDivider = msgDate !== lastDate;
            const dateLabel = showDateDivider ? formatDateLabel(msg.createdAt) : '';
            if (showDateDivider) lastDate = msgDate;
            const showAvatar = senderId !== lastSenderId || showDateDivider;
            lastSenderId = senderId || '';

            return (
              <ChatMessage
                key={msg._id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                showDateDivider={showDateDivider}
                dateLabel={dateLabel}
                // ── NEW 4.3: pass online status for sender ──
                senderOnline={!isOwn && onlineIds.has(senderId?.toString())}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <TypingIndicator names={typingNames} />

      {sendError && <div className="cp-send-error">⚠ {sendError}</div>}

      {/* ── Input ── */}
      <div className="cp-input-area">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={connected ? 'Message…' : 'Connecting…'}
          disabled={!connected}
          rows={1}
          maxLength={2000}
          className={`cp-textarea ${!connected ? 'disconnected' : ''}`}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`cp-send-btn ${canSend ? 'active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke={canSend ? '#fff' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={canSend ? '#fff' : '#bbb'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}