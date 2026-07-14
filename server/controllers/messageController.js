// server/controllers/messageController.js
// Feature 4.2 — REST endpoints for message history
//
// Why REST for history, not Socket.io?
// Socket.io is for real-time delivery of NEW messages.
// Loading history (e.g. when you open a workspace) is a one-time
// paginated read — REST + HTTP caching is a better fit for that.

const Message   = require('../models/Message');
const Workspace = require('../models/Workspace');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages?workspace=:id&page=1&limit=50
// Returns messages newest-first (client reverses for display).
// Cursor-based pagination would be ideal at scale; page/limit is fine here.
// ─────────────────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res, next) => {
  try {
    const { workspace: workspaceId, page = 1, limit = 50 } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'workspace query param is required' });
    }

    // Confirm membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip     = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      Message.find({ workspace: workspaceId, isDeleted: false })
        .populate('sender', 'name email')
        .sort({ createdAt: -1 })          // newest first
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments({ workspace: workspaceId, isDeleted: false }),
    ]);

    res.status(200).json({
      success: true,
      // Send messages in chronological order so the client can append directly
      messages: messages.reverse(),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum < Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};