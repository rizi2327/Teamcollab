// src/pages/SocketTest.jsx
// Feature 4.1 — Temporary dev-only page for verifying the socket connection.
// Visit /socket-test while logged in to confirm the full handshake works.
// DELETE this page before production deployment (or guard it behind a dev flag).

import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useAuthContext } from '../context/AuthContext';
import '../styles/SocketTest.css';

export default function SocketTest() {
  const { user } = useAuthContext();
  const { connected, status, connError, joinWorkspace, leaveWorkspace, emit } = useSocket();
  const [log, setLog] = useState([]);
  const [wsId, setWsId] = useState('');

  const addLog = (msg, type = 'info') => {
    setLog((prev) => [{ msg, type, ts: new Date().toLocaleTimeString() }, ...prev.slice(0, 49)]);
  };

  // Listen for workspace events to confirm the room join works
  useSocketEvent('user-joined-workspace', (data) => addLog(`👤 ${data.name} joined workspace`, 'success'));
  useSocketEvent('user-left-workspace',   (data) => addLog(`👋 ${data.name} left workspace`, 'warn'));
  useSocketEvent('user-went-offline',     (data) => addLog(`⚡ ${data.name} went offline`, 'warn'));
  useSocketEvent('workspace-online-users', (data) => addLog(`Online users: [${data.onlineUserIds.join(', ')}]`, 'info'));

  const handleJoin = () => {
    if (!wsId.trim()) return;
    joinWorkspace(wsId.trim());
    addLog(`📡 Sent join-workspace for: ${wsId.trim()}`, 'info');
  };

  const handleLeave = () => {
    if (!wsId.trim()) return;
    leaveWorkspace(wsId.trim());
    addLog(`🚪 Sent leave-workspace for: ${wsId.trim()}`, 'info');
  };

  const statusColor = {
    idle: '#bbb', connecting: '#EF9F27', connected: '#5FA021',
    disconnected: '#E24B4A', error: '#E24B4A',
  }[status] || '#bbb';

  const logColor = (type) =>
    type === 'success' ? '#3B6D11' : type === 'warn' ? '#854F0B' : '#555';

  return (
    <div className="st-page">
      <div className="st-container">

        {/* Header */}
        <div className="st-card">
          <h1 className="st-title">Socket.io Connection Test</h1>
          <p className="st-subtitle">Feature 4.1 — dev only. Delete before production.</p>
        </div>

        {/* Status */}
        <div className="st-card">
          <p className="st-section-label">Connection Status</p>
          <div className="st-status-row">
            <div className="st-status-dot" style={{ '--status-color': statusColor }} />
            <span className="st-status-text">{status}</span>
            {connError && <span className="st-status-error">— {connError}</span>}
          </div>
          <div className="st-user-info">
            <p className="st-user-info__text">User: <strong>{user?.name}</strong> ({user?.email})</p>
          </div>
        </div>

        {/* Room controls */}
        <div className="st-card">
          <p className="st-section-label">Join / Leave Workspace Room</p>
          <div className="st-room-row">
            <input
              value={wsId}
              onChange={(e) => setWsId(e.target.value)}
              placeholder="Paste a workspace _id here"
              className="st-room-input"
            />
            <button onClick={handleJoin} disabled={!connected} className="st-join-btn">
              Join
            </button>
            <button onClick={handleLeave} disabled={!connected} className="st-leave-btn">
              Leave
            </button>
          </div>
        </div>

        {/* Event log */}
        <div className="st-card">
          <div className="st-log-header">
            <p className="st-section-label">Event Log</p>
            <button onClick={() => setLog([])} className="st-log-clear-btn">Clear</button>
          </div>
          <div className="st-log-list">
            {log.length === 0 ? (
              <p className="st-log-empty">No events yet</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className="st-log-entry">
                  <span className="st-log-entry__ts">{entry.ts}</span>
                  <span className="st-log-entry__msg" style={{ '--log-color': logColor(entry.type) }}>
                    {entry.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="st-footer-note">
          This page is for development only — remove before shipping
        </p>
      </div>
    </div>
  );
}