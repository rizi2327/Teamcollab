// server/routes/inviteRoutes.js
// Feature 2.3 — Standalone /api/invites/:token routes
// These are SEPARATE from /api/workspaces/:id/invite because they operate
// on a TOKEN, not a workspace ID, and the preview endpoint needs partial
// public access (so the frontend can show invite details before login).

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getInvitePreview,
  acceptInvite,
  declineInvite,
} = require('../controllers/inviteController');

// Preview does NOT require login — shows "You're invited to X" before signup/login
router.get('/:token', getInvitePreview);                  // GET  /api/invites/:token

// Accept/decline DO require login — must verify the invite email matches the user
router.post('/:token/accept',  protect, acceptInvite);     // POST /api/invites/:token/accept
router.post('/:token/decline', protect, declineInvite);    // POST /api/invites/:token/decline

module.exports = router;