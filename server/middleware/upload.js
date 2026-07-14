// server/middleware/upload.js
// Feature 7.1 — multer config for task file attachments
//
// Stores files on local disk under /uploads/tasks/<taskId>/ — simple and fine
// for a portfolio/dev deployment. For production, swap `storage` below for a
// multer-storage-cloudinary or multer-s3 engine; the rest of the upload
// pipeline (fileFilter, limits, attachmentController) stays the same because
// it only depends on `req.file.{filename,mimetype,size}`, not on where the
// bytes physically land.

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'tasks');

// Allow the common set of files a team would actually attach to a task.
// Executables / scripts are deliberately excluded.
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'text/plain', 'text/csv',
  'application/zip',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ── Disk storage ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Unique on disk (timestamp + random suffix) — originalName is preserved
    // separately in the Task.attachments subdocument for display/download.
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
    return cb(new Error('UNSUPPORTED_FILE_TYPE'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

module.exports = { upload, UPLOAD_ROOT, MAX_FILE_SIZE };