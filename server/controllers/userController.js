// server/controllers/userController.js
// All user-related controllers — protected by authMiddleware

const bcrypt = require('bcrypt');
const User = require('../models/User');

// ─── GET /api/users/me ───────────────────────────────────────────────────────
// Returns currently logged-in user (req.user from authMiddleware)
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user, // password stripped by toJSON()
  });
};

// ─── PATCH /api/users/me ─────────────────────────────────────────────────────
// Update name and/or email
exports.updateMe = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const updates = {};

    if (name) {
      if (name.trim().length < 2)
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
      updates.name = name.trim();
    }

    if (email) {
      if (!/^\S+@\S+\.\S+$/.test(email))
        return res.status(400).json({ success: false, message: 'Enter a valid email address' });

      // Check if email already taken by another user
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existing)
        return res.status(409).json({ success: false, message: 'Email already in use by another account' });

      updates.email = email.toLowerCase().trim();
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ success: false, message: 'No valid fields to update' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/users/me/password ────────────────────────────────────────────
// Change password (requires current password for verification)
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Current and new password are required' });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    // Fetch user WITH password (stripped by default)
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    if (currentPassword === newPassword)
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/users/me ────────────────────────────────────────────────────
// Delete own account
exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};