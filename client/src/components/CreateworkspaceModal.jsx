// src/components/CreateWorkspaceModal.jsx
// Feature 2.1 — Modal for creating a new workspace
//
// Props:
//   isOpen   {boolean}           — controls visibility
//   onClose  {() => void}        — called when modal should close
//   onCreate {(workspace) => void} — called with the new workspace on success

import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import '../styles/CreateWorkspaceModal.css';

// ── Preset icons ──────────────────────────────────────────────────────────────
const ICONS = ['🏢', '🚀', '💡', '🎯', '🛠️', '📊', '🎨', '📱', '🌐', '🔥', '⚡', '🌟'];

// ── Preset colors ─────────────────────────────────────────────────────────────
const COLORS = [
  '#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11',
  '#185FA5', '#993556', '#0F6E56', '#444441',
  '#854F0B', '#3C3489', '#A32D2D', '#27500A',
];

// ── Character counter ─────────────────────────────────────────────────────────
function CharCount({ current, max }) {
  const pct = current / max;
  return (
    <span className={`cwm-char-count ${pct > 0.85 ? 'cwm-char-count--warning' : ''}`}>
      {current}/{max}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="cwm-spinner">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function CreateWorkspaceModal({ isOpen, onClose, onCreate }) {
  const { createWorkspace, loading } = useWorkspace();
  const nameRef = useRef(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm]     = useState({
    name: '', description: '', icon: '🏢', color: '#6C63FF',
  });
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [step, setStep]     = useState(1);   // 1 = details, 2 = appearance

  // ── Reset form when modal opens ────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setForm({ name: '', description: '', icon: '🏢', color: '#6C63FF' });
      setErrors({});
      setServerErr('');
      setStep(1);
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // ── Close on Escape key ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Field update helper ────────────────────────────────────────────────────
  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  // ── Step 1 validation ──────────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters';
    if (form.name.trim().length > 50)
      errs.name = 'Name cannot exceed 50 characters';
    if (form.description.length > 200)
      errs.description = 'Description cannot exceed 200 characters';
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep1();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setServerErr('');
    const result = await createWorkspace(form);
    if (result.success) {
      onCreate?.(result.workspace);
      onClose();
    } else {
      setServerErr(result.message);
    }
  };

  // ── Keyboard: Enter moves through steps ───────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (step === 1) handleNext();
      else            handleSubmit();
    }
  };

  if (!isOpen) return null;

  // ── Preview card ───────────────────────────────────────────────────────────
  const PreviewCard = () => (
    <div
      className="cwm-preview-card"
      style={{
        background: form.color + '15',
        border: `1.5px solid ${form.color}40`,
      }}
    >
      <div className="cwm-preview-icon" style={{ background: form.color }}>
        {form.icon}
      </div>
      <div className="cwm-preview-text">
        <p className="cwm-preview-name">
          {form.name || 'Workspace name'}
        </p>
        <p className="cwm-preview-desc">
          {form.description || 'No description'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Backdrop ── */}
      <div onClick={onClose} className="cwm-backdrop" />

      {/* ── Modal ── */}
      <div onKeyDown={handleKeyDown} className="cwm-modal">
        {/* ── Header ── */}
        <div className="cwm-header">
          <div>
            <h2 className="cwm-header-title">
              {step === 1 ? 'Create a workspace' : 'Customize appearance'}
            </h2>
            <p className="cwm-header-subtitle">
              {step === 1
                ? 'Give your workspace a name and description'
                : 'Pick an icon and color for the sidebar'}
            </p>
          </div>
          <button onClick={onClose} className="cwm-close-btn">✕</button>
        </div>

        {/* ── Step indicator ── */}
        <div className="cwm-steps">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`cwm-step-bar ${s <= step ? 'cwm-step-bar--active' : ''}`}
            />
          ))}
        </div>

        {/* ── Body ── */}
        <div className="cwm-body">

          {/* ── STEP 1: Details ── */}
          {step === 1 && (
            <div className="cwm-step-content">
              {/* Name */}
              <div className="cwm-field">
                <div className="cwm-field-header">
                  <label className="cwm-label">
                    Workspace name <span className="cwm-label-required">*</span>
                  </label>
                  <CharCount current={form.name.length} max={50} />
                </div>
                <input
                  ref={nameRef}
                  value={form.name}
                  onChange={(e) => set('name')(e.target.value)}
                  placeholder="e.g. Product Team, Marketing, Dev Squad"
                  maxLength={50}
                  className={`cwm-input ${errors.name ? 'cwm-input--error' : ''}`}
                />
                {errors.name && <span className="cwm-field-error">{errors.name}</span>}
              </div>

              {/* Description */}
              <div className="cwm-field">
                <div className="cwm-field-header">
                  <label className="cwm-label">
                    Description <span className="cwm-label-optional">(optional)</span>
                  </label>
                  <CharCount current={form.description.length} max={200} />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description')(e.target.value)}
                  placeholder="What is this workspace for?"
                  maxLength={200}
                  rows={3}
                  className={`cwm-input cwm-textarea ${errors.description ? 'cwm-input--error' : ''}`}
                />
                {errors.description && <span className="cwm-field-error">{errors.description}</span>}
              </div>
            </div>
          )}

          {/* ── STEP 2: Appearance ── */}
          {step === 2 && (
            <div className="cwm-step-content cwm-step-content--appearance">
              <PreviewCard />

              {/* Icon picker */}
              <div>
                <label className="cwm-label">Icon</label>
                <div className="cwm-icon-grid">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => set('icon')(ic)}
                      className={`cwm-icon-btn ${form.icon === ic ? 'cwm-icon-btn--selected' : ''}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="cwm-label">Color</label>
                <div className="cwm-color-grid">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => set('color')(c)}
                      className={`cwm-color-btn ${form.color === c ? 'cwm-color-btn--selected' : ''}`}
                      style={{
                        background: c,
                        outline: form.color === c ? `2px solid ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Server error */}
              {serverErr && (
                <div className="cwm-error-banner">
                  <span>⚠</span> {serverErr}
                </div>
              )}
            </div>
          )}

          {/* ── Footer buttons ── */}
          <div className="cwm-footer">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="cwm-btn-ghost">
                ← Back
              </button>
            )}
            <button onClick={onClose} className="cwm-btn-ghost">
              Cancel
            </button>
            {step === 1 ? (
              <button onClick={handleNext} className="cwm-btn-primary">
                Next →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="cwm-btn-primary">
                {loading ? <><Spin /> Creating…</> : '✓ Create workspace'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}