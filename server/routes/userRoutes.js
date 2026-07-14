// server/routes/userRoutes.js

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMe,
  updateMe,
  changePassword,
  deleteMe,
} = require('../controllers/userController');

// All routes below require a valid JWT
router.use(protect);

router.get   ('/me',          getMe);           // GET    /api/users/me
router.patch ('/me',          updateMe);         // PATCH  /api/users/me
router.patch ('/me/password', changePassword);   // PATCH  /api/users/me/password
router.delete('/me',          deleteMe);         // DELETE /api/users/me

module.exports = router;