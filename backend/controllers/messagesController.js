// backend/controllers/messagesController.js - Using Stored Procedures
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

// Simple profanity filter
const profanityWords = ['badword1', 'badword2']; // Add actual words
const containsProfanity = (text) => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return profanityWords.some(word => lowerText.includes(word));
};

// Send message with media support using stored procedure
exports.sendMessage = catchAsync(async (req, res, next) => {
  const senderId = req.user.id;
  const { receiverId, message } = req.body;

  console.log('📨 Send message request:', {
    senderId,
    receiverId,
    message,
    files: req.files
  });

  if (!receiverId) {
    return next(new AppError('Receiver ID is required', 400));
  }

  // Validate receiver ID
  if (isNaN(receiverId) || receiverId <= 0) {
    return next(new AppError('Valid receiver ID is required', 400));
  }

  // Check if self-messaging
  if (senderId === parseInt(receiverId)) {
    return next(new AppError('Cannot send message to yourself', 400));
  }

  // Validate message content (allow empty message if files are present)
  const trimmedMessage = message ? message.trim() : '';
  const hasFiles = req.files && req.files.media && req.files.media.length > 0;

  if (!trimmedMessage && !hasFiles) {
    return next(new AppError('Message or media files are required', 400));
  }

  if (trimmedMessage && trimmedMessage.length > 1000) {
    return next(new AppError('Message cannot exceed 1000 characters', 400));
  }

  // Rate limiting check
  const now = Date.now();
  const userLimit = messageLimits.get(senderId);
  
  if (userLimit) {
    if (now - userLimit.resetTime > LIMIT_WINDOW) {
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
  if (trimmedMessage && containsProfanity(trimmedMessage)) {
    return next(new AppError('Message contains inappropriate content', 400));
  }

  // Check if receiver exists and not banned
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
    // Process media files
    let mediaFiles = [];
    let totalFileSize = 0;
    
    if (hasFiles) {
      console.log(`📁 Processing ${req.files.media.length} media files`);
      
      // Validate total file size (max 200MB per message)
      totalFileSize = req.files.media.reduce((total, file) => total + file.size, 0);
      const maxTotalSize = 200 * 1024 * 1024; // 200MB
      
      if (totalFileSize > maxTotalSize) {
        return next(new AppError('Total file size cannot exceed 200MB', 400));
      }
      
      // Process each file
      mediaFiles = req.files.media.map((file, index) => {
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        
        return {
          url: `/uploads/messages/${file.filename}`,
          type: isImage ? 'image' : (isVideo ? 'video' : 'file'),
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          order: index + 1
        };
      });
      
      console.log('✅ Media files processed:', mediaFiles.length);
    }

    // Use stored procedure to send message
    const mediaJson = mediaFiles.length > 0 ? JSON.stringify(mediaFiles) : null;
    
    const [result] = await pool.query(
      'CALL sp_send_message_with_media(?, ?, ?, ?, ?)',
      [senderId, receiverId, trimmedMessage || (mediaFiles.length > 0 ? '[Media]' : 'Empty message'), mediaJson, mediaFiles.length]
    );

    const messageId = result[0][0].message_id;

    // Prepare message object for real-time delivery
    const newMessage = {
      id: messageId,
      sender_id: senderId,
      receiver_id: parseInt(receiverId),
      message: trimmedMessage || null,
      media_files: mediaFiles,
      media_count: mediaFiles.length,
      is_read: 0,
      created_at: new Date()
    };

    // Real-time socket delivery
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

    console.log('✅ Message sent successfully:', {
      messageId,
      hasMedia: mediaFiles.length > 0,
      fileCount: mediaFiles.length,
      totalSize: `${(totalFileSize / (1024 * 1024)).toFixed(2)}MB`
    });

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: {
        message: {
          ...newMessage,
          characterCount: trimmedMessage ? trimmedMessage.length : 0,
          fileCount: mediaFiles.length,
          totalFileSize: totalFileSize
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
    if (error.message && error.message.includes('blocked')) {
      return next(new AppError('Unable to send message. User may have blocked you.', 403));
    }
    throw error;
  }
});

// Get conversation using stored procedure
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

  // Use stored procedure to get conversation
  const [results] = await pool.query(
    'CALL sp_get_conversation(?, ?, ?, ?)',
    [userId, otherUserId, parseInt(limit), offset]
  );

  const messages = results[0];
  const totalCount = results[1][0].total;

  // Process messages and parse media files
  const processedMessages = messages.reverse().map(msg => {
    let mediaFiles = [];
    if (msg.media_files) {
      try {
        mediaFiles = JSON.parse(msg.media_files);
      } catch (e) {
        console.error('Error parsing media files:', e);
        mediaFiles = [];
      }
    }
    
    return {
      ...msg,
      media_files: mediaFiles,
      hasMedia: mediaFiles.length > 0
    };
  });
  
  res.status(200).json({
    status: 'success',
    results: processedMessages.length,
    data: {
      messages: processedMessages,
      otherUser: userCheck[0],
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  });
});

// Get inbox using stored procedure
exports.getInbox = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  if (parseInt(limit) > 50) {
    return next(new AppError('Limit cannot exceed 50 conversations per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Use stored procedure to get inbox
  const [results] = await pool.query(
    'CALL sp_get_inbox(?, ?, ?)',
    [userId, parseInt(limit), offset]
  );

  const conversations = results[0];
  const totalCount = results[1][0].total;
  
  res.status(200).json({
    status: 'success',
    results: conversations.length,
    data: {
      conversations,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  });
});

// Mark message as read using stored procedure
exports.markAsRead = catchAsync(async (req, res, next) => {
  const messageId = req.params.id;
  const userId = req.user.id;

  if (!messageId || isNaN(messageId)) {
    return next(new AppError('Valid message ID is required', 400));
  }

  try {
    const [result] = await pool.query(
      'CALL sp_mark_message_read(?, ?)',
      [messageId, userId]
    );
    
    const affectedRows = result[0][0].affected_rows;
    
    res.status(200).json({
      status: 'success',
      message: 'Message marked as read',
      data: {
        messageId: parseInt(messageId),
        affectedRows,
        markedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error.message.includes('Message not found')) {
      return next(new AppError('Message not found', 404));
    }
    if (error.message.includes('You can only mark')) {
      return next(new AppError('You can only mark your own received messages as read', 403));
    }
    if (error.message.includes('already marked as read')) {
      return next(new AppError('Message is already marked as read', 400));
    }
    throw error;
  }
});

// Mark conversation as read using stored procedure
exports.markConversationAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  if (!otherUserId || isNaN(otherUserId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  try {
    const [result] = await pool.query(
      'CALL sp_mark_conversation_read(?, ?)',
      [userId, otherUserId]
    );
    
    const messagesMarked = result[0][0].messages_marked;
    
    res.status(200).json({
      status: 'success',
      message: 'Conversation marked as read',
      data: {
        conversationWith: parseInt(otherUserId),
        messagesMarked,
        markedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error.message.includes('User not found')) {
      return next(new AppError('User not found', 404));
    }
    throw error;
  }
});

// Get user message statistics using stored procedure
exports.getMessageStats = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const [result] = await pool.query(
    'CALL sp_get_user_message_stats(?)',
    [userId]
  );
  
  const stats = result[0][0];
  
  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

// Search messages using stored procedure
exports.searchMessages = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new AppError('Search term must be at least 2 characters', 400));
  }

  if (parseInt(limit) > 50) {
    return next(new AppError('Limit cannot exceed 50 results per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [results] = await pool.query(
    'CALL sp_search_messages(?, ?, ?, ?)',
    [userId, q.trim(), parseInt(limit), offset]
  );

  const messages = results[0];
  const totalCount = results[1][0].total;
  
  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
      searchTerm: q.trim(),
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  });
});

// Delete message using stored procedure
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const messageId = req.params.id;
  const userId = req.user.id;

  if (!messageId || isNaN(messageId)) {
    return next(new AppError('Valid message ID is required', 400));
  }

  try {
    const [result] = await pool.query(
      'CALL sp_delete_message(?, ?)',
      [messageId, userId]
    );
    
    const affectedRows = result[0][0].affected_rows;
    
    res.status(200).json({
      status: 'success',
      message: 'Message deleted successfully',
      data: {
        messageId: parseInt(messageId),
        affectedRows
      }
    });
  } catch (error) {
    if (error.message.includes('Message not found')) {
      return next(new AppError('Message not found', 404));
    }
    if (error.message.includes('You can only delete')) {
      return next(new AppError('You can only delete your own messages', 403));
    }
    throw error;
  }
});

// Get unread messages count
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const [result] = await pool.query(
    `SELECT COUNT(*) as unread_count 
     FROM messages 
     WHERE receiver_id = ? AND is_read = 0`,
    [userId]
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      unread_count: result[0].unread_count
    }
  });
});