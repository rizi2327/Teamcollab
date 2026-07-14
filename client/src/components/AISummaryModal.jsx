// src/components/AISummaryModal.jsx
// Feature 8.1 — "✨ AI Summary" modal, opened from the WorkspaceView top bar

import { useEffect, useState } from 'react';
import { useAI } from '../hooks/useAI';

export default function AISummaryModal({ isOpen, onClose, workspaceId, workspaceName }) {
  const { loading, error, summarizeWorkspace } = useAI();
  const [summary, setSummary] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const generate = async () => {
    const result = await summarizeWorkspace(workspaceId);
    if (result.success) setSummary(result.summary);
    setHasLoaded(true);
  };

  useEffect(() => {
    if (isOpen && !hasLoaded) generate();
    if (!isOpen) { setSummary(''); setHasLoaded(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <p style={styles.title}>✨ AI Summary</p>
            <p style={styles.subtitle}>{workspaceName}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {loading && (
            <div style={styles.loadingWrap}>
              <Spinner />
              <span>Reading the board…</span>
            </div>
          )}

          {!loading && error && (
            <div style={styles.errorBox}>⚠ {error}</div>
          )}

          {!loading && !error && summary && (
            <p style={styles.summaryText}>{summary}</p>
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={generate} disabled={loading} style={styles.regenBtn}>
            {loading ? 'Generating…' : '↻ Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'tc-spin 0.8s linear infinite' }}>
      <style>{`@keyframes tc-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#6C63FF" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#6C63FF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(20,18,40,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
    fontFamily: "'Geist', 'DM Sans', sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '18px 20px 14px', borderBottom: '1px solid #F0EEF5',
  },
  title: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  subtitle: { fontSize: 12.5, color: '#999', margin: '3px 0 0' },
  closeBtn: {
    background: '#F5F5FB', border: 'none', borderRadius: 8, width: 28, height: 28,
    cursor: 'pointer', color: '#888', fontSize: 13,
  },
  body: { padding: '18px 20px', minHeight: 100, display: 'flex', alignItems: 'center' },
  loadingWrap: { display: 'flex', alignItems: 'center', gap: 10, color: '#6C63FF', fontSize: 13, fontWeight: 500 },
  errorBox: {
    width: '100%', padding: '11px 14px', borderRadius: 10, background: '#FCEBEB',
    border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 13, fontWeight: 500,
  },
  summaryText: { fontSize: 13.5, lineHeight: 1.65, color: '#333', margin: 0 },
  footer: { padding: '12px 20px 18px', display: 'flex', justifyContent: 'flex-end' },
  regenBtn: {
    padding: '8px 14px', borderRadius: 9, background: '#F5F5FB', color: '#6C63FF',
    border: '1.5px solid #E0DFF5', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
  },
};