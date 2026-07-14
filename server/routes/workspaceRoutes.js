// server/routes/workspaceRoutes.js — updated for Feature 2.3
// Adds invite + member management nested under /api/workspaces/:id

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createWorkspace,
  getWorkspaces,
  getRecentWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} = require('../controllers/workspaceController');
const {
  inviteMember,     // ← NEW Feature 2.3
  getInvites,        // ← NEW
  revokeInvite,       // ← NEW
  removeMember,        // ← NEW
} = require('../controllers/inviteController');

router.use(protect);

// IMPORTANT: /recent must come BEFORE /:id
router.get   ('/recent', getRecentWorkspaces);

router.post  ('/',    createWorkspace);
router.get   ('/',    getWorkspaces);
router.get   ('/:id', getWorkspace);
router.patch ('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

// ── Feature 2.3 — Invite & member management ──────────────────────────────────
router.post  ('/:id/invite',              inviteMember);   // POST   /api/workspaces/:id/invite
router.get   ('/:id/invites',             getInvites);      // GET    /api/workspaces/:id/invites
router.delete('/:id/invites/:inviteId',   revokeInvite);    // DELETE /api/workspaces/:id/invites/:inviteId
router.delete('/:id/members/:userId',     removeMember);    // DELETE /api/workspaces/:id/members/:userId

module.exports = router;