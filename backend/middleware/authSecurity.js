// backend/middleware/authSecurity.js - Enhanced authentication security
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// Track failed login attempts
const failedAttempts = new Map();
const suspiciousTokens = new Set();

// Account lockout configuration
const LOCKOUT_CONFIG = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  maxSuspiciousActivity: 10
};

// Enhanced JWT validation
const enhancedJWTValidator = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Access token required', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is in suspicious list
    if (suspiciousTokens.has(token)) {
      logger.warn('Suspicious token usage detected', {
        ip: req.ip,
        token: token.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      });
      return next(new AppError('Token flagged as suspicious', 401));
    }
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Additional token validation
    if (!decoded.id || !decoded.role) {
      suspiciousTokens.add(token);
      return next(new AppError('Invalid token structure', 401));
    }
    
    // Check if user still exists and is active
    const [users] = await pool.query(
      'SELECT id, email, role, is_banned, is_verified, last_login, failed_attempts, locked_until FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (!users.length) {
      suspiciousTokens.add(token);
      return next(new AppError('User not found', 401));
    }
    
    const user = users[0];
    
    // Check if user is banned
    if (user.is_banned === 1) {
      return next(new AppError('Account has been banned', 403));
    }
    
    // Check if user is verified (optional)
    if (user.is_verified === 0) {
      return next(new AppError('Please verify your email address', 403));
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const unlockTime = new Date(user.locked_until).toLocaleString();
      return next(new AppError(`Account is locked until ${unlockTime}`, 423));
    }
    
    // Check for role changes
    if (decoded.role !== user.role) {
      logger.warn('User role changed, token invalidated', {
        userId: user.id,
        oldRole: decoded.role,
        newRole: user.role,
        ip: req.ip
      });
      return next(new AppError('Token invalid due to role change', 401));
    }
    
    // Update last activity
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      lastLogin: user.last_login
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401));
    } else {
      logger.error('JWT validation error', {
        error: error.message,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return next(new AppError('Authentication error', 401));
    }
  }
};

// Account lockout middleware
const accountLockoutProtection = async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }
  
  try {
    // Check current failed attempts for this email
    const [users] = await pool.query(
      'SELECT id, email, failed_attempts, locked_until FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length > 0) {
      const user = users[0];
      
      // Check if account is currently locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const unlockTime = new Date(user.locked_until).toLocaleString();
        return next(new AppError(`Account is locked until ${unlockTime}`, 423));
      }
      
      // Check if too many failed attempts
      if (user.failed_attempts >= LOCKOUT_CONFIG.maxAttempts) {
        // Lock the account
        const lockUntil = new Date(Date.now() + LOCKOUT_CONFIG.lockoutDuration);
        
        await pool.query(
          'UPDATE users SET locked_until = ?, failed_attempts = ? WHERE id = ?',
          [lockUntil, user.failed_attempts + 1, user.id]
        );
        
        logger.warn('Account locked due to too many failed attempts', {
          email: user.email,
          attempts: user.failed_attempts + 1,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        
        return next(new AppError('Account locked due to too many failed attempts', 423));
      }
    }
    
    next();
    
  } catch (error) {
    logger.error('Account lockout check error', { error: error.message });
    next(); // Continue on error to not block legitimate users
  }
};

// Track failed login attempts
const trackFailedLogin = async (email, ip) => {
  try {
    // Update database
    await pool.query(`
      UPDATE users 
      SET failed_attempts = failed_attempts + 1,
          last_failed_login = NOW(),
          last_failed_ip = ?
      WHERE email = ?
    `, [ip, email]);
    
    // Track in memory for additional protection
    const key = `${email}-${ip}`;
    const current = failedAttempts.get(key) || 0;
    failedAttempts.set(key, current + 1);
    
    logger.warn('Failed login attempt', {
      email,
      ip,
      attempts: current + 1,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to track login attempt', { error: error.message });
  }
};

// Reset failed attempts on successful login
const resetFailedAttempts = async (userId, ip) => {
  try {
    await pool.query(`
      UPDATE users 
      SET failed_attempts = 0,
          locked_until = NULL,
          last_login = NOW(),
          last_login_ip = ?
      WHERE id = ?
    `, [ip, userId]);
    
    logger.info('Successful login', {
      userId,
      ip,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to reset login attempts', { error: error.message });
  }
};

// Password strength validator
const passwordStrengthValidator = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const issues = [];
  
  if (password.length < minLength) {
    issues.push(`at least ${minLength} characters`);
  }
  if (!hasUpperCase) {
    issues.push('at least one uppercase letter');
  }
  if (!hasLowerCase) {
    issues.push('at least one lowercase letter');
  }
  if (!hasNumbers) {
    issues.push('at least one number');
  }
  if (!hasSpecialChar) {
    issues.push('at least one special character');
  }
  
  return {
    isValid: issues.length === 0,
    issues: issues
  };
};

// Session management
const sessionManager = {
  // Store active sessions (in production, use Redis)
  activeSessions: new Map(),
  
  // Create session
  createSession: (userId, token, req) => {
    const sessionId = `${userId}-${Date.now()}`;
    const session = {
      id: sessionId,
      userId,
      token,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    sessionManager.activeSessions.set(sessionId, session);
    return sessionId;
  },
  
  // Validate session
  validateSession: (sessionId, req) => {
    const session = sessionManager.activeSessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Check if IP changed (potential session hijacking)
    if (session.ip !== req.ip) {
      logger.warn('Session IP mismatch detected', {
        sessionId,
        originalIP: session.ip,
        currentIP: req.ip,
        userId: session.userId
      });
      sessionManager.destroySession(sessionId);
      return false;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    return true;
  },
  
  // Destroy session
  destroySession: (sessionId) => {
    sessionManager.activeSessions.delete(sessionId);
  },
  
  // Clean expired sessions
  cleanExpiredSessions: () => {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of sessionManager.activeSessions) {
      if (now - session.lastActivity > maxAge) {
        sessionManager.destroySession(sessionId);
      }
    }
  }
};

// Clean up expired sessions every hour
setInterval(sessionManager.cleanExpiredSessions, 60 * 60 * 1000);

// Clean up failed attempts every 30 minutes
setInterval(() => {
  failedAttempts.clear();
}, 30 * 60 * 1000);

module.exports = {
  enhancedJWTValidator,
  accountLockoutProtection,
  trackFailedLogin,
  resetFailedAttempts,
  passwordStrengthValidator,
  sessionManager
};