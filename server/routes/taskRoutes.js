// server/routes/taskRoutes.js — FINAL after Feature 3.4 (Stage 3 complete)

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createTask, getTasks, updateTask, deleteTask } = require('../controllers/taskController');

router.use(protect);

router.post  ('/',    createTask);   // POST   /api/tasks
router.get   ('/',    getTasks);     // GET    /api/tasks
router.patch ('/:id', updateTask);   // PATCH  /api/tasks/:id
router.delete('/:id', deleteTask);   // DELETE /api/tasks/:id  ← NEW Feature 3.4

module.exports = router;