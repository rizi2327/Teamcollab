// ─── REGISTER VALIDATION ────────────────────────────────────────────────────
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2)
    errors.push('Name must be at least 2 characters');

  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    errors.push('Valid email is required');

  if (!password || password.length < 6)
    errors.push('Password must be at least 6 characters');

  if (errors.length > 0)
    return res.status(400).json({ success: false, errors });

  next();
};

// ─── LOGIN VALIDATION ────────────────────────────────────────────────────────
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    errors.push('Valid email is required');

  if (!password || password.length < 1)
    errors.push('Password is required');

  if (errors.length > 0)
    return res.status(400).json({ success: false, errors });

  next();
};

module.exports = { validateRegister, validateLogin };