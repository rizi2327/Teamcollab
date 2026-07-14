// src/components/InviteModal.jsx
// Feature 2.3 — Invite Members Modal
//
// Two tabs:
//   "Invite"  — email + role form, list of pending invites with revoke
//   "Members" — current members with remove option (owner/admin only)
//
// Props:
//   isOpen  {boolean}
//   onClose {() => void}
//   workspace {object} — needs _id, name, members[]
//   currentUserId {string}
//   onMemberRemoved {(workspace) => void} — bubble updated workspace up

import { useState, useEffect, useRef } from 'react';
import { useInvite } from '../hooks/useInvite';
import '../styles/InviteModal.css';

// ── Role badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const styles = {
    owner:  { bg: '#F0EEFF', color: '#6C63FF', label: '👑 Owner' },
    admin:  { bg: '#FFF4E0', color: '#854F0B', label: '⚡ Admin' },
    member: { bg: '#F5F5FB', color: '#888',    label: '● Member' },
  };
  const s = styles[role] || styles.member;
  return (
    <span
      className="tc-role-badge"
      style={{ '--badge-bg': s.bg, '--badge-color': s.color }}
    >
      {s.label}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      className="tc-avatar"
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

function Spin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="tc-spinner">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function InviteModal({ isOpen, onClose, workspace, currentUserId, onMemberRemoved }) {
  const { sendInvite, getInvites, revokeInvite, removeMember, loading } = useInvite();
  const emailRef = useRef(null);

  const [tab, setTab] = useState('invite'); // 'invite' | 'members'

  // ── Invite form state ───────────────────────────────────────────────────
  const [email, setEmail]   = useState('');
  const [role, setRole]     = useState('member');
  const [formErr, setFormErr] = useState('');
  const [toast, setToast]     = useState({ msg: '', type: '' });

  // ── Pending invites list ────────────────────────────────────────────────
  const [invites, setInvites]         = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const myMembership = workspace?.members?.find(
    (m) => (m.user?._id || m.user) === currentUserId
  );
  const canManage = myMembership && ['owner', 'admin'].includes(myMembership.role);

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && workspace) {
      setEmail(''); setRole('member'); setFormErr(''); setTab('invite');
      fetchInvites();
      setTimeout(() => emailRef.current?.focus(), 80);
    }
  }, [isOpen, workspace?._id]);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  };

  const fetchInvites = async () => {
    if (!workspace) return;
    setInvitesLoading(true);
    const result = await getInvites(workspace._id);
    if (result.success) setInvites(result.invites);
    setInvitesLoading(false);
  };

  // ── Send invite ──────────────────────────────────────────────────────────
  const handleInvite = async () => {
    setFormErr('');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setFormErr('Enter a valid email address');
      return;
    }
    const result = await sendInvite(workspace._id, { email: email.trim(), role });
    if (result.success) {
      showToast(result.message);
      setEmail('');
      fetchInvites();
      if (result.devLink) {
        console.log('🔗 Dev invite link (copy to test):', result.devLink);
      }
    } else {
      setFormErr(result.message);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && tab === 'invite') handleInvite(); };

  // ── Revoke invite ────────────────────────────────────────────────────────
  const handleRevoke = async (inviteId) => {
    const result = await revokeInvite(workspace._id, inviteId);
    if (result.success) {
      setInvites((prev) => prev.filter((i) => i._id !== inviteId));
      showToast('Invite revoked');
    } else {
      showToast(result.message, 'error');
    }
  };

  // ── Remove member ───────────────────────────────────────────────────────
  const [confirmRemove, setConfirmRemove] = useState(null);
  const handleRemoveMember = async (userId) => {
    const result = await removeMember(workspace._id, userId);
    if (result.success) {
      onMemberRemoved?.(result.workspace);
      showToast('Member removed');
    } else {
      showToast(result.message, 'error');
    }
    setConfirmRemove(null);
  };

  if (!isOpen || !workspace) return null;

  return (
    <>
      <div onClick={onClose} className="tc-backdrop" />

      {/* Toast */}
      {toast.msg && (
        <div className={`tc-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      <div onKeyDown={handleKeyDown} className="tc-modal">
        {/* ── Header ── */}
        <div className="tc-header">
          <div>
            <h2 className="tc-title">
              {workspace.icon} {workspace.name}
            </h2>
            <p className="tc-subtitle">
              Manage members and invitations
            </p>
          </div>
          <button onClick={onClose} className="tc-close-btn">✕</button>
        </div>

        {/* ── Tabs ── */}
        <div className="tc-tabs">
          <button
            onClick={() => setTab('invite')}
            className={`tc-tab-btn ${tab === 'invite' ? 'active' : ''}`}
          >
            Invite
          </button>
          <button
            onClick={() => setTab('members')}
            className={`tc-tab-btn ${tab === 'members' ? 'active' : ''}`}
          >
            Members ({workspace.members?.length || 0})
          </button>
        </div>

        <div className="tc-body">

          {/* ════════ INVITE TAB ════════ */}
          {tab === 'invite' && (
            <div className="tc-tab-panel">
              {canManage ? (
                <>
                  {/* Invite form */}
                  <div>
                    <label className="tc-label">Invite by email</label>
                    <div className="tc-form-row">
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFormErr(''); }}
                        placeholder="colleague@company.com"
                        className={`tc-input tc-input-email ${formErr ? 'error' : ''}`}
                      />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="tc-input tc-input-role"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {formErr && <span className="tc-form-err">{formErr}</span>}

                    <button
                      onClick={handleInvite}
                      disabled={loading}
                      className={`tc-primary-btn ${loading ? 'loading' : ''}`}
                    >
                      {loading ? <><Spin /> Sending…</> : '✉ Send invite'}
                    </button>
                  </div>

                  {/* Pending invites list */}
                  <div>
                    <p className="tc-section-label">
                      Pending invites
                    </p>
                    {invitesLoading ? (
                      <p className="tc-muted-text">Loading…</p>
                    ) : invites.length === 0 ? (
                      <p className="tc-empty-text">No pending invites</p>
                    ) : (
                      <div className="tc-invite-list">
                        {invites.map((inv) => (
                          <div key={inv._id} className="tc-invite-row">
                            <div className="tc-invite-info">
                              <p className="tc-invite-email">
                                {inv.email}
                              </p>
                              <p className="tc-invite-meta">
                                Sent {timeAgo(inv.createdAt)} · {inv.role}
                              </p>
                            </div>
                            <button onClick={() => handleRevoke(inv._id)} className="tc-revoke-btn">
                              Revoke
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="tc-no-access">
                  Only the workspace owner or an admin can invite new members.
                </div>
              )}
            </div>
          )}

          {/* ════════ MEMBERS TAB ════════ */}
          {tab === 'members' && (
            <div className="tc-members-list">
              {workspace.members?.map((m) => {
                const u = m.user;
                const isMe = (u?._id || u) === currentUserId;
                return (
                  <div key={u?._id || u} className="tc-member-row">
                    <Avatar name={u?.name} />
                    <div className="tc-member-info">
                      <p className="tc-member-name">
                        {u?.name} {isMe && <span className="tc-member-you">(you)</span>}
                      </p>
                      <p className="tc-member-email">{u?.email}</p>
                    </div>
                    <RoleBadge role={m.role} />

                    {/* Remove button — only if I can manage, target isn't owner, and not myself */}
                    {canManage && m.role !== 'owner' && !isMe && (
                      confirmRemove === (u?._id || u) ? (
                        <div className="tc-confirm-actions">
                          <button onClick={() => handleRemoveMember(u?._id || u)} className="tc-small-btn confirm">
                            Confirm
                          </button>
                          <button onClick={() => setConfirmRemove(null)} className="tc-small-btn cancel">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove(u?._id || u)} className="tc-remove-member-btn">
                          Remove
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}