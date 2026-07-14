// server/middleware/aiRateLimit.js
// Feature 8.1 — AI endpoints are expensive (real API cost + latency), so
// they get a much stricter limit than the general API. Stage 9 will add a
// global rate limiter for every route; this one ships now because shipping
// the AI features without it would let a single user rack up unbounded
// OpenAI cost immediately.

const rateLimit = require('express-rate-limit');

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                  // 15 AI requests per user per window
  standardHeaders: true,
  legacyHeaders: false,
  // Keyed per-user (not per-IP) since requests are always authenticated
  // by the time they reach this middleware (mounted after `protect`).
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait a few minutes before trying again.',
  },
});

module.exports = { aiRateLimit };