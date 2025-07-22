const pool = require('../db');

exports.sendMessage = async (req, res) => {
  const { receiver_id, message } = req.body;
  const sender_id = req.user.id;

  try {
    await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [sender_id, receiver_id, message]
    );
    res.status(201).json({ message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMessagesWithUser = async (req, res) => {
  const userId = req.user.id;
  const otherUserId = req.params.userId;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, otherUserId, otherUserId, userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConversations = async (req, res) => {
  const userId = req.user.id;
  console.log(" User ID from token:", userId);

  try {
    const [rows] = await pool.query(`
      SELECT 
  m.id AS messageId,
  m.sender_id,
  m.receiver_id,
  m.message,
  m.created_at,
  IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS other_user_id,
  u.name AS other_user_name
FROM messages m
JOIN (
  SELECT 
    LEAST(sender_id, receiver_id) AS user1,
    GREATEST(sender_id, receiver_id) AS user2,
    MAX(id) AS max_id
  FROM messages
  WHERE sender_id = ? OR receiver_id = ?
  GROUP BY user1, user2
) latest ON latest.max_id = m.id
JOIN users u ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
ORDER BY m.created_at DESC;

    `, [userId, userId, userId, userId]);

    console.log(" Raw conversation rows:", rows); // Debug log
    res.json(rows);
  } catch (err) {
    console.error(" Error fetching conversations:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.deleteMessage = async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)',
      [messageId, userId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    await pool.query('DELETE FROM messages WHERE id = ?', [messageId]);

    res.json({ message: 'Message deleted' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'Error deleting message', error: err.message });
  }
};
