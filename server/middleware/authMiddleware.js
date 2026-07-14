// server/middleware/authMiddleware.js
// FIXED in Feature 1.4: works correctly with select:false on password in User model

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // 1. Read token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
        code: 'TOKEN_INVALID',
      });
    }

    // 3. Fetch user — password is excluded by select:false on schema
    //    toJSON() further strips it from responses as a double-safety
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    // 4. Attach user to request — available in all downstream controllers
    req.user = user;
    next();

  } catch (err) {
    next(err);
  }
};

module.exports = { protect };