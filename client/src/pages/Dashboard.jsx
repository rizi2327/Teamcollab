// src/pages/Dashboard.jsx — updated for Feature 3.1
// CHANGE: handleEnter now navigates to /workspaces/:id instead of showing an alert

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useWorkspaceContext } from "../context/WorkspaceContext";
import { useWorkspace } from "../hooks/useWorkspace";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import WorkspaceCard from "../components/WorkspaceCard";
import InviteModal from "../components/InviteModal";
import "../styles/Dashboard.css";

function EmptyState({ onOpen }) {
  return (
    <div className="ds-empty-state">
      <div className="ds-empty-icon-wrap">🏢</div>
      <div>
        <h3 className="ds-empty-title">No workspaces yet</h3>
        <p className="ds-empty-subtitle">
          Create your first workspace to start collaborating with your team
        </p>
      </div>
      <button onClick={onOpen} className="ds-primary-btn">
        + Create your first workspace
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="ds-skeleton-card">
      <div className="ds-skeleton-header">
        <div className="ds-skeleton-avatar" />
        <div className="ds-skeleton-lines">
          <div className="ds-skeleton-line-title" />
          <div className="ds-skeleton-line-subtitle" />
        </div>
      </div>
      <div className="ds-skeleton-tags">
        <div className="ds-skeleton-tag" />
        <div className="ds-skeleton-tag ds-skeleton-tag--sm" />
      </div>
      <div className="ds-skeleton-footer">
        <div className="ds-skeleton-footer-label" />
        <div className="ds-skeleton-footer-btn" />
      </div>
    </div>
  );
}

function TopBar({ onCreateClick }) {
  return (
    <div className="ds-top-bar">
      <span className="ds-top-bar-label">Dashboard</span>
      <button onClick={onCreateClick} className="ds-primary-btn">
        + New workspace
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const {
    workspaces,
    loading,
    error,
    addWorkspace,
    removeWorkspace,
    refreshWorkspaces,
    setActive,
    updateWorkspaceInList,
  } = useWorkspaceContext();
  const { deleteWorkspace } = useWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [inviteWorkspace, setInviteWorkspace] = useState(null);

  const handleCreated = (newWorkspace) => addWorkspace(newWorkspace);

  const handleDelete = async (id) => {
    const result = await deleteWorkspace(id);
    if (result.success) removeWorkspace(id);
  };

  // ── CHANGED: now navigates to the workspace's task view ─────────────────
  const handleEnter = (workspace) => {
    setActive(workspace);
    navigate(`/workspaces/${workspace._id}`);
  };

  const handleInviteClick = (workspace) => setInviteWorkspace(workspace);

  const handleMemberRemoved = (updatedWorkspace) => {
    updateWorkspaceInList(updatedWorkspace);
    setInviteWorkspace(updatedWorkspace);
  };

  const showSkeleton = loading && workspaces.length === 0;

  return (
    <div className="ds-page">
      <TopBar onCreateClick={() => setModalOpen(true)} />

      <main className="ds-main">
        <div className="ds-page-header">
          <div>
            <h1 className="ds-heading">
              Good {getGreeting()}, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="ds-subheading">
              {workspaces.length === 0 && !loading
                ? "Create a workspace to get started"
                : `You have ${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {workspaces.length > 0 && (
            <div className="ds-stats-bar">
              <StatPill
                icon="🏢"
                label="Workspaces"
                value={workspaces.length}
              />
              <StatPill
                icon="👥"
                label="Total members"
                value={workspaces.reduce(
                  (acc, w) => acc + (w.memberCount || w.members?.length || 0),
                  0,
                )}
              />
              <StatPill
                icon="👑"
                label="Owned by you"
                value={
                  workspaces.filter(
                    (w) => (w.owner?._id || w.owner) === user?._id,
                  ).length
                }
              />
            </div>
          )}
        </div>

        {error && (
          <div className="ds-error-banner">
            ⚠ {error} —
            <button onClick={refreshWorkspaces} className="ds-error-retry-btn">
              Retry
            </button>
          </div>
        )}

        {showSkeleton ? (
          <div className="ds-grid">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : workspaces.length === 0 && !loading ? (
          <EmptyState onOpen={() => setModalOpen(true)} />
        ) : (
          <div className="ds-grid">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws._id}
                workspace={ws}
                onEnter={handleEnter}
                onDelete={handleDelete}
                onInvite={handleInviteClick}
                currentUserId={user?._id}
              />
            ))}
            <button onClick={() => setModalOpen(true)} className="ds-add-card">
              <span className="ds-add-card-plus">+</span>
              <span className="ds-add-card-label">New workspace</span>
            </button>
          </div>
        )}
      </main>

      <CreateWorkspaceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreated}
      />

      <InviteModal
        isOpen={!!inviteWorkspace}
        onClose={() => setInviteWorkspace(null)}
        workspace={inviteWorkspace}
        currentUserId={user?._id}
        onMemberRemoved={handleMemberRemoved}
      />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function StatPill({ icon, label, value }) {
  return (
    <div className="ds-stat-pill">
      <span className="ds-stat-pill-icon">{icon}</span>
      <span className="ds-stat-pill-value">{value}</span>
      <span className="ds-stat-pill-label">{label}</span>
    </div>
  );
}
