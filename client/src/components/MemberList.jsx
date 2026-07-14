// src/components/MemberList.jsx
// Feature 4.3 — Workspace member list with live online/offline indicators.
// Used inside the Sidebar (collapsed into icons) and as a standalone panel.
//
// Props:
//   members   {array}   — workspace.members[]
//   onlineIds {Set}     — from useOnlinePresence
//   compact   {boolean} — if true, shows only avatars in a row (for tight spaces)

import OnlineDot from './OnlineDot';
import '../styles/MemberList.css';

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 30 }) {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="ml-avatar"
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

// ── Compact mode: avatar stack with online dot ────────────────────────────────
function CompactMemberList({ members, onlineIds, max = 5 }) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <div className="ml-compact-row">
      {visible.map((m) => {
        const id = m.user?._id || m.user;
        const online = onlineIds.has(id?.toString());
        return (
          <div key={id} className="ml-compact-item" title={`${m.user?.name} — ${online ? 'Online' : 'Offline'}`}>
            <Avatar name={m.user?.name} size={28} />
            <OnlineDot
              online={online}
              size={7}
              className="ml-dot-compact"
            />
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="ml-compact-overflow">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ── Full mode: list with name, role, and online badge ─────────────────────────
function FullMemberList({ members, onlineIds }) {
  // Sort online members to the top
  const sorted = [...members].sort((a, b) => {
    const aId = a.user?._id || a.user;
    const bId = b.user?._id || b.user;
    const aOnline = onlineIds.has(aId?.toString()) ? 0 : 1;
    const bOnline = onlineIds.has(bId?.toString()) ? 0 : 1;
    return aOnline - bOnline;
  });

  const roleLabel = { owner: '👑 Owner', admin: '⚡ Admin', member: '' };

  return (
    <div className="ml-full-list">
      {sorted.map((m) => {
        const id = m.user?._id || m.user;
        const online = onlineIds.has(id?.toString());
        return (
          <div key={id} className={`ml-full-row ${online ? 'online' : ''}`}>
            {/* Avatar with dot */}
            <div className="ml-full-avatar-wrap">
              <Avatar name={m.user?.name} size={32} />
              <OnlineDot
                online={online}
                size={9}
                className="ml-dot-full"
              />
            </div>

            {/* Name + role */}
            <div className="ml-full-info">
              <p className="ml-full-name">
                {m.user?.name || 'Unknown'}
              </p>
              {roleLabel[m.role] && (
                <span className="ml-full-role">{roleLabel[m.role]}</span>
              )}
            </div>

            {/* Online badge */}
            {online && (
              <span className="ml-online-badge">
                Online
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function MemberList({ members = [], onlineIds = new Set(), compact = false }) {
  if (compact) return <CompactMemberList members={members} onlineIds={onlineIds} />;
  return <FullMemberList members={members} onlineIds={onlineIds} />;
}