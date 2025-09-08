// backend/controllers/googleAuthController.js - UPDATED FOR OAUTH CODE FLOW
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5173/auth/login' // Your redirect URI
);

exports.googleLogin = catchAsync(async (req, res, next) => {
  const { code, redirectUri } = req.body;

  if (!code) {
    return next(new AppError('Authorization code is required', 400));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return next(new AppError('Google OAuth not configured', 500));
  }

  try {
    console.log('Received OAuth code:', code);
    console.log('Redirect URI:', redirectUri);

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken({
      code: code,
      redirect_uri: redirectUri || 'http://localhost:5173/auth/login'
    });

    console.log('Received tokens from Google');

    // Verify the ID token and get user info
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    console.log('Google user info:', { googleId, email, name, email_verified });

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
      console.log('Existing user found:', user.email);
      
      // Check if user is banned
      if (user.is_banned === 1) {
        return next(new AppError('Your account has been banned', 403));
      }

      // Update Google ID and profile picture if not set
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = ?, profile_picture = ? WHERE id = ?',
          [googleId, picture, user.id]
        );
        user.google_id = googleId;
        user.profile_picture = picture;
      }

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW(), failed_attempts = 0, locked_until = NULL WHERE id = ?',
        [user.id]
      );
    } else {
      // Create new user
      console.log('Creating new user with Google OAuth');
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
      console.log('New user created:', user.email);
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('JWT token generated successfully');

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
          isVerified: true,
          isNewUser
        }
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    
    if (error.message && error.message.includes('invalid_grant')) {
      return next(new AppError('Authorization code has expired. Please try again.', 401));
    }
    
    if (error.message && error.message.includes('invalid_request')) {
      return next(new AppError('Invalid OAuth request. Please try again.', 400));
    }
    
    return next(new AppError('Google authentication failed. Please try again.', 401));
  }
});

// Get Google OAuth config for frontend
exports.getGoogleConfig = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    }
  });
};