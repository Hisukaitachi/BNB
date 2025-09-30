// backend/socket.js - CLEANED (Bookings Only, with Calling Support)
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

    // ==========================================
    // USER REGISTRATION
    // ==========================================
    socket.on('register', (userId) => {
      onlineUsers[userId] = socket.id;
      socket.userId = userId;
      socket.join(`user_${userId}`);

      // Notify others this user is online
      socket.broadcast.emit('userOnline', userId);

      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // ==========================================
    // MESSAGING EVENTS
    // ==========================================
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

    // ==========================================
    // WEBRTC CALLING EVENTS
    // ==========================================
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
        io.to(receiverSocketId).emit('call-answer', { answer });
        console.log(`📞 Call answer sent to ${to}`);
      }
    });

    socket.on('ice-candidate', (data) => {
      const { to, candidate } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('ice-candidate', { candidate });
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

    socket.on('call-timeout', (data) => {
      const { to } = data;
      const receiverSocketId = onlineUsers[to];
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call-timeout');
        console.log(`📞 Call timeout between ${socket.userId} and ${to}`);
      }
    });

    // ==========================================
    // BOOKING EVENTS (Real-time Updates)
    // ==========================================
    socket.on('booking-created', (data) => {
      const { hostId, bookingId, clientName, listingTitle } = data;
      const hostSocketId = onlineUsers[hostId];
      
      if (hostSocketId) {
        io.to(hostSocketId).emit('new-booking-request', {
          bookingId,
          clientName,
          listingTitle,
          message: `New booking request from ${clientName} for "${listingTitle}"`,
          timestamp: new Date()
        });
      }
    });

    socket.on('booking-approved', (data) => {
      const { clientId, bookingId, listingTitle, requiresPayment } = data;
      const clientSocketId = onlineUsers[clientId];
      
      if (clientSocketId) {
        io.to(clientSocketId).emit('booking-approved', {
          bookingId,
          listingTitle,
          requiresPayment,
          message: `Your booking for "${listingTitle}" has been approved!${requiresPayment ? ' Please complete payment.' : ''}`,
          timestamp: new Date()
        });
      }
    });

    socket.on('booking-rejected', (data) => {
      const { clientId, bookingId, listingTitle, reason } = data;
      const clientSocketId = onlineUsers[clientId];
      
      if (clientSocketId) {
        io.to(clientSocketId).emit('booking-rejected', {
          bookingId,
          listingTitle,
          reason,
          message: `Your booking for "${listingTitle}" has been declined.`,
          timestamp: new Date()
        });
      }
    });

    socket.on('payment-completed', (data) => {
      const { hostId, bookingId, amount, paymentType } = data;
      const hostSocketId = onlineUsers[hostId];
      
      if (hostSocketId) {
        io.to(hostSocketId).emit('payment-received', {
          bookingId,
          amount,
          paymentType,
          message: `Payment of ₱${amount} received for booking #${bookingId}`,
          timestamp: new Date()
        });
      }
    });

    socket.on('booking-cancelled', (data) => {
      const { userId, bookingId, refundAmount, listingTitle } = data;
      const userSocketId = onlineUsers[userId];
      
      if (userSocketId) {
        io.to(userSocketId).emit('booking-cancelled', {
          bookingId,
          listingTitle,
          refundAmount,
          message: refundAmount > 0 
            ? `Booking cancelled. Refund of ₱${refundAmount} is being processed.`
            : `Booking for "${listingTitle}" has been cancelled.`,
          timestamp: new Date()
        });
      }
    });

    socket.on('booking-arrived', (data) => {
      const { clientId, bookingId, listingTitle } = data;
      const clientSocketId = onlineUsers[clientId];
      
      if (clientSocketId) {
        io.to(clientSocketId).emit('guest-arrived', {
          bookingId,
          listingTitle,
          message: `Welcome! Your host has confirmed your arrival at "${listingTitle}".`,
          timestamp: new Date()
        });
      }
    });

    socket.on('booking-completed', (data) => {
      const { clientId, hostId, bookingId, listingTitle } = data;
      
      // Notify client
      const clientSocketId = onlineUsers[clientId];
      if (clientSocketId) {
        io.to(clientSocketId).emit('booking-completed', {
          bookingId,
          listingTitle,
          message: `Your stay at "${listingTitle}" has been completed. Thank you!`,
          timestamp: new Date()
        });
      }
      
      // Notify host
      const hostSocketId = onlineUsers[hostId];
      if (hostSocketId) {
        io.to(hostSocketId).emit('booking-completed', {
          bookingId,
          listingTitle,
          message: `Booking for "${listingTitle}" has been completed.`,
          timestamp: new Date()
        });
      }
    });

    // ==========================================
    // DISCONNECT HANDLER
    // ==========================================
    socket.on('disconnect', () => {
      let disconnectedUserId = null;
      
      // Find and remove user from online users
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