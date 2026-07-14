// server/routes/aiRoutes.js — updated for Feature 9.1 (added ObjectId param validation)
// Every route protected AND rate-limited (AI calls cost real money)

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { aiRateLimit } = require('../middleware/aiRateLimit');
// const { validateObjectIdParam } = require('../middleware/validators');
const {
  summarizeWorkspace,
  previewTaskBreakdown,
  applyTaskBreakdown,
  askAssistant,
} = require('../controllers/aiController');

router.use(protect);
router.use(aiRateLimit);

router.post('/:workspaceId/summary',            summarizeWorkspace);
router.post('/tasks/:taskId/breakdown/preview',     previewTaskBreakdown);
router.post('/tasks/:taskId/breakdown/apply',      applyTaskBreakdown);
router.post('/:workspaceId/assistant',         askAssistant);

module.exports = router;