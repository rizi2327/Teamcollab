// server/models/Task.js
// Feature 3.1 — Task model
// Feature 7.1 — added `attachments` array for file uploads
// Feature 8.1 — added `parentTask` / `aiGenerated` for AI task breakdown
//
// A task always belongs to exactly one workspace.
// status drives the Kanban board columns (Feature 3.2).
// assignedTo is optional — a task can be unassigned.

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    // Optional — task can exist without being assigned to anyone yet
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    // Manual ordering within a Kanban column — used for drag & drop in Feature 3.3
    order: {
      type: Number,
      default: 0,
    },
    // Soft-delete, consistent with Workspace's isArchived pattern
    isArchived: {
      type: Boolean,
      default: false,
    },
    // Files attached to this task — Feature 7.1
    attachments: {
      type: [
        {
          filename: { type: String, required: true },      // stored disk filename (sanitized + unique)
          originalName: { type: String, required: true },   // name shown to users
          url: { type: String, required: true },             // public path, e.g. /uploads/tasks/<taskId>/<filename>
          mimetype: { type: String, required: true },
          size: { type: Number, required: true },            // bytes
          uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // Feature 8.1 — set when this task was created via the AI "break down
    // this task" flow, so the frontend can show a subtle "✨ AI-generated"
    // badge and so subtasks can be grouped back under their parent.
    parentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Instance method: isOverdue ────────────────────────────────────────────────
taskSchema.methods.isOverdue = function () {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'done';
};

// ── Indexes for common query patterns ─────────────────────────────────────────
taskSchema.index({ workspace: 1, status: 1 });   // Kanban board queries (Feature 3.2)
taskSchema.index({ workspace: 1, isArchived: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ parentTask: 1 });              // Feature 8.1 — group AI-generated subtasks

module.exports = mongoose.model('Task', taskSchema);