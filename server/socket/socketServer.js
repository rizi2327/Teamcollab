// server/socket/socketServer.js — updated for Feature 4.2
// ADDED: 'send-message' event handler inside the connection block
// Everything else from Feature 4.1 is unchanged.

const notificationService = require('../services/notificationService');

console.log('Notification:...',notificationService);
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const User       = require('../models/User');
const Workspace  = require('../models/Workspace');
const Message    = require('../models/Message');        // ← NEW 4.2

// ── In-memory online users map (Feature 4.1) ──────────────────────────────────
const onlineUsers   = new Map();
const getOnlineUserIds = () => Array.from(onlineUsers.keys());
const isUserOnline     = (userId) => onlineUsers.has(userId.toString());
const emitToUser       = (io, userId, event, data) => {
  const socketIds = onlineUsers.get(userId.toString());
  if (socketIds) socketIds.forEach((sid) => io.to(sid).emit(event, data));
};

// ─────────────────────────────────────────────────────────────────────────────
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout:  60000,
  });

  // ── Auth middleware ───────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('AUTH_REQUIRED: No token provided'));

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        if (err.name === 'TokenExpiredError')
          return next(new Error('TOKEN_EXPIRED: Session expired'));
        return next(new Error('TOKEN_INVALID: Invalid token'));
      }

      const user = await User.findById(decoded.id).select('name email');
      if (!user) return next(new Error('USER_NOT_FOUND: Account no longer exists'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('AUTH_ERROR: ' + err.message));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

    // Track online presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // ── join-workspace (Feature 4.1) ────────────────────────────────────────
    socket.on('join-workspace', (workspaceId) => {
      if (!workspaceId || typeof workspaceId !== 'string') return;

      const currentRooms = Array.from(socket.rooms).filter((r) => r.startsWith('workspace:'));
      currentRooms.forEach((room) => socket.leave(room));

      const room = `workspace:${workspaceId}`;
      socket.join(room);
      socket.currentWorkspace = workspaceId;

      console.log(`  ↳ ${socket.user.name} joined room ${room}`);

      socket.to(room).emit('user-joined-workspace', {
        userId, name: socket.user.name, email: socket.user.email,
      });

      const roomOnlineUsers = getOnlineUsersInRoom(io, room);
      socket.emit('workspace-online-users', { workspaceId, onlineUserIds: roomOnlineUsers });
    });

    // ── leave-workspace (Feature 4.1) ───────────────────────────────────────
    socket.on('leave-workspace', (workspaceId) => {
      const room = `workspace:${workspaceId}`;
      socket.leave(room);
      socket.currentWorkspace = null;
      socket.to(room).emit('user-left-workspace', { userId, name: socket.user.name });
    });

    // ── send-message (Feature 4.2) ──────────────────────────────────────────
    // Payload: { workspaceId: string, text: string, tempId?: string }
    // tempId is a client-generated UUID used for optimistic message display —
    // the server echoes it back so the client can replace the temp with the real one.
    socket.on('send-message', async (payload, ack) => {
      try {
        const { workspaceId, text, tempId } = payload || {};

        // ── Input validation ────────────────────────────────────────────────
        if (!workspaceId || typeof workspaceId !== 'string') {
          return ack?.({ success: false, message: 'workspaceId is required' });
        }
        if (!text || typeof text !== 'string' || !text.trim()) {
          return ack?.({ success: false, message: 'Message text is required' });
        }
        if (text.trim().length > 2000) {
          return ack?.({ success: false, message: 'Message cannot exceed 2000 characters' });
        }

        // ── Membership check ────────────────────────────────────────────────
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
          return ack?.({ success: false, message: 'Workspace not found' });
        }
        if (!workspace.isMember(socket.user._id)) {
          return ack?.({ success: false, message: 'You are not a member of this workspace' });
        }

        // ── Persist to MongoDB ──────────────────────────────────────────────
        const message = await Message.create({
          workspace: workspaceId,
          sender:    socket.user._id,
          text:      text.trim(),
        });
        await message.populate('sender', 'name email');

        // ── Broadcast to everyone in the workspace room (including sender) ──
        // Using io.to() rather than socket.to() so the sender also receives it,
        // which lets the sender replace their optimistic message with the real one.
        const room = `workspace:${workspaceId}`;
        io.to(room).emit('new-message', {
          ...message.toObject(),
          tempId,              // echoed so client can identify optimistic message
        });

        // Acknowledge success back to the sender
        ack?.({ success: true, messageId: message._id });

      } catch (err) {
        console.error('send-message error:', err.message);
        ack?.({ success: false, message: 'Failed to send message' });
      }
    });

    // ── typing (Feature 4.2) ────────────────────────────────────────────────
    // Payload: { workspaceId: string }
    // Broadcasts to everyone else in the room that this user is typing.
    // The client sets a 1.5s debounce before emitting stop-typing, so the
    // server just relays the signal without its own timeout.
    socket.on('typing', ({ workspaceId } = {}) => {
      if (!workspaceId) return;
      socket.to(`workspace:${workspaceId}`).emit('user-typing', {
        userId,
        name: socket.user.name,
      });
    });

    // ── stop-typing (Feature 4.2) ───────────────────────────────────────────
    socket.on('stop-typing', ({ workspaceId } = {}) => {
      if (!workspaceId) return;
      socket.to(`workspace:${workspaceId}`).emit('user-stopped-typing', { userId });
    });

    // ── disconnect (Feature 4.1) ────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`⚡ Socket disconnected: ${socket.user.name} — ${reason}`);
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          if (socket.currentWorkspace) {
            const room = `workspace:${socket.currentWorkspace}`;
            io.to(room).emit('user-went-offline', { userId, name: socket.user.name });
          }
        }
      }
    });

    socket.on('error', (err) => {
      console.error(`Socket error for ${socket.user.name}:`, err.message);
    });
  });

  return io;
}

function getOnlineUsersInRoom(io, room) {
  const socketsInRoom = io.sockets.adapter.rooms.get(room);
  if (!socketsInRoom) return [];
  const userIds = new Set();
  socketsInRoom.forEach((socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket?.user) userIds.add(socket.user._id.toString());
  });
  return Array.from(userIds);
}

module.exports = { initSocket, onlineUsers, getOnlineUserIds, isUserOnline, emitToUser };