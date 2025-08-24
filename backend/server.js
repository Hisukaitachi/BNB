// backend/server.js - CORRECTED VERSION
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { initializeSocket } = require('./socket');
const startCronJobs = require('./cronJobs');
const { globalErrorHandler, AppError } = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);

console.log('Environment:', process.env.NODE_ENV || 'development');

// Initialize Socket.IO and cron jobs
initializeSocket(server);
startCronJobs();

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for easier development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - SIMPLIFIED
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, add your frontend URLs
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://yourdomain.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};

app.use(cors(corsOptions));

// Rate limiting - SIMPLIFIED
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware - MUST be before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware (remove in production)
app.use((req, res, next) => {
  console.log('=== REQUEST DEBUG ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Raw Body:', req.body);
  console.log('Body Keys:', req.body ? Object.keys(req.body) : 'No body');
  console.log('Headers:', req.headers);
  console.log('=====================');
  next();
});
// Serve static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ONLY load routes that actually exist in your project
// Check if each route file exists before requiring it

// Auth routes - Create authRoutes.js first
try {
  app.use('/api/auth', require('./routes/authRoutes'));
  console.log('✅ Auth routes loaded');
} catch (e) {
  console.log('❌ Auth routes not found - create routes/authRoutes.js');
}

// User management
try {
  app.use('/api/users', require('./routes/usersRoutes'));
  console.log('✅ User routes loaded');
} catch (e) {
  console.log('❌ User routes error:', e.message);
}

// Role switching - Create this file
try {
  app.use('/api/role', require('./routes/roleRoutes'));
  console.log('✅ Role routes loaded');
} catch (e) {
  console.log('❌ Role routes not found - will create later');
}

// Core features - Only load existing ones
try {
  app.use('/api/listings', require('./routes/listingsRoutes'));
  console.log('✅ Listings routes loaded');
} catch (e) {
  console.log('❌ Listings routes error:', e.message);
}

try {
  app.use('/api/bookings', require('./routes/bookingsRoutes'));
  console.log('✅ Bookings routes loaded');
} catch (e) {
  console.log('❌ Bookings routes error:', e.message);
}

try {
  app.use('/api/favorites', require('./routes/favoritesRoutes'));
  console.log('✅ Favorites routes loaded');
} catch (e) {
  console.log('❌ Favorites routes error:', e.message);
}

try {
  app.use('/api/reviews', require('./routes/reviewsRoutes'));
  console.log('✅ Reviews routes loaded');
} catch (e) {
  console.log('❌ Reviews routes error:', e.message);
}

// Communication
try {
  app.use('/api/messages', require('./routes/messagesRoutes'));
  console.log('✅ Messages routes loaded');
} catch (e) {
  console.log('❌ Messages routes error:', e.message);
}

try {
  app.use('/api/notifications', require('./routes/notificationsRoutes'));
  console.log('✅ Notifications routes loaded');
} catch (e) {
  console.log('❌ Notifications routes error:', e.message);
}

// Admin
try {
  app.use('/api/admin', require('./routes/adminRoutes'));
  console.log('✅ Admin routes loaded');
} catch (e) {
  console.log('❌ Admin routes error:', e.message);
}

try {
  app.use('/api/reports', require('./routes/reportsRoutes'));
  console.log('✅ Reports routes loaded');
} catch (e) {
  console.log('❌ Reports routes error:', e.message);
}

// Financial
try {
  app.use('/api/payouts', require('./routes/payoutRoutes'));
  console.log('✅ Payouts routes loaded');
} catch (e) {
  console.log('❌ Payouts routes error:', e.message);
}

try{
  app.use('/api/payments', require('./routes/paymentRoutes'));
  console.log('✅ Payments routes loaded');
} catch (e) {
  console.log('❌ Payments routes error:', e.message);
}

try {
  app.use('/api/refunds', require('./routes/refundRoutes'));
  console.log('✅ Refunds routes loaded');
} catch (e) {
  console.log('❌ Refunds routes error:', e.message);
}

try {
  app.use('/api/transactions', require('./routes/transactionsRoutes'));
  console.log('✅ Transactions routes loaded');
} catch (e) {
  console.log('❌ Transactions routes error:', e.message);
}

// API info
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'StayBnB API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: 'Google OAuth + JWT',
      payments: 'PayMongo Integration',
      realtime: 'Socket.IO'
    },
    endpoints: {
      auth: '/api/auth',
      users: '/api/users', 
      listings: '/api/listings',
      bookings: '/api/bookings',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use((req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
});

// Global error handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Google OAuth:', process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured');
  console.log('PayMongo:', process.env.PAYMONGO_SECRET_KEY ? 'Configured' : 'Not configured');
});

// Error handlers
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  process.exit(1);
});

module.exports = app;