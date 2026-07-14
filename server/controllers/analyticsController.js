// server/controllers/analyticsController.js
// Feature 6.1 — Dashboard & Analytics
//
// All endpoints are scoped to a single workspace and require membership,
// same guard pattern used across taskController / workspaceController.
// Every query uses Mongo aggregation ($match/$group) rather than pulling
// full documents into Node — these are read-heavy, dashboard-refresh endpoints.

const mongoose  = require('mongoose');
const Task      = require('../models/Task');
const Workspace = require('../models/Workspace');

// ── Helper: load workspace + verify membership (shared by every endpoint) ────
async function loadWorkspaceForMember(workspaceId, userId) {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    const err = new Error('Invalid workspace ID');
    err.status = 400;
    throw err;
  }
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    const err = new Error('Workspace not found');
    err.status = 404;
    throw err;
  }
  if (!workspace.isMember(userId)) {
    const err = new Error('You must be a member of this workspace to view analytics');
    err.status = 403;
    throw err;
  }
  return workspace;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/:workspaceId/overview
// Stat-card row: total / todo / in-progress / done / overdue / completion rate
// ─────────────────────────────────────────────────────────────────────────────
exports.getOverview = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    await loadWorkspaceForMember(workspaceId, req.user._id);

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

    const [statusCounts, overdueCount] = await Promise.all([
      Task.aggregate([
        { $match: { workspace: workspaceObjectId, isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({
        workspace: workspaceObjectId,
        isArchived: false,
        status: { $ne: 'done' },
        dueDate: { $ne: null, $lt: new Date() },
      }),
    ]);

    const counts = { todo: 0, 'in-progress': 0, done: 0 };
    statusCounts.forEach((c) => { counts[c._id] = c.count; });

    const total = counts.todo + counts['in-progress'] + counts.done;
    const completionRate = total > 0 ? Math.round((counts.done / total) * 100) : 0;

    res.status(200).json({
      success: true,
      overview: {
        total,
        todo: counts.todo,
        inProgress: counts['in-progress'],
        done: counts.done,
        overdue: overdueCount,
        completionRate,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/:workspaceId/status-breakdown
// Feeds the status donut chart — recharts wants [{ name, value }]
// ─────────────────────────────────────────────────────────────────────────────
exports.getStatusBreakdown = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    await loadWorkspaceForMember(workspaceId, req.user._id);

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

    const raw = await Task.aggregate([
      { $match: { workspace: workspaceObjectId, isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const labels = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };
    const rawMap = {};
    raw.forEach((r) => { rawMap[r._id] = r.count; });

    // Always return all three statuses, even at zero, so the chart legend is stable
    const breakdown = ['todo', 'in-progress', 'done'].map((key) => ({
      name: labels[key],
      value: rawMap[key] || 0,
    }));

    res.status(200).json({ success: true, breakdown });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/:workspaceId/priority-breakdown
// Feeds the priority bar chart
// ─────────────────────────────────────────────────────────────────────────────
exports.getPriorityBreakdown = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    await loadWorkspaceForMember(workspaceId, req.user._id);

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

    const raw = await Task.aggregate([
      { $match: { workspace: workspaceObjectId, isArchived: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const labels = { low: 'Low', medium: 'Medium', high: 'High' };
    const rawMap = {};
    raw.forEach((r) => { rawMap[r._id] = r.count; });

    const breakdown = ['low', 'medium', 'high'].map((key) => ({
      name: labels[key],
      value: rawMap[key] || 0,
    }));

    res.status(200).json({ success: true, breakdown });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/:workspaceId/timeline?days=14
// Tasks completed per day over the trailing N days — feeds the area chart
// ─────────────────────────────────────────────────────────────────────────────
exports.getTimeline = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    await loadWorkspaceForMember(workspaceId, req.user._id);

    const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 14));
    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    // updatedAt is the best proxy we have for "completed on" since Task has
    // no dedicated completedAt field — a task only reaches status 'done' via
    // updateTask, which always bumps updatedAt.
    const raw = await Task.aggregate([
      {
        $match: {
          workspace: workspaceObjectId,
          isArchived: false,
          status: 'done',
          updatedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          completed: { $sum: 1 },
        },
      },
    ]);

    const rawMap = {};
    raw.forEach((r) => { rawMap[r._id] = r.completed; });

    // Fill every day in the range, even zero-completion days, so the chart
    // doesn't show misleading gaps.
    const timeline = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      timeline.push({ date: key, completed: rawMap[key] || 0 });
    }

    res.status(200).json({ success: true, timeline });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/:workspaceId/activity
// Per-member leaderboard: assigned count, completed count, completion rate
// ─────────────────────────────────────────────────────────────────────────────
exports.getActivity = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await loadWorkspaceForMember(workspaceId, req.user._id);

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

    const raw = await Task.aggregate([
      {
        $match: {
          workspace: workspaceObjectId,
          isArchived: false,
          assignedTo: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
    ]);

    const statsByUser = {};
    raw.forEach((r) => { statsByUser[r._id.toString()] = r; });

    // Populate() needs documents, not aggregation output — build the
    // leaderboard from workspace.members so everyone shows up, even
    // members with zero assigned tasks.
    await workspace.populate('members.user', 'name email');

    const activity = workspace.members.map((m) => {
      const stat = statsByUser[m.user._id.toString()];
      const assigned = stat ? stat.assigned : 0;
      const completed = stat ? stat.completed : 0;
      return {
        userId: m.user._id,
        name: m.user.name,
        email: m.user.email,
        assigned,
        completed,
        completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
      };
    });

    // Most active members first
    activity.sort((a, b) => b.assigned - a.assigned);

    res.status(200).json({ success: true, activity });
  } catch (err) { next(err); }
};