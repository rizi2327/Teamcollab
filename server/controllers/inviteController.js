// server/controllers/inviteController.js
// FINAL version after Feature 5.1 — notification triggers added
//
// Feature 2.3 — full invite/member CRUD (unchanged logic)
// Feature 5.1 — notify(io, ...) calls added at 3 points:
//   1. inviteMember  → if the invitee already has an account, notify them directly
//   2. acceptInvite  → notify the original inviter that their invite was accepted
//   3. removeMember  → notify the removed user

const Invite    = require('../models/Invite');
const Workspace = require('../models/Workspace');
const User      = require('../models/User');
const { notify } = require('../services/notificationService');   // ← NEW 5.1

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces/:id/invite
// ─────────────────────────────────────────────────────────────────────────────
exports.inviteMember = async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;
    const workspaceId = req.params.id;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "admin" or "member"' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const myMembership = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    const canInvite = myMembership && ['owner', 'admin'].includes(myMembership.role);

    if (!canInvite) {
      return res.status(403).json({
        success: false,
        message: 'Only the workspace owner or an admin can invite members',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && workspace.isMember(existingUser._id)) {
      return res.status(409).json({
        success: false,
        message: 'This person is already a member of the workspace',
      });
    }

    const existingInvite = await Invite.findOne({
      workspace: workspaceId,
      email: normalizedEmail,
      status: 'pending',
    });
    if (existingInvite) {
      return res.status(409).json({
        success: false,
        message: 'An invite has already been sent to this email',
      });
    }

    const token = Invite.generateToken();
    const invite = await Invite.create({
      workspace: workspaceId,
      email: normalizedEmail,
      role,
      invitedBy: req.user._id,
      token,
    });

    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invites/${token}`;
    console.log(`📧 Invite link for ${normalizedEmail}: ${inviteLink}`);

    // ── NEW 5.1: if the invitee already has an account, notify them in-app ──
    // (If they don't have an account yet, there's no recipient to notify until
    //  they register — at that point they'd need to click the link from email anyway.)
    if (existingUser) {
      const { io } = require('../index');
      await notify(io, {
        recipient: existingUser._id,
        type:      'invite_received',
        message:   `${req.user.name} invited you to join "${workspace.name}"`,
        actor:     req.user._id,
        workspace: workspace._id,
        // Note: the invite token itself isn't stored on the notification —
        // clicking it routes to /dashboard (Notification model has no generic
        // `data` field by design; see Notification.js for the normalized-ref
        // rationale). The user can find the workspace from there once a member.
      });
    }

    res.status(201).json({
      success: true,
      message: existingUser
        ? `Invite sent to ${normalizedEmail}`
        : `Invite sent to ${normalizedEmail} (they'll need to create an account first)`,
      invite: {
        _id:        invite._id,
        email:      invite.email,
        role:       invite.role,
        status:     invite.status,
        expiresAt:  invite.expiresAt,
        createdAt:  invite.createdAt,
      },
      ...(process.env.NODE_ENV !== 'production' && { devInviteLink: inviteLink }),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An invite has already been sent to this email',
      });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:id/invites
// ─────────────────────────────────────────────────────────────────────────────
exports.getInvites = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const myMembership = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const invites = await Invite.find({
      workspace: req.params.id,
      status: 'pending',
    })
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invites });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invites/:token/accept
// Feature 5.1 adds: notify the original inviter that their invite was accepted
// ─────────────────────────────────────────────────────────────────────────────
exports.acceptInvite = async (req, res, next) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token }).select('+token');

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found or already used' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invite has already been ${invite.status}`,
      });
    }

    if (invite.isExpired()) {
      invite.status = 'expired';
      await invite.save();
      return res.status(400).json({ success: false, message: 'This invite has expired' });
    }

    if (req.user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'This invite was sent to a different email address',
      });
    }

    const workspace = await Workspace.findById(invite.workspace);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace no longer exists' });
    }

    if (workspace.isMember(req.user._id)) {
      invite.status = 'accepted';
      await invite.save();
      return res.status(200).json({ success: true, message: 'You are already a member', workspace });
    }

    workspace.members.push({
      user: req.user._id,
      role: invite.role,
      joinedAt: new Date(),
    });
    await workspace.save();
    await workspace.populate('members.user', 'name email');

    invite.status = 'accepted';
    await invite.save();

    // ── NEW 5.1: notify the person who sent the invite ───────────────────────
    const { io } = require('../index');
    await notify(io, {
      recipient: invite.invitedBy,
      type:      'invite_accepted',
      message:   `${req.user.name} accepted your invite to "${workspace.name}"`,
      actor:     req.user._id,
      workspace: workspace._id,
    });

    res.status(200).json({
      success: true,
      message: `Welcome to ${workspace.name}!`,
      workspace,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invites/:token/decline
// ─────────────────────────────────────────────────────────────────────────────
exports.declineInvite = async (req, res, next) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token });

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, message: `This invite was already ${invite.status}` });
    }

    invite.status = 'declined';
    await invite.save();

    res.status(200).json({ success: true, message: 'Invite declined' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invites/:token
// ─────────────────────────────────────────────────────────────────────────────
exports.getInvitePreview = async (req, res, next) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token })
      .populate('workspace', 'name icon color')
      .populate('invitedBy', 'name email');

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found or already used' });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, message: `This invite was already ${invite.status}` });
    }
    if (invite.isExpired()) {
      invite.status = 'expired';
      await invite.save();
      return res.status(400).json({ success: false, message: 'This invite has expired' });
    }

    res.status(200).json({
      success: true,
      invite: {
        email:     invite.email,
        role:      invite.role,
        workspace: invite.workspace,
        invitedBy: invite.invitedBy,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:id/invites/:inviteId
// ─────────────────────────────────────────────────────────────────────────────
exports.revokeInvite = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const myMembership = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const invite = await Invite.findOneAndDelete({
      _id: req.params.inviteId,
      workspace: req.params.id,
    });

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    res.status(200).json({ success: true, message: 'Invite revoked' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:id/members/:userId
// Feature 5.1 adds: notify the removed member
// ─────────────────────────────────────────────────────────────────────────────
exports.removeMember = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const myMembership = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const targetId = req.params.userId;

    if (workspace.isOwner(targetId)) {
      return res.status(400).json({ success: false, message: 'Cannot remove the workspace owner' });
    }

    const targetMembership = workspace.members.find((m) => m.user.toString() === targetId);
    if (!targetMembership) {
      return res.status(404).json({ success: false, message: 'Member not found in this workspace' });
    }
    if (targetMembership.role === 'admin' && myMembership.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only the owner can remove an admin' });
    }

    const workspaceName = workspace.name; // capture before any mutation, used in notification text

    workspace.members = workspace.members.filter((m) => m.user.toString() !== targetId);
    await workspace.save();
    await workspace.populate('members.user', 'name email');

    // ── NEW 5.1: notify the removed user ─────────────────────────────────────
    const { io } = require('../index');
    await notify(io, {
      recipient: targetId,
      type:      'member_removed',
      message:   `${req.user.name} removed you from "${workspaceName}"`,
      actor:     req.user._id,
      workspace: workspace._id,
    });

    res.status(200).json({ success: true, message: 'Member removed', workspace });
  } catch (err) {
    next(err);
  }
};