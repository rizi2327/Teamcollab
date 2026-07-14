// src/components/AttachmentList.jsx
// Feature 7.1 — file list + upload dropzone for TaskDetailModal
//
// Props:
//   taskId       {string}
//   attachments  {array}                     — task.attachments
//   currentUser  {object}                    — { _id, ... }
//   isWorkspaceOwner {boolean}                — can delete anyone's file
//   onUploaded   {(attachment) => void}
//   onDeleted    {(attachmentId) => void}

import { useRef, useState } from 'react';
import { useAttachments } from '../hooks/useAttachments';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Strip the trailing /api so file URLs (which are server-root-relative) resolve correctly
const FILE_ORIGIN = API_URL.replace(/\/api\/?$/, '');

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimetype) {
  if (mimetype.startsWith('image/')) return '🖼️';
  if (mimetype === 'application/pdf') return '📄';
  if (mimetype.includes('word')) return '📝';
  if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊';
  if (mimetype === 'application/zip') return '🗜️';
  if (mimetype === 'text/csv') return '📈';
  return '📎';
}

export default function AttachmentList({ taskId, attachments = [], currentUser, isWorkspaceOwner, onUploaded, onDeleted }) {
  const { uploading, progress, deletingId, error, uploadAttachment, deleteAttachment } = useAttachments();
  const [localErr, setLocalErr] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    setLocalErr('');
    if (file.size > 10 * 1024 * 1024) {
      setLocalErr('File is too large — max 10MB');
      return;
    }
    const result = await uploadAttachment(taskId, file);
    if (result.success) {
      onUploaded?.(result.attachment);
    } else {
      setLocalErr(result.message);
    }
  };

  const handleDelete = async (attachmentId) => {
    const result = await deleteAttachment(taskId, attachmentId);
    if (result.success) onDeleted?.(attachmentId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={styles.label}>Attachments {attachments.length > 0 && `(${attachments.length})`}</span>

      {/* ── File list ── */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map((a) => {
            const canDelete = isWorkspaceOwner || (a.uploadedBy?._id || a.uploadedBy) === currentUser?._id;
            return (
              <div key={a._id} style={styles.row}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(a.mimetype)}</span>
                <a
                  href={`${FILE_ORIGIN}${a.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.fileName}
                  title={a.originalName}
                >
                  {a.originalName}
                </a>
                <span style={styles.fileMeta}>{formatSize(a.size)}</span>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a._id)}
                    disabled={deletingId === a._id}
                    title="Delete file"
                    style={{ ...styles.deleteBtn, opacity: deletingId === a._id ? 0.5 : 1 }}
                  >
                    {deletingId === a._id ? '…' : '✕'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload dropzone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          ...styles.dropzone,
          borderColor: dragOver ? '#6C63FF' : '#E0DFF5',
          background: dragOver ? '#F0EEFF' : '#FAFAFE',
          cursor: uploading ? 'not-allowed' : 'pointer',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div style={{ width: '100%' }}>
            <p style={{ fontSize: 12, color: '#6C63FF', margin: '0 0 6px', fontWeight: 600 }}>Uploading… {progress}%</p>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: '#999' }}>
            📎 Click or drag a file here to attach <span style={{ color: '#bbb' }}>(max 10MB)</span>
          </span>
        )}
      </div>

      {(localErr || error) && (
        <p style={{ fontSize: 12, color: '#A32D2D', margin: 0, fontWeight: 500 }}>⚠ {localErr || error}</p>
      )}
    </div>
  );
}

const styles = {
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  row: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 9, border: '1px solid #E0DFF5', background: '#fff',
  },
  fileName: {
    flex: 1, minWidth: 0, fontSize: 12.5, color: '#1a1a2e', fontWeight: 500,
    textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  fileMeta: { fontSize: 11, color: '#bbb', flexShrink: 0 },
  deleteBtn: {
    width: 20, height: 20, borderRadius: 6, border: 'none', background: '#FCEBEB',
    color: '#E24B4A', fontSize: 11, cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropzone: {
    border: '1.5px dashed #E0DFF5', borderRadius: 10, padding: '14px 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    transition: 'all .15s',
  },
  progressTrack: { height: 5, borderRadius: 99, background: '#F0EEF5', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, background: '#6C63FF', transition: 'width .2s' },
};