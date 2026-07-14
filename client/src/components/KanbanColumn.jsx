// src/components/KanbanColumn.jsx — updated for Feature 3.4
// CHANGE: onDeleteTask prop threaded through to each TaskCard's onDelete.

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import '../styles/KanbanColumn.css';

const COLUMN_CONFIG = {
  'todo':        { label: 'To Do',       color: '#888',    bg: '#F5F5FB', dot: '#bbb' },
  'in-progress': { label: 'In Progress', color: '#185FA5', bg: '#E6F1FB', dot: '#3B8FE0' },
  'done':        { label: 'Done',        color: '#3B6D11', bg: '#EAF3DE', dot: '#5FA021' },
};

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__line" />
      <div className="skeleton-card__line skeleton-card__line--short" />
    </div>
  );
}

export default function KanbanColumn({ status, tasks, count, loading, onTaskClick, onAddClick, onDeleteTask }) {
  const cfg = COLUMN_CONFIG[status];

  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });

  const taskIds = tasks.map((t) => t._id);

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'kanban-column--over' : ''}`}
    >
      {/* ── Column header ── */}
      <div className="kanban-column__header">
        <div className="kanban-column__header-left">
          <span className="kanban-column__dot" style={{ '--dot-color': cfg.dot }} />
          <span className="kanban-column__label">{cfg.label}</span>
          <span
            className="kanban-column__count"
            style={{ '--count-color': cfg.color, '--count-bg': cfg.bg }}
          >
            {count ?? tasks.length}
          </span>
        </div>

        {status === 'todo' && (
          <button onClick={onAddClick} title="Add task" className="kanban-column__add-btn">
            +
          </button>
        )}
      </div>

      {/* ── Cards ── */}
      <div className="kanban-column__list">
        {loading ? (
          [1, 2].map((i) => <SkeletonCard key={i} />)
        ) : (
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="kanban-column__empty">
                <p className="kanban-column__empty-text">
                  {isOver ? 'Drop here' : 'No tasks'}
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onClick={onTaskClick}
                  onDelete={onDeleteTask}   // ← NEW 3.4
                />
              ))
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}