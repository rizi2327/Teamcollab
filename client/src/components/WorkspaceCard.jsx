// src/components/WorkspaceCard.jsx — updated for Feature 2.3
// CHANGE: added an "Invite" icon button next to "Open →" that opens InviteModal.
// The parent (Dashboard) owns the InviteModal instance and passes onInviteClick down.

import { useState } from 'react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WorkspaceCard({ workspace, onEnter, onDelete, onInvite, currentUserId }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);

  const isOwner  = workspace.owner?._id === currentUserId || workspace.owner === currentUserId;
  const myMember = workspace.members?.find(
    (m) => (m.user?._id || m.user) === currentUserId
  );
  const myRole   = myMember?.role || workspace.myRole || 'member';
  const canInvite = myRole === 'owner' || myRole === 'admin';

  return (
    <div
      style={{
        background: '#fff', borderRadius: 18, border: '1px solid #E0DFF5',
        padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 2px 16px rgba(108,99,255,0.05)',
        transition: 'box-shadow .15s, transform .15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(108,99,255,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 16px rgba(108,99,255,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ── Top row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: workspace.color || '#6C63FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {workspace.icon || '🏢'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {workspace.name}
          </p>
          <p style={{
            fontSize: 12, color: '#999', margin: '2px 0 0',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {workspace.description || 'No description'}
          </p>
        </div>

        {isOwner && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#bbb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ⋯
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                <div style={{ position: 'absolute', right: 0, top: 34, zIndex: 10, background: '#fff', border: '1px solid #E0DFF5', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 150, overflow: 'hidden' }}>
                  <button
                    onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                    style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#E24B4A', fontWeight: 500 }}
                  >
                    🗑 Archive workspace
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Delete confirm inline ── */}
      {confirmDelete && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FCEBEB', border: '1px solid #F7C1C1' }}>
          <p style={{ fontSize: 12, color: '#A32D2D', margin: '0 0 8px', fontWeight: 500 }}>Archive this workspace?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onDelete?.(workspace._id); setConfirmDelete(false); }} style={{ padding: '5px 14px', borderRadius: 7, background: '#E24B4A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Archive
            </button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: '5px 14px', borderRadius: 7, background: '#F5F5FB', color: '#555', border: '1px solid #E0DFF5', cursor: 'pointer', fontSize: 12 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={statStyle}>
          <span style={{ fontSize: 14 }}>👥</span>
          <span style={{ fontSize: 12, color: '#666' }}>
            {workspace.memberCount || workspace.members?.length || 1}{' '}
            {(workspace.memberCount || workspace.members?.length || 1) === 1 ? 'member' : 'members'}
          </span>
        </div>
        <div style={{ ...statStyle, background: myRole === 'owner' ? '#F0EEFF' : '#F5F5FB', border: `1px solid ${myRole === 'owner' ? '#D4D0FF' : '#E0DFF5'}` }}>
          <span style={{ fontSize: 12, color: myRole === 'owner' ? '#6C63FF' : '#888', fontWeight: 500 }}>
            {myRole === 'owner' ? '👑 Owner' : myRole === 'admin' ? '⚡ Admin' : '● Member'}
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: 11, color: '#bbb' }}>Created {timeAgo(workspace.createdAt)}</span>

        <div style={{ display: 'flex', gap: 6 }}>
          {/* NEW: Invite button — only shown to owner/admin */}
          {canInvite && (
            <button
              onClick={() => onInvite?.(workspace)}
              title="Invite members"
              style={{
                padding: '7px 10px', borderRadius: 9,
                background: '#F0EEFF', color: '#6C63FF',
                border: 'none', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              👥+
            </button>
          )}
          <button
            onClick={() => onEnter?.(workspace)}
            style={{
              padding: '7px 16px', borderRadius: 9,
              background: workspace.color || '#6C63FF', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              transition: 'opacity .15s',
            }}
            onMouseEnter={(e) => e.target.style.opacity = '.85'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Open →
          </button>
        </div>
      </div>
    </div>
  );
}

const statStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '4px 10px', borderRadius: 20,
  background: '#F5F5FB', border: '1px solid #E0DFF5',
};