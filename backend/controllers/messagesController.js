const pool = require('../db');
const { getIo, getOnlineUsers } = require('../socket');

exports.sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, message } = req.body;

  try {
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

    // Real-time message for the receiver's chat window
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receiveMessage', newMessage);
      io.to(receiverSocketId).emit('updateInbox'); // <--- Add this for inbox refresh
    }

    // Optional: Update sender's inbox too (for last message preview)
    if (senderSocketId) {
      io.to(senderSocketId).emit('updateInbox');
    }

    res.json({ message: 'Message sent', data: newMessage });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

exports.getConversation = async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  try {
    const [rows] = await pool.query('CALL sp_get_conversation(?, ?)', [userId, otherUserId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch conversation', error: err.message });
  }
};

exports.getInbox = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query('CALL sp_get_inbox(?)', [userId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch inbox', error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  const messageId = req.params.id;

  try {
    await pool.query('CALL sp_mark_message_as_read(?)', [messageId]);
    res.json({ message: 'Message marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark as read', error: err.message });
  }
};

exports.markConversationAsRead = async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;

  try {
    await pool.query('CALL sp_mark_conversation_as_read(?, ?)', [userId, otherUserId]);
    res.json({ message: 'Conversation marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark conversation as read', error: err.message });
  }
};
