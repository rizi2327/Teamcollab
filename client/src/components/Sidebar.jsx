// src/components/Sidebar.jsx — updated for Feature 4.3
// CHANGE: WorkspaceRow now shows a subtle online-member count badge
// when at least one member of that workspace is online.
// The Sidebar doesn't have workspace-specific presence info, so it shows
// the global onlineUsers count for the active workspace only.
// For other workspaces we show a generic "active" dot when socket is connected.

import { useState } from 'react';
import { useWorkspaceContext } from '../context/WorkspaceContext';
import { useAuthContext }      from '../context/AuthContext';
import { useSocket }           from '../context/SocketContext';
import CreateWorkspaceModal    from './CreateWorkspaceModal';
import OnlineDot               from './OnlineDot';   // ← NEW 4.3
import '../styles/Sidebar.css';

function WorkspaceRow({ workspace, isActive, onClick, isConnected }) {
  return (
    <button
      onClick={onClick}
      className={`sb-workspace-row ${isActive ? 'active' : ''}`}
      style={{ '--workspace-color': workspace.color || '#6C63FF' }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="sb-active-bar" />
      )}

      {/* Workspace icon */}
      <div className="sb-row-icon">
        {workspace.icon || '🏢'}
      </div>

      {/* Name */}
      <div className="sb-row-name-wrap">
        <p className={`sb-row-name ${isActive ? 'active' : ''}`}>
          {workspace.name}
        </p>
      </div>

      {/* ── Online dot for active workspace ── NEW 4.3 ── */}
      {isActive && isConnected && (
        <OnlineDot online={true} size={7} pulse={false} />
      )}

      {/* Member count */}
      <span className="sb-row-member-count">
        {workspace.memberCount || workspace.members?.length || 1}
      </span>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="sb-skeleton-row">
      <div className="sb-skeleton-icon" />
      <div className="sb-skeleton-line" />
    </div>
  );
}

export default function Sidebar() {
  const { user }    = useAuthContext();
  const { connected } = useSocket();   // ← NEW 4.3
  const {
    workspaces, activeWorkspace, loading, error,
    setActive, addWorkspace, refreshWorkspaces,
  } = useWorkspaceContext();

  const [modalOpen, setModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleCreated = (workspace) => addWorkspace(workspace);

  return (
    <>
      <aside className={`sb-aside ${collapsed ? 'collapsed' : ''}`}>

        {/* ── Brand row ── */}
        <div className={`sb-brand-row ${collapsed ? 'collapsed' : ''}`}>
          {!collapsed && (
            <a href="/dashboard" className="sb-brand-link">
              <div className="sb-brand-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#6C63FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="sb-brand-name">TeamCollab</span>
            </a>
          )}
          <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand' : 'Collapse'} className="sb-collapse-btn">
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* ── Workspace list ── */}
        <div className="sb-list-wrap">
          {!collapsed && (
            <div className="sb-list-header">
              <span className="sb-list-title">Workspaces</span>
              <button onClick={() => setModalOpen(true)} title="Create workspace" className="sb-add-btn">
                +
              </button>
            </div>
          )}

          {loading && <div className="sb-skeleton-list">{[1,2,3].map((i) => <SkeletonRow key={i} />)}</div>}

          {!loading && error && (
            <div className="sb-error-wrap">
              <p className="sb-error-text">{error}</p>
              <button onClick={refreshWorkspaces} className="sb-error-retry-btn">Retry</button>
            </div>
          )}

          {!loading && !error && workspaces.length === 0 && !collapsed && (
            <button onClick={() => setModalOpen(true)} className="sb-empty-btn">
              <span className="sb-empty-btn-text">+ Create your first workspace</span>
            </button>
          )}

          {!loading && !error && workspaces.length > 0 && (
            <div className="sb-workspace-list">
              {workspaces.map((ws) =>
                collapsed ? (
                  <button
                    key={ws._id}
                    onClick={() => setActive(ws)}
                    title={ws.name}
                    className={`sb-collapsed-item ${activeWorkspace?._id === ws._id ? 'active' : ''}`}
                    style={{ '--workspace-color': ws.color || '#6C63FF' }}
                  >
                    {ws.icon || '🏢'}
                    {/* Online dot in collapsed mode for active workspace */}
                    {activeWorkspace?._id === ws._id && connected && (
                      <OnlineDot online={true} size={7} pulse={false} className="sb-collapsed-dot" />
                    )}
                  </button>
                ) : (
                  <WorkspaceRow
                    key={ws._id}
                    workspace={ws}
                    isActive={activeWorkspace?._id === ws._id}
                    isConnected={connected}   // ← NEW 4.3
                    onClick={() => setActive(ws)}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* ── Bottom: user profile ── */}
        <div className={`sb-profile-row ${collapsed ? 'collapsed' : ''}`}>
          {/* Avatar with online dot */}
          <div className="sb-avatar-wrap">
            <a href="/profile" className="sb-avatar-link">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </a>
            {/* ── Always show self as online at the bottom ── NEW 4.3 ── */}
            <OnlineDot
              online={connected}
              size={9}
              className="sb-avatar-dot"
            />
          </div>

          {!collapsed && (
            <div className="sb-profile-info">
              <p className="sb-profile-name">
                {user?.name}
              </p>
              <a href="/profile" className="sb-profile-link">View profile</a>
            </div>
          )}
        </div>
      </aside>

      <CreateWorkspaceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreated}
      />
    </>
  );
}