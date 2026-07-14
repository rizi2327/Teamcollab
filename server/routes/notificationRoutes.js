// server/routes/notificationRoutes.js
// Feature 5.1 — all routes protected, scoped to req.user

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

router.use(protect);

// IMPORTANT: specific routes before /:id to avoid Express treating
// "unread-count" or "mark-all-read" as an :id param
router.get   ('/unread-count',  getUnreadCount);
router.patch ('/mark-all-read', markAllAsRead);

router.get   ('/',        getNotifications);
router.patch ('/:id/read', markAsRead);
router.delete('/:id',      deleteNotification);

module.exports = router;