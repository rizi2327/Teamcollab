// server/controllers/taskController.js
// FINAL version after Feature 5.1 — notification triggers added
//
// createTask (3.1) + getTasks (3.2) + updateTask (3.3) + deleteTask (3.4)
// + notify on assignment / status change (5.1)

const Task      = require('../models/Task');
const Workspace = require('../models/Workspace');
const { notify } = require('../services/notificationService');   // ← NEW 5.1

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tasks
// ─────────────────────────────────────────────────────────────────────────────
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, priority, assignedTo, workspace: workspaceId, dueDate } = req.body;

    if (!title || title.trim().length < 2)
      return res.status(400).json({ success: false, message: 'Task title must be at least 2 characters' });
    if (title.trim().length > 120)
      return res.status(400).json({ success: false, message: 'Task title cannot exceed 120 characters' });
    if (!workspaceId)
      return res.status(400).json({ success: false, message: 'workspace is required' });
    if (priority && !['low', 'medium', 'high'].includes(priority))
      return res.status(400).json({ success: false, message: 'Priority must be low, medium, or high' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id))
      return res.status(403).json({ success: false, message: 'You must be a member of this workspace to create tasks' });
    if (assignedTo && !workspace.isMember(assignedTo))
      return res.status(400).json({ success: false, message: 'Cannot assign a task to someone outside the workspace' });

    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime()))
        return res.status(400).json({ success: false, message: 'Invalid due date' });
    }

    const lastTask = await Task.findOne({ workspace: workspaceId, status: 'todo' })
      .sort({ order: -1 }).select('order');
    const nextOrder = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      title: title.trim(), description: description?.trim() || '',
      priority: priority || 'medium', assignedTo: assignedTo || null,
      workspace: workspaceId, createdBy: req.user._id,
      dueDate: parsedDueDate, order: nextOrder, status: 'todo',
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    // ── NEW 5.1: notify the assignee if one was set on creation ─────────────
    if (task.assignedTo) {
      const { io } = require('../index');   // lazy require avoids circular dependency
      await notify(io, {
        recipient: task.assignedTo._id,
        type:      'task_assigned',
        message:   `${req.user.name} assigned you a task: "${task.title}"`,
        actor:     req.user._id,
        workspace: task.workspace,
        task:      task._id,
      });
    }

    res.status(201).json({ success: true, message: 'Task created successfully', task });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks  (unchanged from Feature 3.2)
// ─────────────────────────────────────────────────────────────────────────────
exports.getTasks = async (req, res, next) => {
  try {
    const { workspace: workspaceId, status, priority, assignedTo, search, page = 1, limit = 50, sort = 'order' } = req.query;

    if (!workspaceId)
      return res.status(400).json({ success: false, message: 'workspace query parameter is required' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id))
      return res.status(403).json({ success: false, message: 'You must be a member of this workspace to view tasks' });

    const filter = { workspace: workspaceId, isArchived: false };

    if (status) {
      if (!['todo', 'in-progress', 'done'].includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      filter.status = status;
    }
    if (priority) {
      if (!['low', 'medium', 'high'].includes(priority))
        return res.status(400).json({ success: false, message: 'Invalid priority filter' });
      filter.priority = priority;
    }
    if (assignedTo === 'me') filter.assignedTo = req.user._id;
    else if (assignedTo === 'unassigned') filter.assignedTo = null;
    else if (assignedTo) filter.assignedTo = assignedTo;
    if (search) filter.title = { $regex: search.trim(), $options: 'i' };

    const sortMap = {
      order: { order: 1, createdAt: 1 }, newest: { createdAt: -1 },
      oldest: { createdAt: 1 }, dueDate: { dueDate: 1 },
    };
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip     = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      Task.find(filter).populate('assignedTo', 'name email').populate('createdBy', 'name email')
        .sort(sortMap[sort] || sortMap.order).skip(skip).limit(limitNum).lean(),
      Task.countDocuments(filter),
    ]);

    const { status: _omit, ...filterWithoutStatus } = filter;
    const statusCounts = await Task.aggregate([
      { $match: filterWithoutStatus },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = { todo: 0, 'in-progress': 0, done: 0 };
    statusCounts.forEach((c) => { counts[c._id] = c.count; });

    res.status(200).json({
      success: true, tasks, counts,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasMore: skip + tasks.length < total },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tasks/:id
// Feature 5.1 adds: notify on (a) new assignee, (b) status change
// ─────────────────────────────────────────────────────────────────────────────
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const workspace = await Workspace.findById(task.workspace);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id))
      return res.status(403).json({ success: false, message: 'You must be a member of this workspace to update tasks' });

    const { title, description, status, priority, assignedTo, dueDate, order } = req.body;
    const oldStatus     = task.status;
    const oldOrder      = task.order;
    const oldAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;  // ← NEW 5.1: capture before mutation

    if (title !== undefined) {
      if (!title.trim() || title.trim().length < 2)
        return res.status(400).json({ success: false, message: 'Title must be at least 2 characters' });
      if (title.trim().length > 120)
        return res.status(400).json({ success: false, message: 'Title cannot exceed 120 characters' });
      task.title = title.trim();
    }
    if (description !== undefined) {
      if (description.length > 2000)
        return res.status(400).json({ success: false, message: 'Description cannot exceed 2000 characters' });
      task.description = description.trim();
    }
    if (status !== undefined) {
      if (!['todo', 'in-progress', 'done'].includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status' });
      task.status = status;
    }
    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority))
        return res.status(400).json({ success: false, message: 'Invalid priority' });
      task.priority = priority;
    }
    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === '') { task.assignedTo = null; }
      else {
        if (!workspace.isMember(assignedTo))
          return res.status(400).json({ success: false, message: 'Cannot assign a task to someone outside the workspace' });
        task.assignedTo = assignedTo;
      }
    }
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') { task.dueDate = null; }
      else {
        const parsed = new Date(dueDate);
        if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: 'Invalid due date' });
        task.dueDate = parsed;
      }
    }
    if (order !== undefined) {
      if (typeof order !== 'number' || order < 0)
        return res.status(400).json({ success: false, message: 'order must be a non-negative number' });
      task.order = order;
    }

    await task.save();

    const statusChanged = status !== undefined && status !== oldStatus;
    const orderChanged  = order  !== undefined && order  !== oldOrder;
    if (statusChanged || orderChanged) {
      await resequenceColumn(task.workspace, task.status, task._id, task.order);
      if (statusChanged) await resequenceColumn(task.workspace, oldStatus, null, null);
    }

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    // ── NEW 5.1: notification triggers ───────────────────────────────────────
    const { io } = require('../index');
    const newAssignedTo = task.assignedTo?._id?.toString() || null;

    // a) Assignee changed to someone new — notify them
    if (assignedTo !== undefined && newAssignedTo && newAssignedTo !== oldAssignedTo) {
      await notify(io, {
        recipient: newAssignedTo,
        type:      'task_assigned',
        message:   `${req.user.name} assigned you a task: "${task.title}"`,
        actor:     req.user._id,
        workspace: task.workspace,
        task:      task._id,
      });
    }

    // b) Status changed — notify the assignee (unless they made the change themselves)
    if (statusChanged && task.assignedTo) {
      const assigneeId = task.assignedTo._id.toString();
      if (assigneeId !== req.user._id.toString()) {
        const statusLabels = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };
        await notify(io, {
          recipient: assigneeId,
          type:      'task_status_changed',
          message:   `${req.user.name} moved "${task.title}" to ${statusLabels[task.status]}`,
          actor:     req.user._id,
          workspace: task.workspace,
          task:      task._id,
        });
      }
    }

    res.status(200).json({ success: true, message: 'Task updated', task });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:id  (unchanged from Feature 3.4)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.isArchived) {
      return res.status(400).json({ success: false, message: 'Task is already archived' });
    }

    const workspace = await Workspace.findById(task.workspace);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this workspace to delete tasks',
      });
    }

    const deletedStatus = task.status;
    task.isArchived = true;
    await task.save();

    await resequenceColumn(task.workspace, deletedStatus, null, null);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      taskId: task._id,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: re-sequence a column's order values to 0, 1, 2, 3...
// ─────────────────────────────────────────────────────────────────────────────
async function resequenceColumn(workspaceId, status, movedTaskId, targetOrder) {
  const tasks = await Task.find({ workspace: workspaceId, status, isArchived: false })
    .sort({ order: 1, createdAt: 1 });

  let ordered = tasks.filter((t) => !movedTaskId || t._id.toString() !== movedTaskId.toString());

  if (movedTaskId) {
    const movedTask = tasks.find((t) => t._id.toString() === movedTaskId.toString());
    if (movedTask) {
      const insertAt = Math.min(targetOrder, ordered.length);
      ordered.splice(insertAt, 0, movedTask);
    }
  }

  const bulkOps = ordered
    .map((t, index) => ({
      updateOne: { filter: { _id: t._id }, update: { $set: { order: index } } },
    }))
    .filter((op, index) => ordered[index].order !== index);

  if (bulkOps.length > 0) await Task.bulkWrite(bulkOps);
}