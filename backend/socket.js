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
      socket.join(`user_${userId}`);

      // Notify others this user is online
      socket.broadcast.emit('userOnline', userId);

      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on('sendMessage', ({ to, message }) => {
      const receiverSocketId = onlineUsers[to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receiveMessage', {
          from: socket.id,
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
        socket.broadcast.emit('userOffline', parseInt(disconnectedUserId));
        console.log(`User ${disconnectedUserId} disconnected`);
      }
    });
  });
};

const getIo = () => io;
const getOnlineUsers = () => onlineUsers;

module.exports = { initializeSocket, getIo, getOnlineUsers };
