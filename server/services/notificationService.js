// server/services/notificationService.js
// Feature 5.1 — Central notification creation + real-time delivery
//
// WHY A SERVICE LAYER instead of writing Notification.create() directly
// in every controller?
//   1. Single place to add new notification types later
//   2. Guarantees every notification is both SAVED (for the dropdown/badge)
//      AND PUSHED live via Socket.io (if the recipient is online) —
//      controllers can't forget one or the other
//   3. Keeps the "don't notify yourself" rule in one place
//
// Usage from any controller:
//   const { notify } = require('../services/notificationService');
//   await notify(io, {
//     recipient: assignedUserId,
//     type: 'task_assigned',
//     message: `${req.user.name} assigned you a task: "${task.title}"`,
//     actor: req.user._id,
//     workspace: workspaceId,
//     task: task._id,
//   });

const Notification = require('../models/Notification');
const { emitToUser } = require('../socket/socketServer');

// ─────────────────────────────────────────────────────────────────────────────
// notify — create a notification and push it live if the user is online
// ─────────────────────────────────────────────────────────────────────────────
async function notify(io, { recipient, type, message, actor = null, workspace = null, task = null }) {
  try {
    // Don't notify someone about their own action
    if (actor && recipient.toString() === actor.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient, type, message, actor, workspace, task,
    });

    await notification.populate('actor', 'name email');

    // Push live via socket if the recipient has an active connection.
    // If they're offline, the notification still exists in the DB and
    // will be picked up by the bell dropdown next time they load the app.
    if (io) {
      emitToUser(io, recipient, 'new-notification', notification.toObject());
    }

    return notification;
  } catch (err) {
    // Notification failures should never break the primary action
    // (e.g. a failed notification shouldn't prevent a task from being created)
    console.error('notificationService.notify error:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// notifyMany — convenience for notifying multiple recipients at once
// (e.g. "new message" notifies everyone in the workspace except the sender)
// ─────────────────────────────────────────────────────────────────────────────
async function notifyMany(io, recipients, payload) {
  const results = await Promise.all(
    recipients.map((recipient) => notify(io, { ...payload, recipient }))
  );
  return results.filter(Boolean);
}

module.exports = { notify, notifyMany };