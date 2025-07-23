const pool = require('../db');
 const { getIo, getOnlineUsers } = require('../socket');

exports.getMyNotifications = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  try {
    const [rows] = await pool.query('SELECT user_id FROM notifications WHERE id = ?', [notificationId]);

    if (!rows.length) return res.status(404).json({ message: 'Notification not found' });
    if (rows[0].user_id !== userId) return res.status(403).json({ message: 'Unauthorized' });

    await pool.query('CALL sp_mark_notification_as_read(?)', [notificationId]);

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query('CALL sp_mark_all_notifications_as_read(?)', [userId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

exports.createNotification = async ({ userId, message, type }) => {
  const [result] = await pool.query(`
    INSERT INTO notifications (user_id, message, type)
    VALUES (?, ?, ?)`,
    [userId, message, type]
  );

  const notification = {
    id: result.insertId,
    user_id: userId,
    message,
    type,
    is_read: 0,
    created_at: new Date()
  };

 
  const io = getIo();
  const socketId = getOnlineUsers()[userId];

  if (socketId) {
    io.to(socketId).emit('newNotification', notification);
  }

  return notification;
};
