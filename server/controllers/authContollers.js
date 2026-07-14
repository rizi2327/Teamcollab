const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── REGISTER (from Feature 1.1) ───────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user,
    });
  } catch (err) {
    next(err);
  }
};

// ─── LOGIN ──────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 2. Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        // NOTE: Always use a generic message — never say "wrong password"
        // or "email not found" separately (security best practice)
      });
    }

    // 3. Sign JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },   // payload
      process.env.JWT_SECRET,                 // secret from .env
      { expiresIn: '7d' }                     // token expires in 7 days
    );

    // 4. Send response (strip password via toJSON())
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};