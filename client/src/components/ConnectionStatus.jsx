// src/components/ConnectionStatus.jsx
// Feature 4.1 — Small indicator showing the socket connection state.
// Shown in the AppLayout top bar so users always know if they're live.
// Disappears when connected (no noise in the normal happy path).

import { useSocket } from '../context/SocketContext';

const CONFIG = {
  idle:         { dot: '#bbb',    text: '',                    show: false },
  connecting:   { dot: '#EF9F27', text: 'Connecting…',         show: true  },
  connected:    { dot: '#5FA021', text: 'Live',                show: false }, // hidden when all good
  disconnected: { dot: '#E24B4A', text: 'Reconnecting…',       show: true  },
  error:        { dot: '#E24B4A', text: 'Connection lost',      show: true  },
};

export default function ConnectionStatus() {
  const { status, connError } = useSocket();
  const cfg = CONFIG[status] || CONFIG.idle;

  if (!cfg.show) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: status === 'error' ? '#FCEBEB' : '#FFF4E0',
      border: `1px solid ${status === 'error' ? '#F7C1C1' : '#FCE0A8'}`,
    }}>
      {/* Pulsing dot */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: cfg.dot,
        boxShadow: `0 0 0 0 ${cfg.dot}`,
        animation: status === 'connecting' || status === 'disconnected'
          ? 'tc-pulse-dot 1.2s infinite' : 'none',
      }} />
      <style>{`
        @keyframes tc-pulse-dot {
          0%   { box-shadow: 0 0 0 0 rgba(239,159,39,.7); }
          70%  { box-shadow: 0 0 0 6px rgba(239,159,39,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,159,39,0); }
        }
      `}</style>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: status === 'error' ? '#A32D2D' : '#854F0B',
      }}>
        {cfg.text}
        {status === 'error' && connError ? ` — ${connError.split(':')[1]?.trim() || ''}` : ''}
      </span>
    </div>
  );
}