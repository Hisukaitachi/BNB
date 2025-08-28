const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const googleAuthController = require('../controllers/googleAuthController'); // ADDED
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Import validation schemas
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  userRoleSchema
} = require('../validation/userValidation');

// Google OAuth routes - ADDED
router.post('/google-login', googleAuthController.googleLogin);
router.get('/google-config', googleAuthController.getGoogleConfig);

// Promote to admin route (no validation changes needed)
router.put('/:id/promote-admin', validate(userRoleSchema), async (req, res) => {
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

// Protected routes
router.get('/me', authenticateToken, usersController.getMyProfile);
router.put('/me', authenticateToken, validate(updateProfileSchema), usersController.updateMyProfile);
router.put('/me/change-password', authenticateToken, validate(changePasswordSchema), usersController.changePassword);

// Public routes with validation
router.post('/forgot-password', validate(forgotPasswordSchema), usersController.sendResetPasswordCode);
router.post('/reset-password', validate(resetPasswordSchema), usersController.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), usersController.verifyEmail);
router.post('/register', validate(registerSchema), usersController.createUser);
router.post('/login', validate(loginSchema), usersController.loginUser);

// Admin routes with validation
router.put('/:id/promote', validate(userRoleSchema), usersController.promoteToHost);
router.put('/:id/demote', validate(userRoleSchema), usersController.demoteToClient);

// Status check route
router.get("/check-my-ban", authenticateToken, usersController.checkMyBanStatus);

module.exports = router;