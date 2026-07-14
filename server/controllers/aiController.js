// server/controllers/aiController.js
// Feature 8.1 — AI Features (Stage 8)
//
// Three capabilities, all workspace-membership-gated like the rest of the app:
//   1. summarizeWorkspace — plain-English status summary of a workspace
//   2. previewTaskBreakdown / applyTaskBreakdown — split one big task into
//      AI-suggested subtasks, shown to the user before anything is saved
//   3. askAssistant — Q&A grounded in the workspace's recent chat history
//
// All OpenAI calls are wrapped in try/catch with a friendly fallback message —
// a flaky/rate-limited OpenAI response should never crash the request or
// leak a raw stack trace to the client.

const Task      = require('../models/Task');
const Workspace = require('../models/Workspace');
const Message   = require('../models/Message');
const { openai, AI_MODEL } = require('../config/openaiClient');

// ── Shared: membership guard (same pattern as analyticsController) ──────────
async function loadWorkspaceForMember(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    const err = new Error('Workspace not found');
    err.status = 404;
    throw err;
  }
  if (!workspace.isMember(userId)) {
    const err = new Error('You must be a member of this workspace to use AI features');
    err.status = 403;
    throw err;
  }
  return workspace;
}

// Wraps every OpenAI call so a provider outage/error becomes a clean 502,
// not an unhandled exception or a confusing raw error message.
async function callOpenAI(messages, { json = false } = {}) {
  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: 0.4,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('[AI ERROR]', err.message);
    const wrapped = new Error('The AI service is temporarily unavailable. Please try again shortly.');
    wrapped.status = 502;
    throw wrapped;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/:workspaceId/summary
// Plain-English summary of what's going on in the workspace right now.
// ─────────────────────────────────────────────────────────────────────────────
exports.summarizeWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await loadWorkspaceForMember(workspaceId, req.user._id);

    const tasks = await Task.find({ workspace: workspaceId, isArchived: false })
      .populate('assignedTo', 'name')
      .select('title status priority assignedTo dueDate')
      .limit(200)
      .lean();

    if (tasks.length === 0) {
      return res.status(200).json({
        success: true,
        summary: `${workspace.name} doesn't have any tasks yet — nothing to summarize until the board has some activity.`,
      });
    }

    // Keep the prompt compact: one line per task, not full JSON blobs.
    const taskLines = tasks.map((t) => {
      const assignee = t.assignedTo?.name || 'Unassigned';
      const due = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : 'no due date';
      return `- [${t.status}] (${t.priority}) "${t.title}" — ${assignee}, due ${due}`;
    }).join('\n');

    const messages = [
      {
        role: 'system',
        content: 'You are a concise project status assistant. Summarize the current state of a team\'s task board in 3-5 short sentences: overall progress, what looks at risk (overdue or high-priority stuck items), and anything notably imbalanced (one person overloaded, etc). Plain text, no headers, no bullet points in the output.',
      },
      {
        role: 'user',
        content: `Workspace: "${workspace.name}"\nTotal tasks: ${tasks.length}\n\n${taskLines}`,
      },
    ];

    const summary = await callOpenAI(messages);
    res.status(200).json({ success: true, summary });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/tasks/:taskId/breakdown/preview
// Body: {} — uses the task's existing title/description
// Returns suggested subtasks WITHOUT saving anything yet.
// ─────────────────────────────────────────────────────────────────────────────
exports.previewTaskBreakdown = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    await loadWorkspaceForMember(task.workspace, req.user._id);

    const messages = [
      {
        role: 'system',
        content: 'You break a single task into smaller, actionable subtasks. Respond ONLY with JSON in the form {"subtasks": ["...", "...", ...]}. Produce between 3 and 7 subtasks. Each subtask title should be short (under 80 characters), specific, and independently actionable. Do not include numbering in the titles.',
      },
      {
        role: 'user',
        content: `Task title: "${task.title}"\nDescription: "${task.description || '(no description)'}"`,
      },
    ];

    const raw = await callOpenAI(messages, { json: true });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const err = new Error('AI returned an unexpected format — please try again');
      err.status = 502;
      throw err;
    }

    const suggestions = Array.isArray(parsed.subtasks)
      ? parsed.subtasks.filter((s) => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim().slice(0, 120))
      : [];

    if (suggestions.length === 0) {
      const err = new Error('AI did not return any subtasks — please try again');
      err.status = 502;
      throw err;
    }

    res.status(200).json({ success: true, taskId: task._id, suggestions });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/tasks/:taskId/breakdown/apply
// Body: { subtasks: ["...", "..."] } — the (possibly edited) list the user
// approved in the preview step. Actually creates Task documents.
// ─────────────────────────────────────────────────────────────────────────────
exports.applyTaskBreakdown = async (req, res, next) => {
  try {
    const { subtasks } = req.body;
    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      return res.status(400).json({ success: false, message: 'subtasks must be a non-empty array of titles' });
    }
    if (subtasks.length > 15) {
      return res.status(400).json({ success: false, message: 'Cannot create more than 15 subtasks at once' });
    }

    const parentTask = await Task.findById(req.params.taskId);
    if (!parentTask) return res.status(404).json({ success: false, message: 'Task not found' });

    await loadWorkspaceForMember(parentTask.workspace, req.user._id);

    const lastTask = await Task.findOne({ workspace: parentTask.workspace, status: 'todo' })
      .sort({ order: -1 }).select('order');
    let nextOrder = lastTask ? lastTask.order + 1 : 0;

    const docs = subtasks
      .filter((title) => typeof title === 'string' && title.trim().length >= 2)
      .map((title) => ({
        title: title.trim().slice(0, 120),
        workspace: parentTask.workspace,
        createdBy: req.user._id,
        status: 'todo',
        priority: parentTask.priority,
        parentTask: parentTask._id,
        aiGenerated: true,
        order: nextOrder++,
      }));

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid subtask titles provided' });
    }

    const created = await Task.insertMany(docs);

    res.status(201).json({
      success: true,
      message: `${created.length} subtask${created.length === 1 ? '' : 's'} created`,
      tasks: created,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/:workspaceId/assistant
// Body: { question }
// Answers a question grounded in the workspace's recent chat history.
// The reply is returned directly — it is NOT persisted as a chat message.
// ─────────────────────────────────────────────────────────────────────────────
exports.askAssistant = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }
    if (question.length > 500) {
      return res.status(400).json({ success: false, message: 'Question is too long (max 500 characters)' });
    }

    const workspace = await loadWorkspaceForMember(workspaceId, req.user._id);

    // Last 30 chat messages give the assistant enough context without
    // blowing up the prompt size.
    const recentMessages = await Message.find({ workspace: workspaceId, isDeleted: false })
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const chatContext = recentMessages
      .reverse()
      .map((m) => `${m.sender?.name || 'Someone'}: ${m.text}`)
      .join('\n') || '(no chat history yet)';
const messages = [
  {
    role: "system",
    content: `
You are TeamCollab AI Assistant inside the workspace "${workspace.name}".

You have two responsibilities:

1. Answer general knowledge questions normally using your own knowledge.
2. If the user asks about this workspace, its chats, members, decisions, tasks, blockers, or discussions, use the recent workspace chat as the primary source.

Rules:
- If the answer exists in the workspace chat, answer from that context.
- If it doesn't exist in the chat but is a general question, answer normally.
- Never invent workspace facts.
- If workspace information is missing, clearly say it isn't available.
- You can answer greetings, coding, programming, mathematics, writing, translation, and other normal questions.
- Keep answers concise unless the user asks for details.
`
  },
  {
    role: "user",
    content: `
Recent Workspace Chat:

${chatContext}

Question:
${question}
`
  }
];

    const reply = await callOpenAI(messages);
    res.status(200).json({ success: true, reply });
  } catch (err) { next(err); }
};