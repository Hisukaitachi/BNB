// backend/middleware/oauth.js
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const catchAsync = require('../utils/catchAsync');
const { logSecurityEvent } = require('./securityLogger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new AppError('Google token is required', 400));
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return next(new AppError('Invalid Google token', 401));
    }

    // Extract user info from Google
    req.googleUser = {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified
    };

    // Log OAuth attempt
    await logSecurityEvent(req, 'oauth_verification', {
      provider: 'google',
      email: payload.email,
      verified: payload.email_verified
    });

    next();
  } catch (error) {
    await logSecurityEvent(req, 'oauth_verification_failed', {
      provider: 'google',
      error: error.message
    });
    
    return next(new AppError('Invalid Google token', 401));
  }
});

const handleGoogleAuth = catchAsync(async (req, res, next) => {
  const { googleId, email, name, picture, emailVerified } = req.googleUser;

  if (!emailVerified) {
    return next(new AppError('Please use a verified Google account', 400));
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if user exists with this email
    const [existingUsers] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    let user;
    let isNewUser = false;

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      
      // Check if user is banned
      if (user.is_banned === 1) {
        return next(new AppError('Account has been banned', 403));
      }

      // Check if this Google account is already linked
      const [oauthLinks] = await connection.query(
        'SELECT * FROM oauth_users WHERE user_id = ? AND provider = "google"',
        [user.id]
      );

      if (oauthLinks.length === 0) {
        // Link Google account to existing user
        await connection.query(
          'INSERT INTO oauth_users (user_id, provider, provider_id) VALUES (?, ?, ?)',
          [user.id, 'google', googleId]
        );
      }

      // Update user profile picture if not set
      if (!user.profile_picture && picture) {
        await connection.query(
          'UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?',
          [picture, user.id]
        );
      }

    } else {
      // Create new user
      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, role, is_verified, profile_picture, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [name, email, 'client', 1, picture]
      );

      const userId = userResult.insertId;

      // Link Google account
      await connection.query(
        'INSERT INTO oauth_users (user_id, provider, provider_id) VALUES (?, ?, ?)',
        [userId, 'google', googleId]
      );

      // Get the newly created user
      const [newUsers] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      user = newUsers[0];
      isNewUser = true;
    }

    // Update last login
    await connection.query(
      'UPDATE users SET last_login = NOW(), failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [user.id]
    );

    await connection.commit();

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Log successful OAuth login
    await logSecurityEvent(req, 'oauth_login_success', {
      provider: 'google',
      userId: user.id,
      isNewUser,
      email: user.email
    });

    res.status(200).json({
      status: 'success',
      message: isNewUser ? 'Account created successfully with Google' : 'Login successful',
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
    await connection.rollback();
    
    await logSecurityEvent(req, 'oauth_login_failed', {
      provider: 'google',
      error: error.message,
      email: req.googleUser?.email
    });
    
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  verifyGoogleToken,
  handleGoogleAuth
};