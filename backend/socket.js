// backend/socket.js - Updated with calling support
const { Server } = require('socket.io');

let io;
const onlineUsers = {}; // { userId: socket.id }

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', (userId) => {
      onlineUsers[userId] = socket.id;
      socket.userId = userId; // Store userId on socket for easy access
      socket.join(`user_${userId}`);

      // Notify others this user is online
      socket.broadcast.emit('userOnline', userId);

      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // Existing message handlers
    socket.on('sendMessage', ({ to, message }) => {
      const receiverSocketId = onlineUsers[to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receiveMessage', {
          from: socket.userId || socket.id,
          message,
          created_at: new Date()
        });
      }
    });

    socket.on('typing', ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', { senderId });
      }
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userStoppedTyping', { senderId });
      }
    });

    // NEW: WebRTC Calling Event Handlers
    socket.on('incoming-call', (data) => {
      const { to, from, callerName, callType } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('incoming-call', {
          from: from || socket.userId,
          callerName,
          callType,
          timestamp: new Date()
        });
        
        console.log(`📞 ${callType} call from ${from || socket.userId} to ${to}`);
      } else {
        // User is offline - could store missed call notification
        console.log(`📞 Missed call: User ${to} is offline`);
        socket.emit('call-failed', { reason: 'User is offline' });
      }
    });

    socket.on('call-offer', (data) => {
      const { to, offer, callType, from } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call-offer', {
          offer,
          callType,
          from: from || socket.userId
        });
        console.log(`📞 Call offer sent from ${from || socket.userId} to ${to}`);
      }
    });

    socket.on('call-answer', (data) => {
      const { to, answer } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call-answer', {
          answer
        });
        console.log(`📞 Call answer sent to ${to}`);
      }
    });

    socket.on('ice-candidate', (data) => {
      const { to, candidate } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('ice-candidate', {
          candidate
        });
      }
    });

    socket.on('end-call', (data) => {
      const { to } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call-ended');
        console.log(`📞 Call ended between ${socket.userId} and ${to}`);
      }
    });

    socket.on('call-declined', (data) => {
      const { to } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call-declined');
        console.log(`📞 Call declined by ${to}`);
      }
    });

    // Handle call timeouts (optional)
    socket.on('call-timeout', (data) => {
      const { to } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call-timeout');
        console.log(`📞 Call timeout between ${socket.userId} and ${to}`);
      }
    });

    // Existing disconnect handler
    socket.on('disconnect', () => {
      let disconnectedUserId = null;
      for (const [userId, socketId] of Object.entries(onlineUsers)) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          delete onlineUsers[userId];
          break;
        }
      }

      if (disconnectedUserId) {
        // Notify others this user went offline
        socket.broadcast.emit('userOffline', parseInt(disconnectedUserId));
        
        // If user was in a call, notify the other party
        socket.broadcast.emit('user-disconnected', { 
          userId: disconnectedUserId,
          socketId: socket.id 
        });
        
        console.log(`User ${disconnectedUserId} disconnected`);
      }
    });
  });
};

const getIo = () => io;
const getOnlineUsers = () => onlineUsers;

module.exports = { initializeSocket, getIo, getOnlineUsers };