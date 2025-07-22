const { Server } = require('socket.io');

let io;
const onlineUsers = {};

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
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of Object.entries(onlineUsers)) {
        if (socketId === socket.id) {
          delete onlineUsers[userId];
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};

const getIo = () => io;
const getOnlineUsers = () => onlineUsers;

module.exports = { initializeSocket, getIo, getOnlineUsers };
