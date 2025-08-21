const pool = require('../db');
 const { getIo, getOnlineUsers } = require('../socket');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, unread_only = false, type } = req.query;
  const userId = req.user.id;
  
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 notifications per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereClause = 'user_id = ?';
  const queryParams = [userId];

  // Filter by read status
  if (unread_only === 'true') {
    whereClause += ' AND is_read = 0';
  }

  // Filter by notification type
  const validTypes = ['booking_request', 'booking_approved', 'booking_declined', 'booking_cancelled', 'admin_notice', 'general', 'account', 'role', 'listing', 'review'];
  if (type && validTypes.includes(type)) {
    whereClause += ' AND type = ?';
    queryParams.push(type);
  }

  queryParams.push(parseInt(limit), offset);

  const [rows] = await pool.query(
    `SELECT id, user_id, message, type, is_read, created_at 
     FROM notifications 
     WHERE ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    queryParams
  );

  // Get total count
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
    queryParams.slice(0, -2)
  );

  // Get unread count
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
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  if (!notificationId || isNaN(notificationId)) {
    return next(new AppError('Valid notification ID is required', 400));
  }

  const [rows] = await pool.query('SELECT user_id FROM notifications WHERE id = ?', [notificationId]);

  if (!rows.length) {
    return next(new AppError('Notification not found', 404));
  }

  if (rows[0].user_id !== userId) {
    return next(new AppError('Not authorized to modify this notification', 403));
  }

  await pool.query('CALL sp_mark_notification_as_read(?)', [notificationId]);

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read'
  });
});

exports.markAllAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  await pool.query('CALL sp_mark_all_notifications_as_read(?)', [userId]);
  
  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});

exports.createNotification = async ({ userId, role, message, type }) => {
  let targetUserIds = [];

  if (role) {
    const [users] = await pool.query(
      `SELECT id FROM users WHERE role = ?`,
      [role]
    );
    targetUserIds = users.map(u => u.id);
  }

  if (userId) {
    targetUserIds.push(userId);
  }

  const io = getIo();
  const results = [];

  for (const uid of targetUserIds) {
    const [result] = await pool.query(`
      INSERT INTO notifications (user_id, message, type)
      VALUES (?, ?, ?)
    `, [uid, message, type]);

    const notification = {
      id: result.insertId,
      user_id: uid,
      message,
      type,
      is_read: 0,
      created_at: new Date()
    };

    const socketId = getOnlineUsers()[uid];
    if (socketId) {
      io.to(socketId).emit('newNotification', notification);
    }

    results.push(notification);
  }

  return results;
};
