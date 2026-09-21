// server/routes/authRoutes.js — updated for Feature 9.1
// Validation migrated from the old hand-rolled validate.js to express-validator
// (see validators.js). authLimiter added — 5 attempts per 15 min per IP,
// only failed attempts count (skipSuccessfulRequests), so a normal user
// logging in repeatedly on different days is never affected.

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimiters');

// POST /api/auth/register
router.post('/register', authLimiter, registerValidator, register);

// POST /api/auth/login
router.post('/login', authLimiter, loginValidator, login);

module.exports = router;