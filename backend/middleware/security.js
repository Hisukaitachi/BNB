// backend/middleware/security.js - Fixed CORS configuration
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const compression = require('compression');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// Replace the corsOptions in backend/middleware/security.js
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',      // React default
      'http://localhost:5173',      // Vite default - YOUR FRONTEND
      'http://localhost:8080',      // Vue default
      'http://localhost:4200',      // Angular default
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://yourdomain.com',     // Add your production domain
      'https://www.yourdomain.com'
    ];
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { 
        origin, 
        timestamp: new Date().toISOString(),
        allowedOrigins 
      });
      // Still allow in development to prevent blocking during testing
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new AppError('Not allowed by CORS policy', 403));
      }
    }
  },
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'X-Total-Count', 
    'X-Page-Count'
  ],
  maxAge: 86400 // 24 hours preflight cache
};

// Security headers configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.yourdomain.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for uploads
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
};

// Custom input sanitization
const inputSanitizer = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeInput(req.body);
    }
    
    // Sanitize query (be careful not to overwrite)
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeInput(req.query);
      // Create new query object instead of modifying existing one
      req.sanitizedQuery = sanitizedQuery;
    }
    
    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeInput(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error', { error: error.message });
    next(new AppError('Invalid input format', 400));
  }
};

// Helper function to sanitize input
function sanitizeInput(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Remove potential XSS
    let sanitized = obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
    
    // Remove MongoDB operators
    sanitized = sanitized.replace(/^\$/, '');
    
    return sanitized;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize key
        const cleanKey = key.replace(/^\$/, '').replace(/\./g, '');
        sanitized[cleanKey] = sanitizeInput(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Request size limits
const requestSizeLimiter = (req, res, next) => {
  const maxSize = {
    '/api/listings': 10 * 1024 * 1024, // 10MB for listings with images
    '/api/users/register': 1024 * 1024, // 1MB for user registration
    '/api/messages': 512 * 1024, // 512KB for messages
    default: 2 * 1024 * 1024 // 2MB default
  };
  
  const route = req.path;
  const limit = maxSize[route] || maxSize.default;
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > limit) {
    return next(new AppError(`Request too large. Maximum size: ${limit / (1024 * 1024)}MB`, 413));
  }
  
  next();
};

// Enhanced CORS debugging middleware
const corsDebugger = (req, res, next) => {
  const origin = req.get('Origin');
  
  // Log CORS requests for debugging
  if (origin) {
    logger.info('CORS Request', {
      origin,
      method: req.method,
      url: req.originalUrl,
      headers: {
        'Access-Control-Request-Method': req.get('Access-Control-Request-Method'),
        'Access-Control-Request-Headers': req.get('Access-Control-Request-Headers')
      }
    });
  }
  
  // Ensure CORS headers are always present in response
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(200).end();
  }
  
  next();
};

// IP filter middleware
const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Blacklisted IPs (add problematic IPs here)
  const blacklist = [
    // '192.168.1.100', // Example blocked IP
  ];
  
  // Check blacklist
  if (blacklist.includes(clientIP)) {
    logger.warn('Blocked IP attempted access', { 
      ip: clientIP, 
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    return next(new AppError('Access denied', 403));
  }
  
  next();
};

// User-Agent validation
const userAgentValidator = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  // Block known malicious user agents
  const maliciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /masscan/i
  ];
  
  if (userAgent && maliciousPatterns.some(pattern => pattern.test(userAgent))) {
    logger.warn('Blocked malicious User-Agent', { 
      userAgent,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return next(new AppError('Access denied', 403));
  }
  
  next();
};

// Security logging middleware
const securityLogger = (req, res, next) => {
  // Log potentially suspicious requests
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection
    /exec\(/i,        // Code injection
    /eval\(/i         // Code injection
  ];
  
  const fullUrl = req.originalUrl + JSON.stringify(req.body || {});
  
  if (suspiciousPatterns.some(pattern => pattern.test(fullUrl))) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

module.exports = {
  corsOptions,
  helmetConfig,
  requestSizeLimiter,
  ipFilter,
  userAgentValidator,
  securityLogger,
  corsDebugger,
  
  // Main security middleware function
  applySecurity: (app) => {
    // Trust proxy (important for rate limiting and IP detection)
    app.set('trust proxy', 1);
    
    // CORS debugging (apply first to catch all requests)
    app.use(corsDebugger);
    
    // Basic security headers
    app.use(helmet(helmetConfig));
    
    // CORS (apply after debugging)
    app.use(cors(corsOptions));
    
    // Compression
    app.use(compression());
    
    // Request size limiting
    app.use(requestSizeLimiter);
    
    // Custom input sanitization
    app.use(inputSanitizer);
    
    // Prevent parameter pollution
    app.use(hpp({
      whitelist: ['sort', 'fields', 'page', 'limit'] // Allow these duplicate params
    }));
    
    // Custom security middleware
    app.use(userAgentValidator);
    app.use(ipFilter);
    app.use(securityLogger);
    
    logger.info('Security middleware with enhanced CORS applied successfully');
  }
};