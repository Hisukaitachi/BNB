// backend/controllers/googleAuthController.js - WITH DETAILED ERROR LOGGING
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

exports.googleLogin = catchAsync(async (req, res, next) => {
  const { code, redirectUri } = req.body;

  console.log('=== GOOGLE LOGIN REQUEST ===');
  console.log('Received code:', code ? 'YES' : 'NO');
  console.log('Redirect URI:', redirectUri);
  console.log('Environment check:');
  console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
  console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
  console.log('============================');

  if (!code) {
    return next(new AppError('Authorization code is required', 400));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return next(new AppError('Google OAuth not configured', 500));
  }

  try {
    console.log('Step 1: Exchanging code for tokens...');
    
    // Exchange authorization code for tokens
    const { tokens } = await client.getToken({
      code: code,
      redirect_uri: redirectUri || 'http://localhost:5173/auth/login'
    });

    console.log('Step 2: Tokens received successfully');
    console.log('- Access token:', tokens.access_token ? 'YES' : 'NO');
    console.log('- ID token:', tokens.id_token ? 'YES' : 'NO');

    // Verify the ID token and get user info
    console.log('Step 3: Verifying ID token...');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
      clockSkew: 86400 // 24 hours in seconds
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    console.log('Step 4: User info extracted');
    console.log('- Google ID:', googleId);
    console.log('- Email:', email);
    console.log('- Name:', name);
    console.log('- Email verified:', email_verified);

    if (!email_verified) {
      return next(new AppError('Please use a verified Google account', 400));
    }

    let user;
    let isNewUser = false;

    console.log('Step 5: Checking if user exists...');
    // Check if user exists by email
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      console.log('Step 6: Existing user found:', user.email);
      
      // Check if user is banned
      if (user.is_banned === 1) {
        return next(new AppError('Your account has been banned', 403));
      }

      // Update Google ID and profile picture if not set
      if (!user.google_id) {
        console.log('Step 7: Updating user Google info...');
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
      console.log('Step 6: Creating new user...');
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
      console.log('Step 7: New user created:', user.email);
    }

    console.log('Step 8: Generating JWT token...');
    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Step 9: SUCCESS - Sending response');

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
    console.error('=== GOOGLE OAUTH ERROR DETAILS ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    console.error('Full error object:');
    console.error(error);
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
    console.error('=====================================');
    
    // Handle specific Google API errors
    if (error.message && error.message.includes('invalid_grant')) {
      return next(new AppError('Authorization code has expired or been used. Please try again.', 401));
    }
    
    if (error.message && error.message.includes('invalid_request')) {
      return next(new AppError('Invalid OAuth request. Please check your configuration.', 400));
    }
    
    if (error.message && error.message.includes('redirect_uri_mismatch')) {
      return next(new AppError('Redirect URI mismatch. Check your Google Cloud Console settings.', 400));
    }
    
    if (error.message && error.message.includes('invalid_client')) {
      return next(new AppError('Invalid client credentials. Check your Google Client ID and Secret.', 401));
    }
    
    // Return the actual error message instead of generic one
    return next(new AppError(`Google authentication failed: ${error.message}`, 401));
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