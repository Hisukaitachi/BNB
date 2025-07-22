const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const auth = require('../middleware/auth');

router.post('/', auth, messagesController.sendMessage);
router.get('/conversations', auth, messagesController.getConversations);
router.get('/:userId', auth, messagesController.getMessagesWithUser); 
router.delete('/:messageId', auth, messagesController.deleteMessage);

module.exports = router;
