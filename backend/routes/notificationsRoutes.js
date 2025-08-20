const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notificationsController.getMyNotifications);

router.patch('/read-all', authenticateToken, notificationsController.markAllAsRead);

router.patch('/:id/read', authenticateToken, notificationsController.markAsRead);

// router.get("/:userId/unread-count",authenticateToken, notificationsController.getUnreadCount)
module.exports = router;
