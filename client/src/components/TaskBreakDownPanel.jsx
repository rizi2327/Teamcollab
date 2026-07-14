// src/components/TaskBreakdownPanel.jsx
// Feature 8.1 — "✨ Break down with AI" section inside TaskDetailModal
// Two-step flow: preview suggestions (nothing saved) → user edits/deselects → apply (creates real Tasks)

import { useState } from 'react';
import { useAI } from '../hooks/useAI';

export default function TaskBreakdownPanel({ taskId, onSubtasksCreated }) {
  const { loading, error, previewBreakdown, applyBreakdown } = useAI();
  const [suggestions, setSuggestions] = useState(null); // null = not yet generated
  const [checked, setChecked] = useState({});
  const [applying, setApplying] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  const generate = async () => {
    setDoneMsg('');
    const result = await previewBreakdown(taskId);
    if (result.success) {
      setSuggestions(result.suggestions);
      setChecked(Object.fromEntries(result.suggestions.map((_, i) => [i, true])));
    }
  };

  const toggle = (i) => setChecked((c) => ({ ...c, [i]: !c[i] }));

  const updateText = (i, text) => {
    setSuggestions((s) => s.map((t, idx) => (idx === i ? text : t)));
  };

  const handleApply = async () => {
    const selected = suggestions.filter((_, i) => checked[i]).map((t) => t.trim()).filter(Boolean);
    if (selected.length === 0) return;
    setApplying(true);
    const result = await applyBreakdown(taskId, selected);
    setApplying(false);
    if (result.success) {
      setDoneMsg(result.message);
      setSuggestions(null);
      onSubtasksCreated?.();
    }
  };

  const selectedCount = suggestions ? suggestions.filter((_, i) => checked[i]).length : 0;

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <span style={styles.label}>✨ Break down with AI</span>
        {!suggestions && (
          <button onClick={generate} disabled={loading} style={styles.generateBtn}>
            {loading ? 'Thinking…' : 'Suggest subtasks'}
          </button>
        )}
      </div>

      {error && <p style={styles.errorText}>⚠ {error}</p>}
      {doneMsg && <p style={styles.successText}>✓ {doneMsg}</p>}

      {suggestions && (
        <div style={styles.suggestionsBox}>
          <p style={styles.helperText}>Review, edit, or uncheck any before adding them to the board:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {suggestions.map((title, i) => (
              <label key={i} style={styles.suggestionRow}>
                <input type="checkbox" checked={!!checked[i]} onChange={() => toggle(i)} style={{ marginTop: 2 }} />
                <input
                  value={title}
                  onChange={(e) => updateText(i, e.target.value)}
                  style={styles.suggestionInput}
                />
              </label>
            ))}
          </div>

          <div style={styles.actionsRow}>
            <button onClick={() => setSuggestions(null)} style={styles.cancelBtn}>Cancel</button>
            <button onClick={handleApply} disabled={applying || selectedCount === 0} style={styles.applyBtn}>
              {applying ? 'Adding…' : `Add ${selectedCount} subtask${selectedCount === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  generateBtn: {
    padding: '6px 12px', borderRadius: 8, background: '#F0EEFF', color: '#6C63FF',
    border: '1.5px solid #D4D0FF', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  errorText: { fontSize: 12, color: '#A32D2D', margin: 0 },
  successText: { fontSize: 12, color: '#3B6D11', margin: 0, fontWeight: 500 },
  suggestionsBox: {
    display: 'flex', flexDirection: 'column', gap: 10, background: '#FAFAFE',
    border: '1px solid #E0DFF5', borderRadius: 10, padding: 12,
  },
  helperText: { fontSize: 11.5, color: '#999', margin: 0 },
  suggestionRow: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  suggestionInput: {
    flex: 1, fontSize: 12.5, padding: '6px 8px', borderRadius: 7,
    border: '1px solid #E0DFF5', outline: 'none', color: '#333',
  },
  actionsRow: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  cancelBtn: {
    padding: '7px 12px', borderRadius: 8, background: 'transparent', color: '#888',
    border: '1.5px solid #E0DFF5', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  applyBtn: {
    padding: '7px 14px', borderRadius: 8, background: '#6C63FF', color: '#fff',
    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
};