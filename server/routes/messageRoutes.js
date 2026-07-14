// server/routes/messageRoutes.js
// Feature 4.2 — REST route for chat history

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMessages } = require('../controllers/messageController');

router.use(protect);

router.get('/', getMessages);  // GET /api/messages?workspace=:id&page=1&limit=50

module.exports = router;