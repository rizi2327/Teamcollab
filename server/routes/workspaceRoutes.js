// server/routes/workspaceRoutes.js — updated for Feature 9.1 (added validators)
// Adds invite + member management nested under /api/workspaces/:id

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  workspaceCreateValidator,
  workspaceUpdateValidator,
  inviteMemberValidator,
  validateObjectIdParam,
} = require('../middleware/validators');
const {
  createWorkspace,
  getWorkspaces,
  getRecentWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} = require('../controllers/workspaceController');
const {
  inviteMember,
  getInvites,
  revokeInvite,
  removeMember,
} = require('../controllers/inviteController');

router.use(protect);

// IMPORTANT: /recent must come BEFORE /:id
router.get   ('/recent', getRecentWorkspaces);

router.post  ('/',    workspaceCreateValidator,                   createWorkspace);
router.get   ('/',    getWorkspaces);
router.get   ('/:id', validateObjectIdParam('id'),                 getWorkspace);
router.patch ('/:id', validateObjectIdParam('id'), workspaceUpdateValidator, updateWorkspace);
router.delete('/:id', validateObjectIdParam('id'),                 deleteWorkspace);

// ── Feature 2.3 — Invite & member management ──────────────────────────────────
router.post  ('/:id/invite',              validateObjectIdParam('id'), inviteMemberValidator, inviteMember);
router.get   ('/:id/invites',             validateObjectIdParam('id'), getInvites);
router.delete('/:id/invites/:inviteId',   revokeInvite);
router.delete('/:id/members/:userId',     removeMember);

module.exports = router;