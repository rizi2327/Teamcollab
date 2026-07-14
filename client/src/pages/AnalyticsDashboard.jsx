// src/pages/AnalyticsDashboard.jsx
// Feature 6.1 — Dashboard & Analytics page for a single workspace
// Route: /workspaces/:id/analytics

import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceContext } from '../context/WorkspaceContext';
import { useAnalytics } from '../hooks/useAnalytics';
import StatCard from '../components/StatCard'
import StatusDonutChart        from '../components/charts/StatusDonutChart';
import PriorityBarChart        from '../components/charts/PriorityBarChart';
import TaskTimelineChart       from '../components/charts/TaskTimelineChart';
import UserActivityLeaderboard from '../components/charts/UserActivityLeaderboard';

function SkeletonBlock({ height = 220 }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #E0DFF5',
      flex: 1, minWidth: 280, height, animation: 'tc-shimmer 1.5s infinite',
    }}>
      <style>{`@keyframes tc-shimmer { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workspaces, loading: wsLoading } = useWorkspaceContext();
  const workspace = workspaces.find((w) => w._id === id);

  const {
    overview, statusBreakdown, priorityBreakdown, timeline, activity,
    loading, error, refresh,
  } = useAnalytics(id, { timelineDays: 14 });

  if (wsLoading) {
    return <div style={styles.centerMsg}>Loading workspace…</div>;
  }

  if (!workspace) {
    return (
      <div style={styles.centerMsg}>
        <p style={{ margin: 0 }}>Workspace not found</p>
        <button onClick={() => navigate('/dashboard')} style={styles.linkBtn}>← Back to dashboard</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(`/workspaces/${id}`)} style={styles.backBtn}>←</button>
          <div>
            <p style={styles.title}>Analytics — {workspace.name}</p>
            <p style={styles.subtitle}>Task activity and team performance at a glance</p>
          </div>
        </div>
        <button onClick={refresh} disabled={loading} style={styles.refreshBtn}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div style={styles.errorBanner}>⚠ {error}</div>}

      {/* ── Stat card row ── */}
      <div style={styles.statRow}>
        <StatCard label="Total tasks"    value={overview.total}          icon="📋" accent="#6C63FF" />
        <StatCard label="To do"          value={overview.todo}           icon="🗒️" accent="#B0AEC5" />
        <StatCard label="In progress"    value={overview.inProgress}     icon="⏳" accent="#EF9F27" />
        <StatCard label="Done"           value={overview.done}           icon="✅" accent="#5FA021" />
        <StatCard label="Overdue"        value={overview.overdue}        icon="⚠️" accent="#E24B4A" />
        <StatCard label="Completion"     value={overview.completionRate} suffix="%" icon="🎯" accent="#2C9CDB" />
      </div>

      {/* ── Charts row 1 ── */}
      <div style={styles.chartRow}>
        {loading ? <SkeletonBlock /> : <StatusDonutChart data={statusBreakdown} />}
        {loading ? <SkeletonBlock /> : <PriorityBarChart data={priorityBreakdown} />}
      </div>

      {/* ── Charts row 2 ── */}
      <div style={styles.chartRow}>
        {loading ? <SkeletonBlock /> : <TaskTimelineChart data={timeline} />}
        {loading ? <SkeletonBlock /> : <UserActivityLeaderboard data={activity} />}
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex', flexDirection: 'column', gap: 20,
    padding: '1.5rem 2rem 3rem', maxWidth: 1200, margin: '0 auto', width: '100%',
    fontFamily: "'Geist', 'DM Sans', sans-serif",
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 10, border: '1.5px solid #E0DFF5',
    background: '#fff', color: '#666', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: 0 },
  subtitle: { fontSize: 13, color: '#999', margin: '2px 0 0' },
  refreshBtn: {
    padding: '9px 16px', borderRadius: 10, background: '#F5F5FB', color: '#666',
    border: '1.5px solid #E0DFF5', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  statRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  chartRow: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  centerMsg: {
    minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 10, color: '#999', fontSize: 14,
    fontFamily: "'Geist', 'DM Sans', sans-serif",
  },
  linkBtn: {
    background: 'none', border: 'none', color: '#6C63FF', fontWeight: 600,
    fontSize: 13, cursor: 'pointer', padding: 0,
  },
  errorBanner: {
    padding: '11px 14px', borderRadius: 10, background: '#FCEBEB',
    border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 13, fontWeight: 500,
  },
};