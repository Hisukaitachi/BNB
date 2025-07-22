const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authenticate = require('../middleware/auth');

router.put('/:id/promote-admin', async (req, res) => {
  try {
    const [result] = await require('../db').query(
      'UPDATE users SET role = "admin" WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'User promoted to admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, usersController.getMyProfile);
router.put('/me', authenticate, usersController.updateMyProfile);
router.put('/me/change-password', authenticate, usersController.changePassword);
router.post('/forgot-password', usersController.sendResetPasswordCode);
router.post('/reset-password', usersController.resetPassword);
router.post('/verify-email', usersController.verifyEmail);
router.post('/register', usersController.createUser);
router.put('/:id/promote', usersController.promoteToHost);
router.put('/:id/demote', usersController.demoteToClient);
router.post('/login', usersController.loginUser);

module.exports = router;
