// server/models/Invite.js
// Feature 2.3 — Invite Members
//
// WHY A SEPARATE MODEL (not just pushing straight into Workspace.members)?
// The person being invited might not have an account yet, or might want
// to decline. We need a pending state with a unique, expiring token —
// exactly like the password-reset pattern. Once accepted, we push the
// user into Workspace.members and mark this invite as 'accepted'.

const mongoose = require('mongoose');
const crypto   = require('crypto');

const inviteSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      select: false,   // never returned in normal queries — only when explicitly selected
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      // 7 days from creation by default
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// ── Prevent duplicate PENDING invites to the same email for the same workspace ──
// (a user CAN be re-invited after a previous invite was declined/expired)
inviteSchema.index(
  { workspace: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

// ── Static: generate a secure random token ────────────────────────────────────
inviteSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

// ── Instance method: check if expired ──────────────────────────────────────────
inviteSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

module.exports = mongoose.model('Invite', inviteSchema);