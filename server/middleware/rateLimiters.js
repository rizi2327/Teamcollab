// server/middleware/rateLimiters.js
// Feature 9.1 — Security & Optimization
//
// Two limiters:
//   generalLimiter — applied to the whole API, keeps casual abuse/bugs in check
//   authLimiter    — much stricter, applied only to /api/auth, to slow down
//                    credential-stuffing / brute-force login attempts
//
// (aiRateLimit.js from Feature 8.1 already covers the AI routes separately,
// since those needed a tighter per-user limit before Stage 9 existed.)

const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in a few minutes.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // 5 register/login attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
});

module.exports = { generalLimiter, authLimiter };