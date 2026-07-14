// server/models/Notification.js
// Feature 5.1 — Notification model
//
// A notification always belongs to one recipient. It optionally references
// the workspace, task, or sender that triggered it so the frontend can
// deep-link or show rich context (avatar, task title, etc.)

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,        // every query is scoped to "my notifications"
    },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'task_status_changed',
        'message_received',
        'invite_received',
        'invite_accepted',
        'member_removed',
        'attachment_added',
      ],
      required: true,
    },
    // Human-readable message, pre-rendered server-side so the frontend
    // doesn't need type-specific formatting logic for every notification type.
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    // The user who caused this notification (assigner, sender, inviter, etc.)
    // Optional because some notifications are system-generated.
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
    },
    // Optional references for deep-linking the frontend to the right place
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,         // fast "unread count" queries
    },
  },
  { timestamps: true }
);

// ── Compound index: recipient + read + createdAt ──────────────────────────────
// Covers the two most common queries:
//   1. "all my notifications, newest first"
//   2. "count of my unread notifications"
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);