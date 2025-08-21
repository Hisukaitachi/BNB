const pool = require('../db');
const { getIo, getOnlineUsers } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

// Rate limiting for messages (in-memory store)
const messageLimits = new Map();
const MESSAGE_LIMIT = 50; // 50 messages per hour per user
const LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of messageLimits.entries()) {
    if (now - data.resetTime > LIMIT_WINDOW) {
      messageLimits.delete(userId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Simple profanity filter (basic implementation)
const profanityWords = ['badword1', 'badword2']; // Add actual words
const containsProfanity = (text) => {
  const lowerText = text.toLowerCase();
  return profanityWords.some(word => lowerText.includes(word));
};

exports.sendMessage = catchAsync(async (req, res, next) => {
  const senderId = req.user.id;
  const { receiverId, message } = req.body;

  if (!receiverId || !message) {
    return next(new AppError('Receiver ID and message are required', 400));
  }

  // Validate receiver ID
  if (isNaN(receiverId) || receiverId <= 0) {
    return next(new AppError('Valid receiver ID is required', 400));
  }

  // Validate message content
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return next(new AppError('Message cannot be empty', 400));
  }

  if (trimmedMessage.length > 1000) {
    return next(new AppError('Message cannot exceed 1000 characters', 400));
  }

  if (trimmedMessage.length < 1) {
    return next(new AppError('Message must contain at least 1 character', 400));
  }

  // Check for self-messaging
  if (senderId === parseInt(receiverId)) {
    return next(new AppError('Cannot send message to yourself', 400));
  }

  // Rate limiting check
  const now = Date.now();
  const userLimit = messageLimits.get(senderId);
  
  if (userLimit) {
    if (now - userLimit.resetTime > LIMIT_WINDOW) {
      // Reset limit window
      messageLimits.set(senderId, { count: 1, resetTime: now });
    } else {
      if (userLimit.count >= MESSAGE_LIMIT) {
        return next(new AppError('Message rate limit exceeded. Please wait before sending more messages.', 429));
      }
      userLimit.count++;
    }
  } else {
    messageLimits.set(senderId, { count: 1, resetTime: now });
  }

  // Basic profanity filter
  if (containsProfanity(trimmedMessage)) {
    return next(new AppError('Message contains inappropriate content', 400));
  }

  // Check if receiver exists
  const [receiverCheck] = await pool.query('SELECT id, is_banned FROM users WHERE id = ?', [receiverId]);
  if (!receiverCheck.length) {
    return next(new AppError('Receiver not found', 404));
  }

  if (receiverCheck[0].is_banned === 1) {
    return next(new AppError('Cannot send message to banned user', 400));
  }

  // Check if sender is banned
  const [senderCheck] = await pool.query('SELECT is_banned FROM users WHERE id = ?', [senderId]);
  if (senderCheck[0]?.is_banned === 1) {
    return next(new AppError('Your account is banned', 403));
  }

  try {
    await pool.query('CALL sp_send_message(?, ?, ?)', [senderId, receiverId, trimmedMessage]);

    const newMessage = {
      sender_id: senderId,
      receiver_id: parseInt(receiverId),
      message: trimmedMessage,
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
        message: {
          ...newMessage,
          characterCount: trimmedMessage.length
        }
      }
    });
  } catch (error) {
    if (error.message && error.message.includes('blocked')) {
      return next(new AppError('Unable to send message. User may have blocked you.', 403));
    }
    throw error;
  }
});

exports.getConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  if (!otherUserId || isNaN(otherUserId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 messages per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Check if other user exists
  const [userCheck] = await pool.query('SELECT id, name FROM users WHERE id = ?', [otherUserId]);
  if (!userCheck.length) {
    return next(new AppError('User not found', 404));
  }

  // Get conversation with pagination
  const [rows] = await pool.query(`
    SELECT m.*, u.name as sender_name 
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, otherUserId, otherUserId, userId, parseInt(limit), offset]);

  // Get total count for pagination
  const [countResult] = await pool.query(`
    SELECT COUNT(*) as total 
    FROM messages 
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
  `, [userId, otherUserId, otherUserId, userId]);

  // Reverse to show oldest first
  const messages = rows.reverse();
  
  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
      otherUser: userCheck[0],
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

exports.getInbox = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  if (parseInt(limit) > 50) {
    return next(new AppError('Limit cannot exceed 50 conversations per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Enhanced inbox query with pagination
  const [rows] = await pool.query(`
    SELECT 
      sub.other_user_id,
      sub.other_user_name,
      sub.last_message,
      sub.created_at,
      sub.sender_id,
      CASE WHEN sub.sender_id = ? THEN 0 ELSE sub.unread_count END as unread_count
    FROM (
      SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END AS other_user_id,
        u.name AS other_user_name,
        m.message AS last_message,
        m.created_at,
        m.sender_id,
        SUM(CASE 
          WHEN msg.receiver_id = ? AND msg.is_read = 0 THEN 1
          ELSE 0
        END) AS unread_count,
        ROW_NUMBER() OVER (
          PARTITION BY CASE 
            WHEN m.sender_id = ? THEN m.receiver_id
            ELSE m.sender_id
          END 
          ORDER BY m.created_at DESC
        ) as rn
      FROM messages m
      JOIN users u ON u.id = CASE 
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END
      JOIN messages msg ON (
        (msg.sender_id = m.sender_id AND msg.receiver_id = m.receiver_id)
        OR 
        (msg.sender_id = m.receiver_id AND msg.receiver_id = m.sender_id)
      )
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY other_user_id, m.message, m.created_at, u.name, m.sender_id
    ) sub
    WHERE sub.rn = 1
    ORDER BY sub.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, userId, userId, userId, userId, userId, userId, parseInt(limit), offset]);

  // Get total conversation count
  const [countResult] = await pool.query(`
    SELECT COUNT(DISTINCT 
      CASE 
        WHEN sender_id = ? THEN receiver_id
        ELSE sender_id
      END
    ) as total
    FROM messages 
    WHERE sender_id = ? OR receiver_id = ?
  `, [userId, userId, userId]);
  
  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      conversations: rows,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const messageId = req.params.id;
  const userId = req.user.id;

  if (!messageId || isNaN(messageId)) {
    return next(new AppError('Valid message ID is required', 400));
  }

  // Check if message exists and user is receiver
  const [messageCheck] = await pool.query(
    'SELECT receiver_id, is_read FROM messages WHERE id = ?', 
    [messageId]
  );

  if (!messageCheck.length) {
    return next(new AppError('Message not found', 404));
  }

  if (messageCheck[0].receiver_id !== userId) {
    return next(new AppError('You can only mark your own received messages as read', 403));
  }

  if (messageCheck[0].is_read === 1) {
    return next(new AppError('Message is already marked as read', 400));
  }

  await pool.query('CALL sp_mark_message_as_read(?)', [messageId]);
  
  res.status(200).json({
    status: 'success',
    message: 'Message marked as read',
    data: {
      messageId: parseInt(messageId),
      markedAt: new Date().toISOString()
    }
  });
});

exports.markConversationAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  if (!otherUserId || isNaN(otherUserId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Check if other user exists
  const [userCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [otherUserId]);
  if (!userCheck.length) {
    return next(new AppError('User not found', 404));
  }

  const [result] = await pool.query(`
    UPDATE messages 
    SET is_read = 1 
    WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
  `, [userId, otherUserId]);

  res.status(200).json({
    status: 'success',
    message: 'Conversation marked as read',
    data: {
      conversationWith: parseInt(otherUserId),
      messagesMarked: result.affectedRows,
      markedAt: new Date().toISOString()
    }
  });
});