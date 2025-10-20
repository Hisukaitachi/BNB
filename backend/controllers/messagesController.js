const pool = require('../db');
const { getIo, getOnlineUsers } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

// ==========================================
// RATE LIMITING & SECURITY
// ==========================================

// In-memory rate limiting (consider Redis for production)
const messageLimits = new Map();
const MESSAGE_LIMIT = 50; // 50 messages per hour per user
const LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of messageLimits.entries()) {
    if (now - data.resetTime > LIMIT_WINDOW) {
      messageLimits.delete(userId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Simple profanity filter (expand as needed)
const profanityWords = ['badword1', 'badword2']; // Add actual words
const containsProfanity = (text) => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return profanityWords.some(word => lowerText.includes(word));
};

// ==========================================
// MESSAGE OPERATIONS
// ==========================================

/**
 * SEND MESSAGE
 * Sends a message with optional media attachments
 * Replaced: sp_send_message_with_media stored procedure
 * 
 * Features:
 * - Media file support (images, videos, files)
 * - Rate limiting
 * - Profanity filtering
 * - Real-time socket delivery
 * - File size validation (max 200MB total)
 * 
 * Security checks:
 * - Cannot send to self
 * - Cannot send to banned users
 * - Rate limiting per user
 */
exports.sendMessage = catchAsync(async (req, res, next) => {
  const senderId = req.user.id;
  const { receiverId, message } = req.body;

  console.log('📨 Send message request:', {
    senderId,
    receiverId,
    message,
    files: req.files
  });

  // Validate receiver ID
  if (!receiverId) {
    return next(new AppError('Receiver ID is required', 400));
  }

  if (isNaN(receiverId) || receiverId <= 0) {
    return next(new AppError('Valid receiver ID is required', 400));
  }

  // Prevent self-messaging
  if (senderId === parseInt(receiverId)) {
    return next(new AppError('Cannot send message to yourself', 400));
  }

  // Validate content (message or files required)
  const trimmedMessage = message ? message.trim() : '';
  const hasFiles = req.files && req.files.media && req.files.media.length > 0;

  if (!trimmedMessage && !hasFiles) {
    return next(new AppError('Message or media files are required', 400));
  }

  if (trimmedMessage && trimmedMessage.length > 1000) {
    return next(new AppError('Message cannot exceed 1000 characters', 400));
  }

  // RATE LIMITING CHECK
  const now = Date.now();
  const userLimit = messageLimits.get(senderId);
  
  if (userLimit) {
    // Reset if window expired
    if (now - userLimit.resetTime > LIMIT_WINDOW) {
      messageLimits.set(senderId, { count: 1, resetTime: now });
    } else {
      // Check limit
      if (userLimit.count >= MESSAGE_LIMIT) {
        return next(new AppError('Message rate limit exceeded. Please wait before sending more messages.', 429));
      }
      userLimit.count++;
    }
  } else {
    messageLimits.set(senderId, { count: 1, resetTime: now });
  }

  // Profanity filter
  if (trimmedMessage && containsProfanity(trimmedMessage)) {
    return next(new AppError('Message contains inappropriate content', 400));
  }

  // Check if receiver exists and not banned
  const [receiverCheck] = await pool.query(
    'SELECT id, is_banned FROM users WHERE id = ?', 
    [receiverId]
  );
  
  if (!receiverCheck.length) {
    return next(new AppError('Receiver not found', 404));
  }

  if (receiverCheck[0].is_banned === 1) {
    return next(new AppError('Cannot send message to banned user', 400));
  }

  // Check if sender is banned
  const [senderCheck] = await pool.query(
    'SELECT is_banned FROM users WHERE id = ?', 
    [senderId]
  );
  
  if (senderCheck[0]?.is_banned === 1) {
    return next(new AppError('Your account is banned', 403));
  }

  try {
    // PROCESS MEDIA FILES
    let mediaFiles = [];
    let totalFileSize = 0;
    
    if (hasFiles) {
      console.log(`📁 Processing ${req.files.media.length} media files`);
      
      // Calculate total file size
      totalFileSize = req.files.media.reduce((total, file) => total + file.size, 0);
      const maxTotalSize = 200 * 1024 * 1024; // 200MB limit
      
      if (totalFileSize > maxTotalSize) {
        return next(new AppError('Total file size cannot exceed 200MB', 400));
      }
      
      // Process each file with metadata
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

    // Prepare media JSON
    const mediaJson = mediaFiles.length > 0 ? JSON.stringify(mediaFiles) : null;
    
    // INSERT MESSAGE - replaces sp_send_message_with_media stored procedure
    const [result] = await pool.query(
      `INSERT INTO messages (
        sender_id, 
        receiver_id, 
        message, 
        media_files, 
        media_count, 
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        senderId, 
        receiverId, 
        trimmedMessage || null, 
        mediaJson, 
        mediaFiles.length
      ]
    );

    const messageId = result.insertId;

    // Prepare message object for response and socket
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

    // REAL-TIME SOCKET DELIVERY
    const io = getIo();
    const onlineUsers = getOnlineUsers();

    const receiverSocketId = onlineUsers[receiverId];
    const senderSocketId = onlineUsers[senderId];

    // Emit to receiver if online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receiveMessage', newMessage);
      io.to(receiverSocketId).emit('updateInbox');
    }

    // Emit to sender to update their inbox
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

/**
 * GET CONVERSATION
 * Retrieves messages between two users with pagination
 * Replaced: sp_get_conversation stored procedure
 * 
 * Features:
 * - Pagination support
 * - Returns messages in reverse chronological order
 * - Includes sender info
 * - Parses media files JSON
 */
exports.getConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  if (!otherUserId || isNaN(otherUserId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Limit max items per page
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 messages per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Verify other user exists
  const [userCheck] = await pool.query(
    'SELECT id, name FROM users WHERE id = ?', 
    [otherUserId]
  );
  
  if (!userCheck.length) {
    return next(new AppError('User not found', 404));
  }

  // GET MESSAGES - replaces sp_get_conversation stored procedure
  const [messages] = await pool.query(`
    SELECT 
      m.id,
      m.sender_id,
      m.receiver_id,
      m.message,
      m.media_files,
      m.media_count,
      m.is_read,
      m.created_at,
      u.name as sender_name 
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

  const totalCount = countResult[0].total;

  // Process messages and parse media files JSON
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

/**
 * GET INBOX
 * Retrieves user's inbox with last message preview and unread count
 * Replaced: sp_get_inbox stored procedure
 * 
 * Complex query that:
 * - Groups messages by conversation
 * - Shows last message from each conversation
 * - Calculates unread count per conversation
 * - Supports pagination
 */
exports.getInbox = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  if (parseInt(limit) > 50) {
    return next(new AppError('Limit cannot exceed 50 conversations per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // COMPLEX INBOX QUERY - replaces sp_get_inbox stored procedure
  // This query is complex because it:
  // 1. Determines the "other user" for each conversation
  // 2. Gets the last message from each conversation
  // 3. Calculates unread count
  // 4. Uses window functions for efficiency
  const [conversations] = await pool.query(`
    SELECT 
      sub.other_user_id,
      sub.other_user_name,
      sub.last_message,
      sub.has_media,
      sub.media_count,
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
        CASE 
          WHEN m.media_count > 0 AND m.message IS NOT NULL AND LENGTH(TRIM(m.message)) > 0 
            THEN CONCAT('📎 ', LEFT(m.message, 50))
          WHEN m.media_count > 0 AND (m.message IS NULL OR LENGTH(TRIM(m.message)) = 0)
            THEN CONCAT('📎 ', m.media_count, ' file(s)')
          WHEN m.message IS NOT NULL 
            THEN LEFT(m.message, 50)
          ELSE 'No content'
        END AS last_message,
        CASE WHEN m.media_count > 0 THEN 1 ELSE 0 END AS has_media,
        m.media_count,
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
      GROUP BY other_user_id, m.id, m.message, m.media_count, m.created_at, u.name, m.sender_id
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

  const totalCount = countResult[0].total;
  
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

/**
 * MARK MESSAGE AS READ
 * Marks a specific message as read
 * Replaced: sp_mark_message_read stored procedure
 * 
 * Security: Only receiver can mark message as read
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const messageId = req.params.id;
  const userId = req.user.id;

  if (!messageId || isNaN(messageId)) {
    return next(new AppError('Valid message ID is required', 400));
  }

  // Get message details for validation
  const [messageCheck] = await pool.query(
    'SELECT receiver_id, is_read FROM messages WHERE id = ?',
    [messageId]
  );

  if (!messageCheck.length) {
    return next(new AppError('Message not found', 404));
  }

  const message = messageCheck[0];

  // Security: Only receiver can mark as read
  if (message.receiver_id !== userId) {
    return next(new AppError('You can only mark your own received messages as read', 403));
  }

  // Check if already read (prevent unnecessary updates)
  if (message.is_read === 1) {
    return next(new AppError('Message is already marked as read', 400));
  }

  // UPDATE MESSAGE - replaces sp_mark_message_read stored procedure
  const [result] = await pool.query(
    'UPDATE messages SET is_read = 1, updated_at = NOW() WHERE id = ?',
    [messageId]
  );
  
  res.status(200).json({
    status: 'success',
    message: 'Message marked as read',
    data: {
      messageId: parseInt(messageId),
      affectedRows: result.affectedRows,
      markedAt: new Date().toISOString()
    }
  });
});

/**
 * MARK CONVERSATION AS READ
 * Marks all messages from a specific user as read
 * Replaced: sp_mark_conversation_read stored procedure
 * 
 * Useful for marking entire conversation read at once
 */
exports.markConversationAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  if (!otherUserId || isNaN(otherUserId)) {
    return next(new AppError('Valid user ID is required', 400));
  }

  // Verify other user exists
  const [userCheck] = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE id = ?',
    [otherUserId]
  );

  if (userCheck[0].count === 0) {
    return next(new AppError('User not found', 404));
  }

  // UPDATE ALL UNREAD MESSAGES - replaces sp_mark_conversation_read stored procedure
  const [result] = await pool.query(
    `UPDATE messages 
     SET is_read = 1, updated_at = NOW()
     WHERE receiver_id = ? 
       AND sender_id = ? 
       AND is_read = 0`,
    [userId, otherUserId]
  );
  
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

/**
 * GET MESSAGE STATISTICS
 * Retrieves comprehensive messaging statistics for user
 * Returns:
 * - Total messages
 * - Sent/received breakdown
 * - Unread count
 * - Messages with media
 * - Unique conversations
 */
exports.getMessageStats = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // STATISTICS QUERY - replaces sp_get_user_message_stats stored procedure
  const [result] = await pool.query(`
    SELECT 
      COUNT(*) as total_messages,
      COUNT(CASE WHEN sender_id = ? THEN 1 END) as sent_messages,
      COUNT(CASE WHEN receiver_id = ? THEN 1 END) as received_messages,
      COUNT(CASE WHEN receiver_id = ? AND is_read = 0 THEN 1 END) as unread_messages,
      COUNT(CASE WHEN media_count > 0 THEN 1 END) as messages_with_media,
      SUM(media_count) as total_media_files,
      COUNT(DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END) as unique_conversations
    FROM messages
    WHERE sender_id = ? OR receiver_id = ?
  `, [userId, userId, userId, userId, userId, userId]);
  
  const stats = result[0];
  
  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

/**
 * SEARCH MESSAGES
 * Searches messages by content or user name
 * Replaced: sp_search_messages stored procedure
 * 
 * Searches in:
 * - Message content
 * - Sender name
 * - Receiver name
 */
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
  const searchTerm = q.trim();

  // SEARCH QUERY - replaces sp_search_messages stored procedure
  const [messages] = await pool.query(`
    SELECT 
      m.id,
      m.sender_id,
      m.receiver_id,
      m.message,
      m.media_count,
      m.created_at,
      u1.name as sender_name,
      u2.name as receiver_name,
      CASE 
        WHEN m.sender_id = ? THEN u2.name
        ELSE u1.name
      END as other_user_name,
      CASE 
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END as other_user_id
    FROM messages m
    JOIN users u1 ON m.sender_id = u1.id
    JOIN users u2 ON m.receiver_id = u2.id
    WHERE (m.sender_id = ? OR m.receiver_id = ?)
      AND (m.message LIKE ? OR u1.name LIKE ? OR u2.name LIKE ?)
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `, [
    userId, userId, userId, userId,
    `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`,
    parseInt(limit), offset
  ]);
  
  // Get total count
  const [countResult] = await pool.query(`
    SELECT COUNT(*) as total
    FROM messages m
    JOIN users u1 ON m.sender_id = u1.id
    JOIN users u2 ON m.receiver_id = u2.id
    WHERE (m.sender_id = ? OR m.receiver_id = ?)
      AND (m.message LIKE ? OR u1.name LIKE ? OR u2.name LIKE ?)
  `, [
    userId, userId,
    `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`
  ]);

  const totalCount = countResult[0].total;
  
  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
      searchTerm: searchTerm,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  });
});

/**
 * DELETE MESSAGE
 * Soft deletes a message (replaces content with placeholder)
 * Replaced: sp_delete_message stored procedure
 * 
 * Security: Only sender can delete their own messages
 * Note: This is a soft delete - keeps message record but removes content
 */
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const messageId = req.params.id;
  const userId = req.user.id;

  if (!messageId || isNaN(messageId)) {
    return next(new AppError('Valid message ID is required', 400));
  }

  // Get message details for validation
  const [messageCheck] = await pool.query(
    'SELECT sender_id FROM messages WHERE id = ?',
    [messageId]
  );

  if (!messageCheck.length) {
    return next(new AppError('Message not found', 404));
  }

  // Security: Only sender can delete
  if (messageCheck[0].sender_id !== userId) {
    return next(new AppError('You can only delete your own messages', 403));
  }

  // SOFT DELETE - replaces sp_delete_message stored procedure
  // Keeps record but removes content and media
  const [result] = await pool.query(
    `UPDATE messages 
     SET message = '[Message deleted]', 
         media_files = NULL, 
         media_count = 0,
         updated_at = NOW()
     WHERE id = ?`,
    [messageId]
  );
  
  res.status(200).json({
    status: 'success',
    message: 'Message deleted successfully',
    data: {
      messageId: parseInt(messageId),
      affectedRows: result.affectedRows
    }
  });
});

/**
 * GET UNREAD COUNT
 * Quick endpoint to get total unread message count
 * Useful for notification badges
 */
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