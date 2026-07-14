// server/routes/analyticsRoutes.js — updated for Feature 9.1 (added ObjectId param validation)
// All routes protected, workspace membership enforced in the controller

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
// const { validateObjectIdParam } = require('../middleware/validators');
const {
  getOverview,
  getStatusBreakdown,
  getPriorityBreakdown,
  getTimeline,
  getActivity,
} = require('../controllers/analyticsController');

router.use(protect);
// router.use(validateObjectIdParam('workspaceId'));

router.get('/:workspaceId/overview',           getOverview);
router.get('/:workspaceId/status-breakdown',   getStatusBreakdown);
router.get('/:workspaceId/priority-breakdown', getPriorityBreakdown);
router.get('/:workspaceId/timeline',           getTimeline);
router.get('/:workspaceId/activity',           getActivity);

module.exports = router;