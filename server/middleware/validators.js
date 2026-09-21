// server/middleware/validators.js
// Feature 9.1 — Security & Optimization
//
// Centralized express-validator chains for every write endpoint in the app.
// Each export is an array: [...field checks, handleValidationErrors].
// Mount directly in a route: router.post('/', workspaceCreateValidator, createWorkspace)
//
// Why express-validator over the old hand-rolled regex checks in validate.js:
// consistent error shape across every route, declarative chains that are
// easy to scan, and battle-tested edge-case handling (email format, ObjectId
// format, etc.) instead of ad-hoc regexes repeated per field.

const { body, param, validationResult } = require('express-validator');

// ── Shared error formatter — every validator array ends with this ──────────
// Keeps the existing app-wide error shape: { success: false, message, errors }
function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => e.msg);
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }
  next();
}

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────
const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be at least 2 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors,
];

const updateMeValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  handleValidationErrors,
];

// ─────────────────────────────────────────────────────────────────────────────
// Workspaces
// ─────────────────────────────────────────────────────────────────────────────
const workspaceCreateValidator = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Workspace name must be 2-50 characters'),
  handleValidationErrors,
];

const workspaceUpdateValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Workspace name must be 2-50 characters'),
  handleValidationErrors,
];

const inviteMemberValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  handleValidationErrors,
];

// ─────────────────────────────────────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────────────────────────────────────
const taskCreateValidator = [
  body('title').trim().isLength({ min: 2, max: 120 }).withMessage('Title must be 2-120 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('workspace').custom(isObjectId).withMessage('A valid workspace ID is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']).withMessage('Status must be todo, in-progress, or done'),
  body('assignedTo').optional({ nullable: true }).custom((v) => v === null || isObjectId(v)).withMessage('assignedTo must be a valid user ID'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date'),
  handleValidationErrors,
];

const taskUpdateValidator = [
  body('title').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Title must be 2-120 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']).withMessage('Status must be todo, in-progress, or done'),
  body('assignedTo').optional({ nullable: true }).custom((v) => v === null || isObjectId(v)).withMessage('assignedTo must be a valid user ID'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date'),
  handleValidationErrors,
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared: validate a route param that must be a Mongo ObjectId
// Usage: router.get('/:id', validateObjectIdParam('id'), getWorkspace)
// ─────────────────────────────────────────────────────────────────────────────
const validateObjectIdParam = (paramName) => [
  param(paramName).custom(isObjectId).withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  registerValidator,
  loginValidator,
  changePasswordValidator,
  updateMeValidator,
  workspaceCreateValidator,
  workspaceUpdateValidator,
  inviteMemberValidator,
  taskCreateValidator,
  taskUpdateValidator,
  validateObjectIdParam,
};