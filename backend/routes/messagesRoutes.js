const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authenticateToken } = require('../middleware/auth');

// Send a message (real-time)
router.post('/', authenticateToken, messagesController.sendMessage);

// Get specific conversation (between two users)
router.get('/conversation/:otherUserId', authenticateToken, messagesController.getConversation);

// Get inbox (list of latest chats)
router.get('/inbox', authenticateToken, messagesController.getInbox);

// Mark a specific message as read
router.patch('/:id/read', authenticateToken, messagesController.markAsRead);

// Mark an entire conversation as read
router.patch('/conversation/:otherUserId/read', authenticateToken, messagesController.markConversationAsRead);

module.exports = router;
