// server/models/Message.js
// Feature 4.2 — Workspace chat messages
//
// Every message belongs to one workspace and one sender.
// Messages are immutable after creation (no edit/delete for now — Stage 9 hardening).
// We store them in MongoDB so chat history persists across page reloads.

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,            // fast workspace-scoped queries
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    // Optional: reference a task mentioned in the message (for future rich linking)
    referencedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    // Soft-delete for future moderation support
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,          // never returned unless explicitly requested
    },
  },
  {
    timestamps: true,         // createdAt used for chronological ordering
  }
);

// ── Compound index: workspace + createdAt ─────────────────────────────────────
// The chat history query is always scoped to a workspace and sorted by time.
messageSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);