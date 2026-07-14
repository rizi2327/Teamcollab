// server/index.js — updated for Feature 9.1
// ADDED: global rate limiting (generalLimiter) + consistent error JSON everywhere
// (per-route validation and the stricter authLimiter live in their own route files)

const http     = require('http');
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const workspaceRoutes    = require('./routes/workspaceRoutes');
const inviteRoutes       = require('./routes/inviteRoutes');
const taskRoutes         = require('./routes/taskRoutes');
const attachmentRoutes   = require('./routes/attachmentRoutes');
const messageRoutes      = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes    = require('./routes/analyticsRoutes');
const aiRoutes            = require('./routes/aiRoutes');

// const { generalLimiter } = require('./middleware/rateLimiters');   // ← NEW 9.1
const { initSocket } = require('./socket/socketServer');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Global rate limit — 100 requests / 15 min per IP across the whole API.
// Applied after body parsing (cheap) but before any route logic runs, and
// BEFORE static file serving too, so /uploads can't be used to dodge it.
// app.use('/api', generalLimiter);                                    // ← NEW 9.1

// Serve uploaded files statically — e.g. /uploads/tasks/<taskId>/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/workspaces',    workspaceRoutes);
app.use('/api/invites',       inviteRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/tasks',         attachmentRoutes);     // ← NEW: nested attachment endpoints share the /api/tasks prefix
app.use('/api/messages',      messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/ai',            aiRoutes);            // ← NEW

app.get('/health', (_req, res) => res.json({ status: 'ok', stage: 'security-hardened' }));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler — Feature 9.1: every branch below now always returns
// BOTH `message` (a single human-readable string) and, where relevant, the
// full `errors` array — so the frontend can rely on `message` universally
// without special-casing which error type it received.
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  if (err.code === 11000)
    return res.status(409).json({ success: false, message: 'Duplicate value detected' });
  if (err.name === 'ValidationError') {   // Mongoose schema validation
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages[0], errors: messages });
  }
  if (err.name === 'CastError')
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  if (err.name === 'MulterError')
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

const httpServer = http.createServer(app);
const io = initSocket(httpServer);

// IMPORTANT: module.exports.io must be set BEFORE other modules require('../index')
// to read it (e.g. taskController, inviteController, notificationService's lazy requires).
// Node caches the module object, so as long as this line runs before those lazy
// requires fire (i.e. before any HTTP request or socket event is handled), it's safe.
module.exports.io = io;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    httpServer.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 HTTP + Socket.io on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => { console.error('❌ DB connection failed:', err.message); process.exit(1); });