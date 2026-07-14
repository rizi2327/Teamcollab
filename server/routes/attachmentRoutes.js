// server/routes/attachmentRoutes.js
// Feature 7.1 — nested under /api/tasks (mounted alongside taskRoutes in index.js)

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
} = require('../controllers/attachmentController');

router.use(protect);

// Wrap multer so its errors (file too large, wrong type, etc.) reach our
// global JSON error handler instead of crashing with an HTML stack trace.
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(400).json({ success: false, message: 'That file type is not supported' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File is too large — max 10MB' });
      }
      return next(err);
    }
    next();
  });
}

router.post  ('/:id/attachments',                 handleUpload, uploadAttachment);
router.get   ('/:id/attachments',                 getAttachments);
router.delete('/:id/attachments/:attachmentId',   deleteAttachment);

module.exports = router;