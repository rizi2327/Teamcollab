// src/components/TaskDetailModal.jsx — updated for Feature 3.4
// CHANGE: delete confirmation section added at the bottom of the modal.
// Two-stage flow: "Delete task" button → inline confirmation ("Are you sure?")
// → confirmed delete → modal closes, board removes the card.
//
// Props (same as 3.3 + onDeleted):
//   isOpen    {boolean}
//   onClose   {() => void}
//   task      {object}
//   workspace {object}              — .members[] for assignee picker
//   onUpdated {(updatedTask) => void}
//   onDeleted {(taskId) => void}    ← NEW 3.4

import { useState, useEffect } from 'react';
import { useTask } from '../hooks/useTask';
import { useAuthContext } from '../context/AuthContext';
import AttachmentList from './AttachmentList';
import TaskBreakdownPanel from './TaskBreakdownPanel';   // ← NEW 8.1

// ── Helpers ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Spin({ color = 'white' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'tc-spin .7s linear infinite' }}>
      <style>{`@keyframes tc-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity=".3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function StatusToggle({ value, onChange }) {
  const options = [
    { value: 'todo',        label: 'To Do',       color: '#888',    bg: '#F5F5FB' },
    { value: 'in-progress', label: 'In Progress', color: '#185FA5', bg: '#E6F1FB' },
    { value: 'done',        label: 'Done',        color: '#3B6D11', bg: '#EAF3DE' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: value === o.value ? o.bg : '#FAFAFE',
          color: value === o.value ? o.color : '#bbb',
          border: value === o.value ? `1.5px solid ${o.color}` : '1.5px solid #E0DFF5',
          transition: 'all .12s',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PriorityPills({ value, onChange }) {
  const options = [
    { value: 'low',    label: 'Low',    color: '#3B6D11', bg: '#EAF3DE' },
    { value: 'medium', label: 'Medium', color: '#854F0B', bg: '#FFF4E0' },
    { value: 'high',   label: 'High',   color: '#A32D2D', bg: '#FCEBEB' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: value === o.value ? o.bg : '#FAFAFE',
          color: value === o.value ? o.color : '#bbb',
          border: value === o.value ? `1.5px solid ${o.color}` : '1.5px solid #E0DFF5',
          transition: 'all .12s',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function TaskDetailModal({ isOpen, onClose, task, workspace, onUpdated, onDeleted, onSubtasksCreated }) {
  const { updateTask, deleteTask, loading } = useTask();
  const { user } = useAuthContext();

  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  // ── Attachments (Feature 7.1) ────────────────────────────────────────────
  const [attachments, setAttachments] = useState([]);
  const isWorkspaceOwner = (workspace?.owner?._id || workspace?.owner) === user?._id;

  // ── Delete state ─────────────────────────────────────────────────────────
  const [deleteStage, setDeleteStage] = useState('idle'); // 'idle' | 'confirm' | 'deleting' | 'done'
  const [deleteErr, setDeleteErr]     = useState('');

  // Reset on open / task change
  useEffect(() => {
    if (isOpen && task) {
      setForm({
        title:       task.title       || '',
        description: task.description || '',
        status:      task.status      || 'todo',
        priority:    task.priority    || 'medium',
        assignedTo:  task.assignedTo?._id || task.assignedTo || '',
        dueDate:     task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      });
      setAttachments(task.attachments || []);
      setDirty(false);
      setSaveErr('');
      setSavedMsg('');
      setDeleteStage('idle');
      setDeleteErr('');
    }
  }, [isOpen, task?._id]);

  // Close on Escape — but not if confirm stage is showing (prevent accidental close)
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        if (deleteStage === 'confirm') {
          setDeleteStage('idle'); // Escape cancels the confirm, doesn't close modal
        } else {
          onClose();
        }
      }
    };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, deleteStage]);

  const setField = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
    setSaveErr('');
    setSavedMsg('');
  };

  const buildPayload = () => {
    const payload = {};
    if (form.title !== task.title) payload.title = form.title;
    if (form.description !== (task.description || '')) payload.description = form.description;
    if (form.status !== task.status) payload.status = form.status;
    if (form.priority !== task.priority) payload.priority = form.priority;
    const origAssignee = task.assignedTo?._id || task.assignedTo || '';
    if (form.assignedTo !== origAssignee) payload.assignedTo = form.assignedTo || null;
    const origDue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
    if (form.dueDate !== origDue) payload.dueDate = form.dueDate || null;
    return payload;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!dirty) return;
    if (!form.title.trim() || form.title.trim().length < 2) {
      setSaveErr('Title must be at least 2 characters');
      return;
    }
    const payload = buildPayload();
    if (Object.keys(payload).length === 0) { setDirty(false); return; }
    setSaveErr('');
    const result = await updateTask(task._id, payload);
    if (result.success) {
      setSavedMsg('Saved ✓');
      setDirty(false);
      onUpdated?.(result.task);
      setTimeout(() => setSavedMsg(''), 2500);
    } else {
      setSaveErr(result.message);
    }
  };

  const handleDiscard = () => {
    setForm({
      title:       task.title       || '',
      description: task.description || '',
      status:      task.status      || 'todo',
      priority:    task.priority    || 'medium',
      assignedTo:  task.assignedTo?._id || task.assignedTo || '',
      dueDate:     task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    });
    setDirty(false);
    setSaveErr('');
    setSavedMsg('');
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleteStage('deleting');
    setDeleteErr('');
    const result = await deleteTask(task._id);
    if (result.success) {
      setDeleteStage('done');
      // Give a brief moment for the "deleted" state to register, then close
      setTimeout(() => {
        onDeleted?.(task._id);
        onClose();
      }, 600);
    } else {
      setDeleteErr(result.message);
      setDeleteStage('confirm'); // stay on confirm so user can retry or cancel
    }
  };

  if (!isOpen || !task || !form) return null;

  const members = workspace?.members || [];
  const isOverdue = form.dueDate && new Date(form.dueDate) < new Date() && form.status !== 'done';
  const isDeleting = deleteStage === 'deleting';
  const isDone     = deleteStage === 'done';

  return (
    <>
      <div onClick={deleteStage === 'confirm' ? undefined : onClose} style={ms.backdrop} />
      <style>{`
        @keyframes tc-fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tc-slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div style={ms.modal}>

        {/* ── Deleted flash state ── */}
        {isDone && (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', margin: 0 }}>Task deleted</p>
            <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>Removing from board…</p>
          </div>
        )}

        {!isDone && (
          <>
            {/* ── Header ── */}
            <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  value={form.title}
                  onChange={(e) => setField('title')(e.target.value)}
                  placeholder="Task title"
                  maxLength={120}
                  style={{
                    fontSize: 18, fontWeight: 700, color: '#1a1a2e', border: 'none',
                    outline: 'none', background: 'transparent', width: '100%',
                    lineHeight: 1.35, padding: 0, fontFamily: 'inherit',
                    borderBottom: '2px solid transparent', transition: 'border-color .15s',
                  }}
                  onFocus={(e) => { e.target.style.borderBottomColor = '#6C63FF'; }}
                  onBlur={(e) => { e.target.style.borderBottomColor = 'transparent'; }}
                />
              </div>
              <button onClick={onClose} style={ms.closeBtn}>✕</button>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>

              <FieldRow label="Status">
                <StatusToggle value={form.status} onChange={setField('status')} />
              </FieldRow>

              <FieldRow label="Priority">
                <PriorityPills value={form.priority} onChange={setField('priority')} />
              </FieldRow>

              <FieldRow label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description')(e.target.value)}
                  placeholder="Add context, links, or acceptance criteria…"
                  maxLength={2000}
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, resize: 'vertical', border: '1.5px solid #E0DFF5', background: '#FAFAFE', color: '#1a1a2e', fontSize: 13.5, outline: 'none', lineHeight: 1.55, fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color .15s' }}
                  onFocus={(e) => { e.target.style.borderColor = '#6C63FF'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E0DFF5'; }}
                />
              </FieldRow>

              {/* Assignee + Due date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FieldRow label="Assignee">
                  <select value={form.assignedTo} onChange={(e) => setField('assignedTo')(e.target.value)} style={ms.select}>
                    <option value="">Unassigned</option>
                    {members.map((m) => {
                      const id = m.user?._id || m.user;
                      return <option key={id} value={id}>{m.user?.name || id}</option>;
                    })}
                  </select>
                  {form.assignedTo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
                      <Avatar name={members.find((m) => (m.user?._id || m.user) === form.assignedTo)?.user?.name} size={22} />
                      <span style={{ fontSize: 12, color: '#555' }}>
                        {members.find((m) => (m.user?._id || m.user) === form.assignedTo)?.user?.name}
                      </span>
                    </div>
                  )}
                </FieldRow>

                <FieldRow label={`Due date${isOverdue ? ' ⚠ Overdue' : ''}`}>
                  <input type="date" value={form.dueDate} onChange={(e) => setField('dueDate')(e.target.value)}
                    style={{ ...ms.select, color: isOverdue ? '#E24B4A' : '#1a1a2e', fontWeight: isOverdue ? 600 : 400 }}
                  />
                </FieldRow>
              </div>

              {/* Metadata */}
              <div style={{ display: 'flex', gap: 16, paddingTop: 4, borderTop: '1px solid #F0EEF5' }}>
                <div style={{ flex: 1 }}>
                  <span style={ms.metaLabel}>Created by</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Avatar name={task.createdBy?.name} size={20} />
                    <span style={ms.metaValue}>{task.createdBy?.name || 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <span style={ms.metaLabel}>Created</span>
                  <p style={{ ...ms.metaValue, margin: '4px 0 0' }}>
                    {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* AI task breakdown — Feature 8.1 */}
              <div style={{ borderTop: '1px solid #F0EEF5', paddingTop: 14 }}>
                <TaskBreakdownPanel taskId={task._id} onSubtasksCreated={onSubtasksCreated} />
              </div>

              {/* Attachments — Feature 7.1 */}
              <div style={{ borderTop: '1px solid #F0EEF5', paddingTop: 14 }}>
                <AttachmentList
                  taskId={task._id}
                  attachments={attachments}
                  currentUser={user}
                  isWorkspaceOwner={isWorkspaceOwner}
                  onUploaded={(attachment) => {
                    const next = [...attachments, attachment];
                    setAttachments(next);
                    onUpdated?.({ ...task, attachments: next });
                  }}
                  onDeleted={(attachmentId) => {
                    const next = attachments.filter((a) => a._id !== attachmentId);
                    setAttachments(next);
                    onUpdated?.({ ...task, attachments: next });
                  }}
                />
              </div>

              {/* Save / discard feedback */}
              {saveErr && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 13 }}>
                  ⚠ {saveErr}
                </div>
              )}
              {savedMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#EAF3DE', border: '1px solid #C0DD97', color: '#3B6D11', fontSize: 13, fontWeight: 600 }}>
                  {savedMsg}
                </div>
              )}

              {/* Save / discard buttons */}
              {dirty && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={handleDiscard} style={ms.ghostBtn}>Discard changes</button>
                  <button onClick={handleSave} disabled={loading}
                    style={{ ...ms.primaryBtn, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? <><Spin /> Saving…</> : 'Save changes'}
                  </button>
                </div>
              )}

              {/* ── DELETE SECTION (Feature 3.4) ─────────────────────────────── */}
              <div style={{
                borderTop: '1px solid #F0EEF5',
                paddingTop: 16,
                marginTop: 4,
              }}>
                {deleteStage === 'idle' && (
                  <button
                    onClick={() => setDeleteStage('confirm')}
                    style={ms.deleteBtn}
                  >
                    🗑 Delete this task
                  </button>
                )}

                {(deleteStage === 'confirm' || deleteStage === 'deleting') && (
                  <div style={ms.deleteConfirmBox}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#A32D2D', margin: '0 0 3px' }}>
                        Delete this task?
                      </p>
                      <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
                        This action cannot be undone. The task will be archived.
                      </p>
                    </div>

                    {deleteErr && (
                      <p style={{ fontSize: 12, color: '#A32D2D', margin: '6px 0 0', fontWeight: 500 }}>
                        ⚠ {deleteErr}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={handleDeleteConfirm}
                        disabled={isDeleting}
                        style={{
                          padding: '8px 16px', borderRadius: 9,
                          background: '#E24B4A', color: '#fff',
                          border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6,
                          opacity: isDeleting ? 0.75 : 1,
                        }}
                      >
                        {isDeleting ? <><Spin color="white" /> Deleting…</> : 'Yes, delete it'}
                      </button>
                      <button
                        onClick={() => { setDeleteStage('idle'); setDeleteErr(''); }}
                        disabled={isDeleting}
                        style={ms.ghostBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* ── END DELETE SECTION ── */}

            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ms = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(26,26,46,0.45)', backdropFilter: 'blur(4px)',
    animation: 'tc-fadeIn .15s ease',
  },
  modal: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 201, width: '92%', maxWidth: 520,
    background: '#fff', borderRadius: 22,
    boxShadow: '0 24px 80px rgba(108,99,255,0.18), 0 2px 8px rgba(0,0,0,0.08)',
    animation: 'tc-slideUp .2s ease',
    maxHeight: '88vh', display: 'flex', flexDirection: 'column',
  },
  closeBtn: {
    width: 30, height: 30, borderRadius: '50%', background: '#F5F5FB', border: 'none',
    cursor: 'pointer', fontSize: 13, color: '#888', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  select: {
    width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E0DFF5',
    background: '#FAFAFE', color: '#1a1a2e', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer',
  },
  metaLabel: { fontSize: 11, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.04em' },
  metaValue: { fontSize: 12, color: '#555', fontWeight: 500 },
  primaryBtn: {
    padding: '10px 20px', borderRadius: 10, background: '#6C63FF', color: '#fff',
    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 7,
  },
  ghostBtn: {
    padding: '8px 16px', borderRadius: 9, background: '#F5F5FB', color: '#555',
    border: '1.5px solid #E0DFF5', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  },
  deleteBtn: {
    padding: '8px 14px', borderRadius: 9, background: 'transparent', color: '#bbb',
    border: '1px solid #E0DFF5', cursor: 'pointer', fontSize: 12, fontWeight: 500,
    transition: 'background .15s, color .15s, border-color .15s',
  },
  deleteConfirmBox: {
    padding: '14px', borderRadius: 12,
    background: '#FCEBEB', border: '1px solid #F7C1C1',
  },
};