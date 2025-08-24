// backend/controllers/googleAuthController.js - REPLACE YOUR OAUTH IMPLEMENTATION
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Google token is required', 400));
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return next(new AppError('Google OAuth not configured', 500));
  }

  try {
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return next(new AppError('Please use a verified Google account', 400));
    }

    let user;
    let isNewUser = false;

    // Check if user exists by email
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      
      // Check if user is banned
      if (user.is_banned === 1) {
        return next(new AppError('Your account has been banned', 403));
      }

      // Update Google ID if not set
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = ?, profile_picture = ? WHERE id = ?',
          [googleId, picture, user.id]
        );
        user.google_id = googleId;
      }

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW(), failed_attempts = 0, locked_until = NULL WHERE id = ?',
        [user.id]
      );
    } else {
      // Create new user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, role, is_verified, profile_picture, google_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [name, email, 'client', 1, picture, googleId]
      );

      const [newUser] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      
      user = newUser[0];
      isNewUser = true;
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      message: isNewUser ? 'Account created with Google' : 'Login successful',
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profile_picture,
          isNewUser
        }
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    
    if (error.message && error.message.includes('Token used too late')) {
      return next(new AppError('Google token has expired. Please try again.', 401));
    }
    
    return next(new AppError('Invalid Google token', 401));
  }
});

// Get Google OAuth config for frontend
exports.getGoogleConfig = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      configured: !!process.env.GOOGLE_CLIENT_ID
    }
  });
};