// backend/middleware/rateLimiting.js - Advanced rate limiting
const rateLimit = require('express-rate-limit');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// Store for tracking suspicious activity
const suspiciousIPs = new Map();

// Custom rate limit handler
const rateLimitHandler = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Log rate limit hit
  logger.warn('Rate limit exceeded', {
    ip: clientIP,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Track suspicious activity
  const current = suspiciousIPs.get(clientIP) || 0;
  suspiciousIPs.set(clientIP, current + 1);
  
  // Auto-ban after multiple rate limit violations
  if (current >= 5) {
    logger.error('Potential DDoS attack detected', {
      ip: clientIP,
      violations: current + 1
    });
  }
  
  const error = new AppError(
    'Too many requests from this IP. Please try again later.',
    429
  );
  error.retryAfter = 60; // seconds
  
  return next(error);
};

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    status: 'fail',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: 900 // 15 minutes in seconds
  },
  handler: rateLimitHandler,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Password reset rate limiting
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    status: 'fail',
    message: 'Too many password reset attempts. Please try again in 1 hour.',
    retryAfter: 3600
  },
  handler: rateLimitHandler
});

// Registration rate limiting
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour  
  max: 10, // Limit each IP to 10 registrations per hour
  message: {
    status: 'fail',
    message: 'Too many registration attempts. Please try again in 1 hour.',
    retryAfter: 3600
  },
  handler: rateLimitHandler
});

// API endpoints rate limiting (for listings, bookings, etc.)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 API requests per 15 minutes
  message: {
    status: 'fail',
    message: 'API rate limit exceeded. Please slow down your requests.',
    retryAfter: 900
  },
  handler: rateLimitHandler
});

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    status: 'fail',
    message: 'Upload rate limit exceeded. Please try again later.',
    retryAfter: 3600
  },
  handler: rateLimitHandler
});

// Admin operations rate limiting
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 admin requests per 5 minutes
  message: {
    status: 'fail',
    message: 'Admin rate limit exceeded.',
    retryAfter: 300
  },
  handler: rateLimitHandler
});

// Clean up suspicious IPs tracker periodically
setInterval(() => {
  suspiciousIPs.clear();
}, 60 * 60 * 1000); // Clear every hour

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  apiLimiter,
  uploadLimiter,
  adminLimiter
};