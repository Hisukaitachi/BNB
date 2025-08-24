const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken } = require('../middleware/auth');

router.post('/switch', authenticateToken, roleController.switchRole);
router.get('/info', authenticateToken, roleController.getRoleInfo);

module.exports = router;
