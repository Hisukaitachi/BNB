// backend/routes/authRoutes.js - CREATE THIS FILE
const express = require('express');
const router = express.Router();

// For now, use your existing users controller for basic auth
const usersController = require('../controllers/usersController');

// Basic authentication routes
router.post('/register', usersController.createUser);
router.post('/login', usersController.loginUser);
router.post('/verify-email', usersController.verifyEmail);
router.post('/forgot-password', usersController.sendResetPasswordCode);
router.post('/reset-password', usersController.resetPassword);

// Google OAuth placeholder (will work once you create googleAuthController)
router.get('/google/config', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      configured: !!process.env.GOOGLE_CLIENT_ID,
      message: 'Google OAuth controller not yet implemented'
    }
  });
});

module.exports = router;