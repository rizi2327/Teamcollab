// server/controllers/attachmentController.js
// Feature 7.1 — Upload/list/delete file attachments on a task
//
// Permission model (consistent with the rest of the app):
//   - Any workspace member can upload an attachment to a task in that workspace.
//   - Only the person who uploaded a file, or the workspace owner, can delete it.

const fs   = require('fs');
const path = require('path');
const Task      = require('../models/Task');
const Workspace = require('../models/Workspace');
const { notify } = require('../services/notificationService');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tasks/:id/attachments   (multipart/form-data, field name: "file")
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const workspace = await Workspace.findById(task.workspace);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You must be a member of this workspace to upload files' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file was uploaded' });
    }

    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/tasks/${task._id}/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    const saved = task.attachments[task.attachments.length - 1];
    await task.populate('attachments.uploadedBy', 'name email');
    const populatedAttachment = task.attachments.id(saved._id);

    // Notify the assignee that a file was added — unless they uploaded it themselves
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      const { io } = require('../index');
      await notify(io, {
        recipient: task.assignedTo,
        type:      'attachment_added',
        message:   `${req.user.name} attached "${req.file.originalname}" to "${task.title}"`,
        actor:     req.user._id,
        workspace: task.workspace,
        task:      task._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      attachment: populatedAttachment,
    });
  } catch (err) {
    // Clean up the file that multer already wrote to disk if saving the
    // Task document fails after upload, so we don't leak orphaned files.
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/:id/attachments
// Convenience endpoint — the task itself already returns attachments via
// getTasks/updateTask, but this is handy for refreshing just the file list.
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttachments = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('attachments.uploadedBy', 'name email');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const workspace = await Workspace.findById(task.workspace);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You must be a member of this workspace to view files' });
    }

    res.status(200).json({ success: true, attachments: task.attachments });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:id/attachments/:attachmentId
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const workspace = await Workspace.findById(task.workspace);
    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found' });
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You must be a member of this workspace to delete files' });
    }

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found' });

    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    const isOwner     = workspace.isOwner(req.user._id);
    if (!isUploader && !isOwner) {
      return res.status(403).json({ success: false, message: 'Only the uploader or workspace owner can delete this file' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'tasks', task._id.toString(), attachment.filename);
    attachment.deleteOne();
    await task.save();

    // Best-effort disk cleanup — a missing file here shouldn't fail the request
    fs.unlink(filePath, () => {});

    res.status(200).json({ success: true, message: 'Attachment deleted', attachmentId: req.params.attachmentId });
  } catch (err) { next(err); }
};