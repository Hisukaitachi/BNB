const pool = require('../db');
 const { getIo, getOnlineUsers } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET MY NOTIFICATIONS
 * Retrieves notifications for the authenticated user
 * Replaced: sp_get_user_notifications stored procedure
 * 
 * Features:
 * - Pagination support
 * - Filter by read status (unread_only)
 * - Filter by notification type
 * - Returns unread count for badge
 * 
 * Query params:
 * - page: Page number
 * - limit: Items per page (max 100)
 * - unread_only: true/false
 * - type: notification type filter
 */
exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, unread_only = false, type } = req.query;
  const userId = req.user.id;
  
  // Prevent excessive data retrieval
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 notifications per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // Build dynamic WHERE clause
  let whereClause = 'user_id = ?';
  const queryParams = [userId];

  // Filter by read status
  if (unread_only === 'true') {
    whereClause += ' AND is_read = 0';
  }

  // Filter by notification type
  const validTypes = [
    'booking_request', 'booking_approved', 'booking_declined', 
    'booking_cancelled', 'admin_notice', 'general', 'account', 
    'role', 'listing', 'review'
  ];
  
  if (type && validTypes.includes(type)) {
    whereClause += ' AND type = ?';
    queryParams.push(type);
  }

  // Add pagination params
  queryParams.push(parseInt(limit), offset);

  // GET NOTIFICATIONS - replaces sp_get_user_notifications stored procedure
  const [rows] = await pool.query(
    `SELECT id, user_id, message, type, is_read, created_at 
     FROM notifications 
     WHERE ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    queryParams
  );

  // Get total count for pagination
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
    queryParams.slice(0, -2) // Remove limit and offset
  );

  // Get unread count for notification badge
  const [unreadResult] = await pool.query(
    'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  
  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      notifications: rows,
      statistics: {
        totalUnread: unreadResult[0].unread
      },
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

/**
 * MARK NOTIFICATION AS READ
 * Marks a single notification as read
 * Replaced: sp_mark_notification_as_read stored procedure
 * 
 * Security: Users can only mark their own notifications as read
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  if (!notificationId || isNaN(notificationId)) {
    return next(new AppError('Valid notification ID is required', 400));
  }

  // Verify notification belongs to user
  const [rows] = await pool.query(
    'SELECT user_id FROM notifications WHERE id = ?', 
    [notificationId]
  );

  if (!rows.length) {
    return next(new AppError('Notification not found', 404));
  }

  // Authorization check
  if (rows[0].user_id !== userId) {
    return next(new AppError('Not authorized to modify this notification', 403));
  }

  // UPDATE NOTIFICATION - replaces sp_mark_notification_as_read stored procedure
  await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ?', 
    [notificationId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read'
  });
});

/**
 * MARK ALL NOTIFICATIONS AS READ
 * Marks all user's notifications as read in one operation
 * Replaced: sp_mark_all_notifications_as_read stored procedure
 * 
 * Useful for "Mark all as read" button
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // UPDATE ALL UNREAD NOTIFICATIONS - replaces sp_mark_all_notifications_as_read
  const [result] = await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', 
    [userId]
  );
  
  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read',
    data: {
      markedCount: result.affectedRows
    }
  });
});

/**
 * CREATE NOTIFICATION (Internal Function)
 * Creates notifications and sends real-time updates via Socket.IO
 * Replaced: sp_create_notification stored procedure
 * 
 * This is called by other controllers, not directly by API routes
 * 
 * @param {Object} options
 * @param {Number} options.userId - Single user ID (optional)
 * @param {String} options.role - Role to notify all users (optional)
 * @param {String} options.message - Notification message
 * @param {String} options.type - Notification type
 * 
 * Features:
 * - Can notify single user OR all users with a specific role
 * - Sends real-time socket notification if user is online
 * - Returns array of created notifications
 * 
 * Usage examples:
 * - Notify single user: createNotification({ userId: 5, message: 'Hello', type: 'general' })
 * - Notify all admins: createNotification({ role: 'admin', message: 'Alert', type: 'admin_notice' })
 */
exports.createNotification = async ({ userId, role, message, type }) => {
  let targetUserIds = [];

  // If role is specified, get all users with that role
  if (role) {
    const [users] = await pool.query(
      `SELECT id FROM users WHERE role = ?`,
      [role]
    );
    targetUserIds = users.map(u => u.id);
  }

  // If specific userId provided, add to targets
  if (userId) {
    targetUserIds.push(userId);
  }

  // Remove duplicates
  targetUserIds = [...new Set(targetUserIds)];

  const io = getIo();
  const onlineUsers = getOnlineUsers();
  const results = [];

  // Create notification for each target user
  for (const uid of targetUserIds) {
    // INSERT NOTIFICATION - replaces sp_create_notification stored procedure
    const [result] = await pool.query(`
      INSERT INTO notifications (user_id, message, type, is_read, created_at)
      VALUES (?, ?, ?, 0, NOW())
    `, [uid, message, type]);

    // Build notification object
    const notification = {
      id: result.insertId,
      user_id: uid,
      message,
      type,
      is_read: 0,
      created_at: new Date()
    };

    // Send real-time notification if user is online
    const socketId = onlineUsers[uid];
    if (socketId) {
      io.to(socketId).emit('newNotification', notification);
    }

    results.push(notification);
  }

  return results;
};