const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const auth = require('../middleware/auth');

// Send a message (real-time)
router.post('/', auth, messagesController.sendMessage);

// Get specific conversation (between two users)
router.get('/conversation/:otherUserId', auth, messagesController.getConversation);

// Get inbox (list of latest chats)
router.get('/inbox', auth, messagesController.getInbox);

// Mark a specific message as read
router.patch('/:id/read', auth, messagesController.markAsRead);

// Mark an entire conversation as read
router.patch('/conversation/:otherUserId/read', auth, messagesController.markConversationAsRead);

module.exports = router;
