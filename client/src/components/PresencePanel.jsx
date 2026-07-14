// src/components/PresencePanel.jsx
// Feature 4.3 — Collapsible "Members" panel in WorkspaceView showing online status.
// Sits as a left/right panel or inline section depending on layout.
//
// Props:
//   workspace  {object}   — workspace document with .members[]
//   onlineIds  {Set}      — from useOnlinePresence
//   isOpen     {boolean}
//   onClose    {() => void}

import MemberList from './MemberList';
import OnlineDot  from './OnlineDot';
import '../styles/PresencePanel.css';

export default function PresencePanel({ workspace, onlineIds, isOpen, onClose }) {
  if (!isOpen || !workspace) return null;

  const members     = workspace.members || [];
  const onlineCount = members.filter((m) => onlineIds.has((m.user?._id || m.user)?.toString())).length;

  return (
    <div className="pp-panel">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-header-left">
          <span className="pp-header-icon">👥</span>
          <span className="pp-header-title">Members</span>
          {/* Online count badge */}
          <div className="pp-online-count">
            <OnlineDot online={true} size={7} />
            <span className="pp-online-count-text">
              {onlineCount} online
            </span>
          </div>
        </div>
        <button onClick={onClose} className="pp-close-btn">
          ✕
        </button>
      </div>

      {/* Member list */}
      <div className="pp-list-wrap">
        <MemberList members={members} onlineIds={onlineIds} compact={false} />
      </div>

      {/* Footer: total count */}
      <div className="pp-footer">
        {members.length} total member{members.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}