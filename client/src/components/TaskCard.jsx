// src/components/TaskCard.jsx — updated for Feature 3.4
// CHANGE: a 🗑 button appears on hover at the top-right of the card.
// Clicking it calls onDelete(task) without opening the detail modal,
// triggering the delete confirmation inline on the board (WorkspaceView handles it).
// The drag behavior from 3.3 is unchanged.

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function Avatar({ name, size = 24 }) {
  const colors = ['#6C63FF', '#E24B4A', '#EF9F27', '#3B6D11', '#185FA5', '#993556'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  const initials = (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div title={name} style={{ width: size, height: size, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function PriorityTag({ priority }) {
  const map = {
    low:    { color: '#3B6D11', bg: '#EAF3DE', label: 'Low' },
    medium: { color: '#854F0B', bg: '#FFF4E0', label: 'Medium' },
    high:   { color: '#A32D2D', bg: '#FCEBEB', label: 'High' },
  };
  const p = map[priority] || map.medium;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, color: p.color, background: p.bg, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {p.label}
    </span>
  );
}

export default function TaskCard({ task, onClick, onDelete }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task._id, data: { task } });

  const [hovered, setHovered] = useState(false);

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isDragging && onClick?.(task)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: '#fff', borderRadius: 12,
        border: hovered && !isDragging ? '1px solid #D4D0FF' : '1px solid #E0DFF5',
        padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging
          ? '0 8px 24px rgba(108,99,255,0.18)'
          : hovered ? '0 4px 16px rgba(108,99,255,0.10)' : 'none',
        position: 'relative',
      }}
    >
      {/* ── Trash icon — appears on hover, not during drag ── */}
      {hovered && !isDragging && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // don't open the detail modal
            onDelete(task);
          }}
          title="Delete task"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 24, height: 24, borderRadius: 7,
            background: '#FCEBEB', border: '1px solid #F7C1C1',
            cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#E24B4A', flexShrink: 0,
            // Must stop pointer events from reaching drag listeners
            pointerEvents: 'all',
            zIndex: 10,
          }}
        >
          🗑
        </button>
      )}

      {/* Title — right-padded to not overlap trash button when hovered */}
      <p style={{
        fontSize: 13.5, fontWeight: 600, color: '#1a1a2e', margin: 0, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        pointerEvents: 'none',
        paddingRight: hovered && !isDragging ? 24 : 0,
      }}>
        {task.aiGenerated && <span title="Created via AI task breakdown" style={{ marginRight: 5 }}>✨</span>}
        {task.title}
      </p>

      {/* Description preview */}
      {task.description && (
        <p style={{ fontSize: 12, color: '#999', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', pointerEvents: 'none' }}>
          {task.description}
        </p>
      )}

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <PriorityTag priority={task.priority} />
          {task.dueDate && (
            <span style={{ fontSize: 10.5, color: isOverdue ? '#E24B4A' : '#bbb', fontWeight: isOverdue ? 600 : 400, whiteSpace: 'nowrap' }}>
              {isOverdue ? '⚠ ' : ''}
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {/* Attachment count — NEW 7.1 */}
          {task.attachments?.length > 0 && (
            <span style={{ fontSize: 10.5, color: '#bbb', display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
              📎 {task.attachments.length}
            </span>
          )}
        </div>
        {task.assignedTo ? (
          <Avatar name={task.assignedTo.name} />
        ) : (
          <div title="Unassigned" style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed #E0DFF5', flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
}