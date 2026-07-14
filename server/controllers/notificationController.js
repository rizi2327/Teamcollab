// server/controllers/notificationController.js
// Feature 5.1 — REST endpoints for the notification dropdown

const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications?page=1&limit=20&unreadOnly=false
// ─────────────────────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.read = false;

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('actor', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// Lightweight endpoint — called on app load to show the badge without
// fetching the full notification list.
// ─────────────────────────────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });
    res.status(200).json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// Mark a single notification as read
// ─────────────────────────────────────────────────────────────────────────────
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,   // can only mark your own notifications
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ success: true, notification });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/mark-all-read
// ─────────────────────────────────────────────────────────────────────────────
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};