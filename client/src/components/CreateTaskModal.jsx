// src/components/CreateTaskModal.jsx
// Feature 3.1 — Modal for creating a new task inside the active workspace.
//
// Props:
//   isOpen     {boolean}
//   onClose    {() => void}
//   workspace  {object}            — needs _id, members[]
//   onCreate   {(task) => void}    — called with the new task on success

import { useState, useEffect, useRef } from 'react';
import { useTask } from '../hooks/useTask';
import '../styles/CreateTaskModal.css';

// ── Priority options ──────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#3B6D11', bg: '#EAF3DE' },
  { value: 'medium', label: 'Medium', color: '#854F0B', bg: '#FFF4E0' },
  { value: 'high',   label: 'High',   color: '#A32D2D', bg: '#FCEBEB' },
];

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 26 }) {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="tc-avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

function Spin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="tc-spin">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CharCount({ current, max }) {
  const pct = current / max;
  return (
    <span className={`tc-char-count${pct > 0.85 ? ' tc-char-count--warning' : ''}`}>
      {current}/{max}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function CreateTaskModal({ isOpen, onClose, workspace, onCreate }) {
  const { createTask, loading } = useTask();
  const titleRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '',
  });
  const [errors, setErrors]       = useState({});
  const [serverErr, setServerErr] = useState('');

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setForm({ title: '', description: '', priority: 'medium', assignedTo: '', dueDate: '' });
      setErrors({});
      setServerErr('');
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.title.trim() || form.title.trim().length < 2)
      errs.title = 'Title must be at least 2 characters';
    if (form.title.trim().length > 120)
      errs.title = 'Title cannot exceed 120 characters';
    if (form.description.length > 2000)
      errs.description = 'Description cannot exceed 2000 characters';
    if (form.dueDate) {
      const d = new Date(form.dueDate);
      if (isNaN(d.getTime())) errs.dueDate = 'Invalid date';
    }
    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setServerErr('');
    const result = await createTask({
      title:       form.title.trim(),
      description: form.description.trim(),
      priority:    form.priority,
      assignedTo:  form.assignedTo || undefined,
      workspace:   workspace._id,
      dueDate:     form.dueDate || undefined,
    });

    if (result.success) {
      onCreate?.(result.task);
      onClose();
    } else {
      setServerErr(result.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) handleSubmit(); // Cmd/Ctrl+Enter to submit
  };

  if (!isOpen || !workspace) return null;

  const members = workspace.members || [];

  return (
    <>
      <div onClick={onClose} className="tc-backdrop" />

      <div onKeyDown={handleKeyDown} className="tc-modal">
        {/* ── Header ── */}
        <div className="tc-header">
          <div>
            <h2 className="tc-title">New task</h2>
            <p className="tc-subtitle">
              in <strong>{workspace.icon} {workspace.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="tc-close-btn">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="tc-body">

          {/* Title */}
          <div className="tc-field">
            <div className="tc-field-row">
              <label className="tc-label">Title <span className="tc-required">*</span></label>
              <CharCount current={form.title.length} max={120} />
            </div>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
              placeholder="e.g. Design the onboarding flow"
              maxLength={120}
              className={`tc-input${errors.title ? ' tc-input--error' : ''}`}
            />
            {errors.title && <span className="tc-error-text">{errors.title}</span>}
          </div>

          {/* Description */}
          <div className="tc-field">
            <div className="tc-field-row">
              <label className="tc-label">Description <span className="tc-optional">(optional)</span></label>
              <CharCount current={form.description.length} max={2000} />
            </div>
            <textarea
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="Add more context, links, or acceptance criteria…"
              maxLength={2000}
              rows={4}
              className={`tc-input tc-textarea${errors.description ? ' tc-input--error' : ''}`}
            />
            {errors.description && <span className="tc-error-text">{errors.description}</span>}
          </div>

          {/* Priority pills */}
          <div>
            <label className="tc-label">Priority</label>
            <div className="tc-priority-group">
              {PRIORITIES.map((p) => {
                const active = form.priority === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => set('priority')(p.value)}
                    className="tc-priority-pill"
                    style={active ? {
                      border: `1.5px solid ${p.color}`,
                      background: p.bg,
                      color: p.color,
                    } : undefined}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assignee + Due date row */}
          <div className="tc-row">
            {/* Assignee */}
            <div className="tc-field">
              <label className="tc-label">Assignee</label>
              <select
                value={form.assignedTo}
                onChange={(e) => set('assignedTo')(e.target.value)}
                className="tc-input tc-select"
              >
                <option value="">Unassigned</option>
                {members.map((m) => {
                  const u = m.user;
                  const id = u?._id || u;
                  return (
                    <option key={id} value={id}>
                      {u?.name || 'Unknown'}{u?.name ? '' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Due date */}
            <div className="tc-field">
              <label className="tc-label">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate')(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`tc-input${errors.dueDate ? ' tc-input--error' : ''}`}
              />
              {errors.dueDate && <span className="tc-error-text">{errors.dueDate}</span>}
            </div>
          </div>

          {/* Assignee preview chip */}
          {form.assignedTo && (
            <div className="tc-assignee-chip">
              {(() => {
                const m = members.find((m) => (m.user?._id || m.user) === form.assignedTo);
                return (
                  <>
                    <Avatar name={m?.user?.name} size={24} />
                    <span className="tc-assignee-chip-text">
                      Assigned to <strong>{m?.user?.name}</strong>
                    </span>
                  </>
                );
              })()}
            </div>
          )}

          {/* Server error */}
          {serverErr && (
            <div className="tc-error-banner">⚠ {serverErr}</div>
          )}

          {/* Footer */}
          <div className="tc-footer">
            <button onClick={onClose} className="tc-btn-ghost">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`tc-btn-primary${loading ? ' tc-btn-primary--loading' : ''}`}
            >
              {loading ? <><Spin /> Creating…</> : '+ Create task'}
            </button>
          </div>
          <p className="tc-tip">
            Tip: ⌘ + Enter to submit
          </p>
        </div>
      </div>
    </>
  );
}