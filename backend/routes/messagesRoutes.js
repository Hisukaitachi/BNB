// backend/routes/messagesRoutes.js - COMPLETE ENHANCED WITH MEDIA SUPPORT
const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authenticateToken } = require('../middleware/auth');
const { uploadMessageMedia } = require('../middleware/multer'); // Import new media upload middleware

// Debug middleware for messages routes
router.use((req, res, next) => {
  console.log('📨 Messages Route Debug:', {
    method: req.method,
    url: req.originalUrl,
    contentType: req.headers['content-type'],
    bodyKeys: Object.keys(req.body || {}),
    filesCount: req.files ? Object.keys(req.files).length : 0
  });
  next();
});

// ENHANCED: Send a message with optional media support
router.post('/', 
  authenticateToken, 
  uploadMessageMedia, // Handle multiple media files
  (req, res, next) => {
    console.log('📁 Message files received:', req.files);
    console.log('📝 Message body received:', req.body);
    next();
  },
  messagesController.sendMessage
);

// Get specific conversation (between two users)
router.get('/conversation/:otherUserId', authenticateToken, messagesController.getConversation);

// Get inbox (list of latest chats)
router.get('/inbox', authenticateToken, messagesController.getInbox);

// NEW: Get user message statistics
router.get('/stats', authenticateToken, messagesController.getMessageStats);

// NEW: Search messages
router.get('/search', authenticateToken, messagesController.searchMessages);

// Mark a specific message as read
router.patch('/:id/read', authenticateToken, messagesController.markAsRead);

// Mark an entire conversation as read
router.patch('/conversation/:otherUserId/read', authenticateToken, messagesController.markConversationAsRead);

// NEW: Delete message
router.delete('/:id', authenticateToken, messagesController.deleteMessage);

module.exports = router;