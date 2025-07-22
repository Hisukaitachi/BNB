const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const auth = require('../middleware/auth');

router.get('/', auth, notificationsController.getMyNotifications);

router.patch('/read-all', auth, notificationsController.markAllAsRead);

router.patch('/:id/read', auth, notificationsController.markAsRead);

module.exports = router;
