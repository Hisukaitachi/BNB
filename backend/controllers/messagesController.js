const pool = require('../db');
const { getIo, getOnlineUsers } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.sendMessage = catchAsync(async (req, res, next) => {
  const senderId = req.user.id;
  const { receiverId, message } = req.body;

  if (!receiverId || !message) {
    return next(new AppError('Receiver ID and message are required', 400));
  }

  if (!message.trim()) {
    return next(new AppError('Message cannot be empty', 400));
  }

  await pool.query('CALL sp_send_message(?, ?, ?)', [senderId, receiverId, message]);

  const newMessage = {
    sender_id: senderId,
    receiver_id: receiverId,
    message,
    is_read: 0,
    created_at: new Date()
  };

  const io = getIo();
  const onlineUsers = getOnlineUsers();

  const receiverSocketId = onlineUsers[receiverId];
  const senderSocketId = onlineUsers[senderId];

  if (receiverSocketId) {
    io.to(receiverSocketId).emit('receiveMessage', newMessage);
    io.to(receiverSocketId).emit('updateInbox');
  }

  if (senderSocketId) {
    io.to(senderSocketId).emit('updateInbox');
  }

  res.status(201).json({
    status: 'success',
    message: 'Message sent successfully',
    data: {
      message: newMessage
    }
  });
});

exports.getConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  if (!otherUserId || isNaN(otherUserId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  const [rows] = await pool.query('CALL sp_get_conversation(?, ?)', [userId, otherUserId]);
  
  res.status(200).json({
    status: 'success',
    results: rows[0].length,
    data: {
      messages: rows[0]
    }
  });
});

exports.getInbox = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const [rows] = await pool.query('CALL sp_get_inbox(?)', [userId]);
  
  res.status(200).json({
    status: 'success',
    results: rows[0].length,
    data: {
      conversations: rows[0]
    }
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const messageId = req.params.id;

  if (!messageId || isNaN(messageId)) {
    return next(new AppError('Valid message ID is required', 400));
  }

  await pool.query('CALL sp_mark_message_as_read(?)', [messageId]);
  
  res.status(200).json({
    status: 'success',
    message: 'Message marked as read'
  });
});

exports.markConversationAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  if (!otherUserId || isNaN(otherUserId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  await pool.query('CALL sp_mark_conversation_as_read(?, ?)', [userId, otherUserId]);
  
  res.status(200).json({
    status: 'success',
    message: 'Conversation marked as read'
  });
});