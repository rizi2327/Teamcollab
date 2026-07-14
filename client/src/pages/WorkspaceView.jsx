// src/pages/WorkspaceView.jsx — updated for Feature 4.3
// CHANGES:
//   - useOnlinePresence(workspaceId) tracks who is online
//   - "👥 Members" toggle button opens PresencePanel (right panel beside Chat)
//   - Compact member avatars with online dots shown in the top bar
//   - onlineIds passed to ChatPanel so it can show online status
//   - joinWorkspace() still called on mount (unchanged from 4.2)

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useWorkspaceContext }  from '../context/WorkspaceContext';
import { useAuthContext }       from '../context/AuthContext';
import { useSocket }            from '../context/SocketContext';
import { useTask }              from '../hooks/useTask';
import { useOnlinePresence }    from '../hooks/useOnlinePresence';   // ← NEW 4.3
import CreateTaskModal  from '../components/CreateTaskModal';
import TaskDetailModal  from '../components/TaskDetailModal';
import AISummaryModal    from '../components/AISummaryModal';    // ← NEW 8.1
import AIAssistantPanel  from '../components/AIAssistantPanel';  // ← NEW 8.1
import KanbanColumn     from '../components/KanbanColumn';
import TaskCard         from '../components/TaskCard';
import ChatPanel        from '../components/ChatPanel';
import PresencePanel    from '../components/PresencePanel';          // ← NEW 4.3
import MemberList       from '../components/MemberList';             // ← NEW 4.3 (compact bar)
import OnlineDot        from '../components/OnlineDot';              // ← NEW 4.3

const STATUSES = ['todo', 'in-progress', 'done'];

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Toast({ msg, type = 'error', onClose }) {
  if (!msg) return null;
  const isErr = type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 16px', borderRadius: 10, maxWidth: 380,
      background: isErr ? '#FCEBEB' : '#EAF3DE',
      border: `1px solid ${isErr ? '#F7C1C1' : '#C0DD97'}`,
      color: isErr ? '#A32D2D' : '#3B6D11',
      fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      animation: 'tc-toastIn .2s ease',
    }}>
      <style>{`@keyframes tc-toastIn { from { transform: translate(-50%, 16px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
      {isErr ? '⚠' : '✓'} {msg}
      <button onClick={onClose} style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}>✕</button>
    </div>
  );
}

function CardDeleteConfirm({ task, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 12px 48px rgba(0,0,0,0.16)', maxWidth: 340, width: '90%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Delete "{task.title}"?</p>
          <p style={{ fontSize: 13, color: '#999', margin: 0 }}>This task will be archived and removed from the board.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#E24B4A', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.75 : 1 }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#F5F5FB', color: '#555', border: '1.5px solid #E0DFF5', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function WorkspaceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { workspaces, loading: wsLoading } = useWorkspaceContext();
  const { joinWorkspace } = useSocket();
  const { getTasks, updateTask, deleteTask, loading: tasksLoading } = useTask();

  const workspace = workspaces.find((w) => w._id === id);

  // ── Online presence ──────────────────────────────────────────────────────
  const { onlineIds, onlineCount, isOnline } = useOnlinePresence(workspace?._id);

  const [tasksByStatus, setTasksByStatus] = useState({ todo: [], 'in-progress': [], done: [] });
  const [counts, setCounts]               = useState({ todo: 0, 'in-progress': 0, done: 0 });
  const [fetchErr, setFetchErr]           = useState('');
  const [search, setSearch]               = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask]       = useState(null);
  const [activeTask, setActiveTask]           = useState(null);
  const [dragErr, setDragErr]                 = useState('');
  const [pendingDelete, setPendingDelete]     = useState(null);
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [toast, setToast]                     = useState({ msg: '', type: 'error' });

  // ── Panel toggles ─────────────────────────────────────────────────────────
  const [chatOpen,     setChatOpen]     = useState(false);
  const [membersOpen,  setMembersOpen]  = useState(false);   // ← NEW 4.3
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false); // ← NEW 8.1
  const [aiAskOpen,     setAiAskOpen]     = useState(false); // ← NEW 8.1

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'error' }), 4000);
  };

  // Join workspace socket room on load
  useEffect(() => {
    if (workspace?._id) joinWorkspace(workspace._id);
  }, [workspace?._id, joinWorkspace]);

  const fetchBoard = useCallback(async () => {
    if (!workspace) return;
    setFetchErr('');
    const baseFilters = {
      workspace: workspace._id,
      search: debouncedSearch || undefined,
      priority: priorityFilter || undefined,
      assignedTo: assigneeFilter || undefined,
      limit: 100, sort: 'order',
    };
    const results = await Promise.all(STATUSES.map((s) => getTasks({ ...baseFilters, status: s })));
    const failed = results.find((r) => !r.success);
    if (failed) { setFetchErr(failed.message); return; }
    const grouped = {};
    STATUSES.forEach((s, i) => { grouped[s] = results[i].tasks; });
    setTasksByStatus(grouped);
    setCounts(results[0].counts);
  }, [workspace?._id, debouncedSearch, priorityFilter, assigneeFilter, getTasks]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const removeTaskFromBoard = (taskId) => {
    setTasksByStatus((prev) => {
      const next = {};
      for (const s of STATUSES) next[s] = prev[s].filter((t) => t._id !== taskId);
      return next;
    });
    setCounts((prev) => {
      const st = STATUSES.find((s) => tasksByStatus[s]?.some((t) => t._id === taskId));
      if (!st) return prev;
      return { ...prev, [st]: Math.max(0, prev[st] - 1) };
    });
  };

  const handleDeleteFromCard = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    const result = await deleteTask(pendingDelete._id);
    setDeleteLoading(false);
    if (result.success) { removeTaskFromBoard(pendingDelete._id); setPendingDelete(null); showToast('Task deleted', 'success'); }
    else showToast(result.message || 'Failed to delete task');
  };

  const handleDeleteFromModal = (taskId) => {
    removeTaskFromBoard(taskId);
    setSelectedTask(null);
    showToast('Task deleted', 'success');
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasksByStatus((prev) => {
      const updated = {};
      for (const s of STATUSES) updated[s] = prev[s].map((t) => t._id === updatedTask._id ? updatedTask : t);
      if (updatedTask.status !== selectedTask?.status) {
        const removed = {};
        for (const s of STATUSES) removed[s] = updated[s].filter((t) => t._id !== updatedTask._id);
        removed[updatedTask.status] = [...removed[updatedTask.status], updatedTask];
        return removed;
      }
      return updated;
    });
    setSelectedTask(updatedTask);
  };

  const findTaskLocation = (taskId) => {
    for (const s of STATUSES) {
      const index = tasksByStatus[s].findIndex((t) => t._id === taskId);
      if (index !== -1) return { status: s, index };
    }
    return null;
  };

  const handleDragStart = (e) => { const loc = findTaskLocation(e.active.id); if (loc) setActiveTask(tasksByStatus[loc.status][loc.index]); };

  const handleDragOver = (e) => {
    const { active, over } = e; if (!over) return;
    const activeLoc = findTaskLocation(active.id); if (!activeLoc) return;
    const overIsCol = typeof over.id === 'string' && over.id.startsWith('column-');
    const destStatus = overIsCol ? over.id.replace('column-', '') : findTaskLocation(over.id)?.status;
    if (!destStatus || destStatus === activeLoc.status) return;
    setTasksByStatus((prev) => {
      const src = [...prev[activeLoc.status]];
      const [moved] = src.splice(activeLoc.index, 1);
      return { ...prev, [activeLoc.status]: src, [destStatus]: [...prev[destStatus], moved] };
    });
  };

  const handleDragEnd = async (e) => {
    const { active, over } = e; setActiveTask(null); if (!over) return;
    const activeLoc = findTaskLocation(active.id); if (!activeLoc) return;
    const overIsCol = typeof over.id === 'string' && over.id.startsWith('column-');
    const destStatus = overIsCol ? over.id.replace('column-', '') : findTaskLocation(over.id)?.status;
    if (!destStatus) return;
    const snapshot = tasksByStatus;
    let newList = [...tasksByStatus[destStatus]]; let newOrder;
    if (destStatus === activeLoc.status) {
      const oi = newList.findIndex((t) => t._id === active.id);
      const ni = overIsCol ? newList.length - 1 : newList.findIndex((t) => t._id === over.id);
      if (oi === ni || oi === -1) return;
      newList = arrayMove(newList, oi, ni); newOrder = ni;
      setTasksByStatus((prev) => ({ ...prev, [destStatus]: newList }));
    } else { newOrder = overIsCol ? newList.length - 1 : newList.findIndex((t) => t._id === over.id); if (newOrder === -1) newOrder = newList.length - 1; }
    const result = await updateTask(active.id, { status: destStatus, order: newOrder }, { silent: true });
    if (!result.success) {
      setTasksByStatus(snapshot);
      setDragErr(result.message || 'Failed to move task');
      setTimeout(() => setDragErr(''), 4000);
    } else {
      setCounts((prev) => {
        if (destStatus === activeLoc.status) return prev;
        return { ...prev, [activeLoc.status]: Math.max(0, prev[activeLoc.status] - 1), [destStatus]: prev[destStatus] + 1 };
      });
    }
  };

  if (wsLoading) return <div style={ws.centerPage}><p style={{ color: '#999', fontSize: 14 }}>Loading workspace…</p></div>;
  if (!workspace) return (
    <div style={ws.centerPage}>
      <p style={{ fontSize: 15, fontWeight: 600 }}>Workspace not found</p>
      <button onClick={() => navigate('/dashboard')} style={ws.primaryBtn}>← Back</button>
    </div>
  );

  const members = workspace.members || [];
  const totalTasks = counts.todo + counts['in-progress'] + counts.done;
  const hasActiveFilters = search || priorityFilter || assigneeFilter;

  return (
    <div style={{ ...ws.page, flexDirection: 'row' }}>

      {/* ── Main board area ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── Top bar ── */}
        <div style={ws.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/dashboard')} style={ws.backBtn}>←</button>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: workspace.color || '#6C63FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              {workspace.icon || '🏢'}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{workspace.name}</p>
              <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
                {members.length} members ·{' '}
                <span style={{ color: '#5FA021', fontWeight: 600 }}>{onlineCount} online</span>
                {' '}· {totalTasks} tasks
              </p>
            </div>

            {/* ── Compact avatar row with online dots ── NEW 4.3 ── */}
            <div style={{ marginLeft: 8 }}>
              <MemberList members={members} onlineIds={onlineIds} compact={true} max={4} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Members panel toggle */}
            <button
              onClick={() => setMembersOpen((p) => !p)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: membersOpen ? '#F0EEFF' : '#F5F5FB',
                color: membersOpen ? '#6C63FF' : '#666',
                border: membersOpen ? '1.5px solid #D4D0FF' : '1.5px solid #E0DFF5',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <OnlineDot online={onlineCount > 0} size={7} pulse={false} />
              {onlineCount} online
            </button>

            {/* Chat toggle */}
            <button
              onClick={() => setChatOpen((p) => !p)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: chatOpen ? '#F0EEFF' : '#F5F5FB',
                color: chatOpen ? '#6C63FF' : '#666',
                border: chatOpen ? '1.5px solid #D4D0FF' : '1.5px solid #E0DFF5',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              💬 Chat
            </button>

            {/* Analytics link — NEW 6.1 */}
            <button
              onClick={() => navigate(`/workspaces/${workspace._id}/analytics`)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: '#F5F5FB', color: '#666',
                border: '1.5px solid #E0DFF5',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              📊 Analytics
            </button>

            {/* AI Summary — NEW 8.1 */}
            <button
              onClick={() => setAiSummaryOpen(true)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: '#F0EEFF', color: '#6C63FF',
                border: '1.5px solid #D4D0FF',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              ✨ AI Summary
            </button>

            {/* Ask AI — NEW 8.1 */}
            <button
              onClick={() => setAiAskOpen((p) => !p)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: aiAskOpen ? '#F0EEFF' : '#F5F5FB',
                color: aiAskOpen ? '#6C63FF' : '#666',
                border: aiAskOpen ? '1.5px solid #D4D0FF' : '1.5px solid #E0DFF5',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              🤖 Ask AI
            </button>

            <button onClick={() => setCreateModalOpen(true)} style={ws.primaryBtn}>+ New task</button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div style={ws.filterBar}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#bbb' }}>🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" style={{ ...ws.filterInput, paddingLeft: 32 }} />
          </div>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ ...ws.filterInput, width: 130, cursor: 'pointer' }}>
            <option value="">All priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} style={{ ...ws.filterInput, width: 150, cursor: 'pointer' }}>
            <option value="">Everyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => <option key={m.user?._id || m.user} value={m.user?._id || m.user}>{m.user?.name}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(''); setPriorityFilter(''); setAssigneeFilter(''); }} style={ws.clearFiltersBtn}>
              Clear filters ✕
            </button>
          )}
        </div>

        {fetchErr && (
          <div style={{ margin: '0 32px 16px', padding: '10px 16px', borderRadius: 10, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 13 }}>
            ⚠ {fetchErr}
            <button onClick={fetchBoard} style={{ marginLeft: 8, color: '#A32D2D', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
          </div>
        )}

        {/* ── Kanban board ── */}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <main style={ws.board}>
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                count={counts[status]}
                loading={tasksLoading && tasksByStatus[status].length === 0}
                onTaskClick={setSelectedTask}
                onAddClick={() => setCreateModalOpen(true)}
                onDeleteTask={(task) => setPendingDelete(task)}
              />
            ))}
          </main>
          <DragOverlay>
            {activeTask ? <div style={{ width: 280, cursor: 'grabbing' }}><TaskCard task={activeTask} /></div> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Members presence panel ── NEW 4.3 ── */}
      <PresencePanel
        workspace={workspace}
        onlineIds={onlineIds}
        isOpen={membersOpen}
        onClose={() => setMembersOpen(false)}
      />

      {/* ── Chat panel ── */}
      <ChatPanel
        workspace={workspace}
        currentUser={user}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onlineIds={onlineIds}
      />

      {pendingDelete && (
        <CardDeleteConfirm
          task={pendingDelete}
          onConfirm={handleDeleteFromCard}
          onCancel={() => setPendingDelete(null)}
          loading={deleteLoading}
        />
      )}

      <Toast
        msg={toast.msg || dragErr}
        type={toast.msg ? toast.type : 'error'}
        onClose={() => { setToast({ msg: '', type: 'error' }); setDragErr(''); }}
      />

      <CreateTaskModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} workspace={workspace} onCreate={fetchBoard} />
      <AISummaryModal isOpen={aiSummaryOpen} onClose={() => setAiSummaryOpen(false)} workspaceId={workspace._id} workspaceName={workspace.name} />
      <AIAssistantPanel isOpen={aiAskOpen} onClose={() => setAiAskOpen(false)} workspaceId={workspace._id} />
      <TaskDetailModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask} workspace={workspace} onUpdated={handleTaskUpdated} onDeleted={handleDeleteFromModal} onSubtasksCreated={fetchBoard} />
    </div>
  );
}

const ws = {
  page: { minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1a1a2e', display: 'flex' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: 58, background: '#fff', borderBottom: '1px solid #E0DFF5', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 },
  backBtn: { width: 30, height: 30, borderRadius: 8, background: '#F5F5FB', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { padding: '9px 18px', borderRadius: 10, background: '#6C63FF', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  filterBar: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 32px', flexShrink: 0 },
  filterInput: { padding: '8px 12px', borderRadius: 9, border: '1.5px solid #E0DFF5', background: '#fff', color: '#1a1a2e', fontSize: 12.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  clearFiltersBtn: { padding: '8px 12px', borderRadius: 9, background: '#FCEBEB', color: '#A32D2D', border: '1px solid #F7C1C1', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  board: { flex: 1, display: 'flex', gap: 16, padding: '0 32px 32px', overflowX: 'auto', alignItems: 'flex-start' },
  centerPage: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: "'DM Sans', system-ui" },
};