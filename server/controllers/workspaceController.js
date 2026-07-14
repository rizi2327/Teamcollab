// server/controllers/workspaceController.js
// FINAL version after Feature 2.2 — full CRUD + optimized listing
//
// Feature 2.1 — createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace
// Feature 2.2 — getWorkspaces (production version), getRecentWorkspaces
// Feature 2.3 — will add: inviteMember, removeMember

const Workspace = require('../models/Workspace');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workspaces
// Create a new workspace. Creator is automatically added as owner+member.
// ─────────────────────────────────────────────────────────────────────────────
exports.createWorkspace = async (req, res, next) => {
  try {
    const { name, description, icon, color } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name must be at least 2 characters',
      });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name cannot exceed 50 characters',
      });
    }

    const existingCount = await Workspace.countDocuments({ owner: req.user._id });
    if (existingCount >= 20) {
      return res.status(400).json({
        success: false,
        message: 'You can own a maximum of 20 workspaces',
      });
    }

    const workspace = await Workspace.create({
      name:        name.trim(),
      description: description?.trim() || '',
      icon:        icon || '🏢',
      color:       color || '#6C63FF',
      owner:       req.user._id,
      members: [
        { user: req.user._id, role: 'owner', joinedAt: new Date() },
      ],
    });

    await workspace.populate('members.user', 'name email');

    res.status(201).json({
      success:   true,
      message:   'Workspace created successfully',
      workspace,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces
// Feature 2.2 — Production listing endpoint.
// Returns all workspaces the user is a member of, sorted by recent activity.
// Uses .lean() for speed since this is read-only and feeds the Sidebar + Dashboard.
// ─────────────────────────────────────────────────────────────────────────────
exports.getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
      isArchived: false,
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    // .lean() returns plain objects, so virtuals (memberCount) are skipped —
    // add the fields manually so the frontend doesn't need extra logic.
    const withExtras = workspaces.map((w) => ({
      ...w,
      memberCount: w.members.length,
      myRole: w.members.find(
        (m) => (m.user?._id || m.user).toString() === req.user._id.toString()
      )?.role || 'member',
    }));

    res.status(200).json({
      success:    true,
      count:      withExtras.length,
      workspaces: withExtras,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/recent
// Feature 2.2 — Lightweight endpoint for a "recently active" quick-switcher.
// Returns only 5 workspaces with minimal fields (fast, small payload).
// ─────────────────────────────────────────────────────────────────────────────
exports.getRecentWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
      isArchived: false,
    })
      .select('name icon color updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({ success: true, workspaces });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workspaces/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, workspace });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/workspaces/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.updateWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    if (!workspace.isOwner(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the workspace owner can update settings',
      });
    }

    const { name, description, icon, color } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim() || name.trim().length < 2)
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
      updates.name = name.trim();
    }
    if (description !== undefined) updates.description = description.trim();
    if (icon        !== undefined) updates.icon        = icon;
    if (color       !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(color))
        return res.status(400).json({ success: false, message: 'Color must be a valid hex code e.g. #6C63FF' });
      updates.color = color;
    }

    // updatedAt changes automatically (timestamps: true) — this is what
    // makes the workspace bubble to the top of "recent" / sidebar order
    const updated = await Workspace.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    res.status(200).json({
      success:   true,
      message:   'Workspace updated',
      workspace: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:id  (soft-delete / archive)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    if (!workspace.isOwner(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the workspace owner can delete it',
      });
    }

    workspace.isArchived = true;
    await workspace.save();

    res.status(200).json({ success: true, message: 'Workspace archived successfully' });
  } catch (err) {
    next(err);
  }
};