// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { verifyGoogleToken, handleGoogleAuth } = require('../middleware/oauth');
const { authLimiter } = require('../middleware/rateLimiting');
const { securityLogger } = require('../middleware/securityLogger');

// Google OAuth login
router.post('/google', 
  authLimiter,
  securityLogger('google_oauth_attempt'),
  verifyGoogleToken,
  handleGoogleAuth
);

// Get OAuth providers info
router.get('/providers', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      providers: [
        {
          name: 'google',
          displayName: 'Google',
          available: !!process.env.GOOGLE_CLIENT_ID
        }
      ]
    }
  });
});

router.get('/test-config', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      googleConfigured: !!process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing'
    }
  });
});

module.exports = router;