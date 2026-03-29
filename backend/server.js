import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

// Health check endpoint for deployment platforms
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'LoveConnect Backend is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const rooms = new Map();
const userToSocket = new Map(); // Maps userId -> socketId
const socketToUser = new Map(); // Maps socketId -> { userId, roomId }

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);

    // Store userId <-> socketId mapping
    userToSocket.set(userId, socket.id);
    socketToUser.set(socket.id, { userId, roomId });

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map()); // Changed to Map for userId -> socketId
    }
    rooms.get(roomId).set(userId, socket.id);

    const otherUsers = Array.from(rooms.get(roomId).keys()).filter(id => id !== userId);

    socket.emit('other-users', otherUsers);
    socket.to(roomId).emit('user-joined', userId);

    console.log(`✅ User ${userId} (socket: ${socket.id}) joined room ${roomId}`);
    console.log(`📊 Room ${roomId} has ${rooms.get(roomId).size} users`);
  });

  socket.on('offer', (payload) => {
    const targetSocketId = userToSocket.get(payload.target);
    if (targetSocketId) {
      console.log(`📤 Sending offer from ${payload.caller} to ${payload.target} (socket: ${targetSocketId})`);
      io.to(targetSocketId).emit('offer', {
        sdp: payload.sdp,
        caller: payload.caller
      });
    } else {
      console.error(`❌ Target user ${payload.target} not found`);
    }
  });

  socket.on('answer', (payload) => {
    const targetSocketId = userToSocket.get(payload.target);
    if (targetSocketId) {
      console.log(`📤 Sending answer from ${payload.answerer} to ${payload.target} (socket: ${targetSocketId})`);
      io.to(targetSocketId).emit('answer', {
        sdp: payload.sdp,
        answerer: payload.answerer
      });
    } else {
      console.error(`❌ Target user ${payload.target} not found`);
    }
  });

  socket.on('ice-candidate', (payload) => {
    const targetSocketId = userToSocket.get(payload.target);
    if (targetSocketId) {
      console.log(`📤 Sending ICE candidate from ${payload.sender} to ${payload.target}`);
      io.to(targetSocketId).emit('ice-candidate', {
        candidate: payload.candidate,
        sender: payload.sender
      });
    } else {
      console.error(`❌ Target user ${payload.target} not found for ICE candidate`);
    }
  });

  socket.on('send-message', (payload) => {
    console.log(`💬 Message in room ${payload.roomId} from ${payload.sender}`);
    socket.to(payload.roomId).emit('receive-message', {
      message: payload.message,
      sender: payload.sender,
      timestamp: payload.timestamp
    });
  });

  socket.on('disconnect', () => {
    console.log('⚠️ User disconnected:', socket.id);

    const userData = socketToUser.get(socket.id);
    if (userData) {
      const { userId, roomId } = userData;

      // Clean up mappings
      userToSocket.delete(userId);
      socketToUser.delete(socket.id);

      // Clean up room
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(userId);
        socket.to(roomId).emit('user-left', userId);

        if (rooms.get(roomId).size === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        } else {
          console.log(`📊 Room ${roomId} now has ${rooms.get(roomId).size} users`);
        }
      }

      console.log(`👋 User ${userId} left room ${roomId}`);
    }
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://192.168.1.5:${PORT}`);
});
