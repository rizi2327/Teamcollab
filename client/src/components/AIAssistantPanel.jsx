// src/components/AIAssistantPanel.jsx
// Feature 8.1 — "🤖 Ask AI" slide-over panel, grounded in the workspace's
// recent chat history. Single question/answer at a time — not a persistent
// multi-turn thread, since the backend re-derives context from chat history
// on every call rather than tracking a conversation server-side.

import { useState } from 'react';
import { useAI } from '../hooks/useAI';

export default function AIAssistantPanel({ isOpen, onClose, workspaceId }) {
  const { loading, error, askAssistant } = useAI();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]); // [{ question, reply }]

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    const result = await askAssistant(workspaceId, q);
    setHistory((h) => [...h, { question: q, reply: result.success ? result.reply : `⚠ ${result.message}` }]);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <p style={styles.title}>🤖 Ask AI</p>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      <p style={styles.hint}>Grounded in this workspace's recent chat — ask about decisions, blockers, or what's been discussed.</p>

      <div style={styles.thread}>
        {history.length === 0 && !loading && (
          <p style={styles.emptyState}>No questions yet — try "what's blocking the launch task?"</p>
        )}
        {history.map((turn, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={styles.questionBubble}>{turn.question}</div>
            <div style={styles.replyBubble}>{turn.reply}</div>
          </div>
        ))}
        {loading && <div style={styles.replyBubble}>Thinking…</div>}
      </div>

      {error && !loading && <p style={styles.errorText}>⚠ {error}</p>}

      <div style={styles.inputRow}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleAsk(); }}
          placeholder="Ask something about this workspace…"
          style={styles.input}
        />
        <button onClick={handleAsk} disabled={loading || !question.trim()} style={styles.sendBtn}>
          {loading ? '…' : '➤'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 340, maxWidth: '90vw',
    background: '#fff', boxShadow: '-6px 0 30px rgba(0,0,0,0.10)', zIndex: 150,
    display: 'flex', flexDirection: 'column', padding: '18px 18px 16px',
    fontFamily: "'Geist', 'DM Sans', sans-serif",
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  closeBtn: {
    background: '#F5F5FB', border: 'none', borderRadius: 8, width: 26, height: 26,
    cursor: 'pointer', color: '#888', fontSize: 12,
  },
  hint: { fontSize: 11.5, color: '#aaa', margin: '8px 0 14px', lineHeight: 1.5 },
  thread: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 },
  emptyState: { fontSize: 12.5, color: '#bbb', textAlign: 'center', marginTop: 30 },
  questionBubble: {
    alignSelf: 'flex-end', maxWidth: '85%', background: '#6C63FF', color: '#fff',
    padding: '8px 12px', borderRadius: '12px 12px 3px 12px', fontSize: 13, lineHeight: 1.4,
  },
  replyBubble: {
    alignSelf: 'flex-start', maxWidth: '90%', background: '#F5F5FB', color: '#1a1a2e',
    padding: '9px 12px', borderRadius: '12px 12px 12px 3px', fontSize: 13, lineHeight: 1.5,
  },
  errorText: { fontSize: 12, color: '#A32D2D', margin: '8px 0 0' },
  inputRow: { display: 'flex', gap: 8, marginTop: 12 },
  input: {
    flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E0DFF5',
    fontSize: 13, outline: 'none',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10, background: '#6C63FF', color: '#fff',
    border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0,
  },
};