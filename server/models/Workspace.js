// server/models/Workspace.js
// Feature 2.1 — Workspace model
//
// A workspace is the top-level container for all collaboration.
// One user OWNS it; multiple users can be MEMBERS of it.
// Every task, chat message, and notification will reference a workspace.

const mongoose = require('mongoose');

// ── Member sub-schema ─────────────────────────────────────────────────────────
// Storing role per member lets us add permissions later (admin / member / viewer)
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }  // no extra _id on each member entry
);

// ── Workspace schema ──────────────────────────────────────────────────────────
const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: '',
    },
    // Emoji or color to identify the workspace visually in the sidebar
    icon: {
      type: String,
      default: '🏢',
      maxlength: [10, 'Icon too long'],
    },
    color: {
      type: String,
      default: '#6C63FF',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code'],
    },
    // The user who created the workspace — always also in members[] as 'owner'
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // All members including the owner
    members: {
      type: [memberSchema],
      default: [],
    },
    // Soft-delete: archived workspaces are hidden but not removed from DB
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,     // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: memberCount ──────────────────────────────────────────────────────
// Returns the number of members without storing it in the DB
workspaceSchema.virtual('memberCount').get(function () {
  return this.members.length || 0;
});

// ── Instance method: isMember ─────────────────────────────────────────────────
// Usage: workspace.isMember(userId) → true/false
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.user.toString() === userId.toString());
};

// ── Instance method: isOwner ──────────────────────────────────────────────────
workspaceSchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString();
};

// ── Index: fast lookup of workspaces by owner ─────────────────────────────────
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });  // fast member lookup

module.exports = mongoose.model('Workspace', workspaceSchema);