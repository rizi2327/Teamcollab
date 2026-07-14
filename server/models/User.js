// server/models/User.js
// FIXED in Feature 1.4: added select: false on password field
// This is required for changePassword to work correctly with .select('+password')

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,   // ← CRITICAL FIX: never returned by default in ANY query
                       // To get it back: User.findOne().select('+password')
    },
  },
  { timestamps: true }   // adds createdAt and updatedAt automatically
);

// ── toJSON: strip password even if select: false is bypassed ─────────────────
// Double safety — strips password before any JSON serialisation
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);