// backend/server.js - FIXED VERSION with webhook handling
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initializeSocket } = require('./socket');
const startCronJobs = require('./cronJobs');
const { globalErrorHandler, AppError } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

console.log('🚀 Starting StayBnB Backend...');
console.log('Environment:', process.env.NODE_ENV || 'development');

// Initialize Socket.IO and cron jobs
initializeSocket(server);
startCronJobs();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// SIMPLIFIED CORS - Allow everything for testing
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['*']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

app.use(limiter);

// =========================================================
// WEBHOOK RAW BODY HANDLING - MUST BE BEFORE BODY PARSERS!
// =========================================================
console.log('🔐 Setting up webhook raw body handler...');

// Capture raw body for PayMongo webhook signature verification
app.use('/api/payments/webhook', 
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Store raw body as string for signature verification
    req.rawBody = req.body.toString('utf-8');
    console.log('📦 Webhook raw body captured, length:', req.rawBody.length);
    
    // Parse JSON for use in controller
    try {
      req.body = JSON.parse(req.rawBody);
      console.log('✅ Webhook body parsed successfully');
    } catch (e) {
      console.error('❌ Failed to parse webhook body:', e.message);
      req.body = {};
    }
    next();
  }
);

// =========================================================
// REGULAR BODY PARSING - AFTER WEBHOOK HANDLER
// =========================================================

// Body parsing middleware for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Serve static files (uploads) - FIXED with permissive CORS
// app.use('/uploads', cors({ origin: '*' }), express.static(path.join(__dirname, 'uploads'), {
//   setHeaders: (res, path) => {
//     res.set('Cross-Origin-Resource-Policy', 'cross-origin');
//   }
// }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'StayBnB API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime())
  });
});

// Debug endpoint to fetch PayMongo payment intent details
app.get('/api/debug-payment/:intentId', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${req.params.intentId}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64')}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

// API Routes - Clean and organized
console.log('📡 Loading API routes...');

// Core user management
app.use('/api/users', require('./routes/usersRoutes'));
console.log('✅ User routes loaded');

app.use('/api/role', require('./routes/roleRoutes')); 
console.log('✅ Role routes loaded');

// Core business features  
app.use('/api/listings', require('./routes/listingsRoutes'));
console.log('✅ Listings routes loaded');

app.use('/api/bookings', require('./routes/bookingsRoutes'));
console.log('✅ Bookings routes loaded');

app.use('/api/favorites', require('./routes/favoritesRoutes'));
console.log('✅ Favorites routes loaded');

app.use('/api/reviews', require('./routes/reviewsRoutes'));
console.log('✅ Reviews routes loaded');

// Communication features
app.use('/api/messages', require('./routes/messagesRoutes'));
console.log('✅ Messages routes loaded');

app.use('/api/notifications', require('./routes/notificationsRoutes'));
console.log('✅ Notifications routes loaded');

// Financial features
app.use('/api/payments', require('./routes/paymentRoutes'));
console.log('✅ Payment routes loaded');

app.use('/api/payouts', require('./routes/payoutRoutes'));
console.log('✅ Payout routes loaded');

// Refund features
app.use('/api/refunds', require('./routes/refundRoutes'));
console.log('✅ Refund routes loaded');
// Admin features
app.use('/api/admin', require('./routes/adminRoutes'));
console.log('✅ Admin routes loaded');

app.use('/api/reports', require('./routes/reportsRoutes'));
console.log('✅ Reports routes loaded');

// Health monitoring
app.use('/api/health', require('./routes/healthRoutes'));
console.log('✅ Health routes loaded');

// API information endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🏠 StayBnB API - Accommodation Booking Platform',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: 'JWT + Google OAuth',
      payments: 'PayMongo Integration',
      realtime: 'Socket.IO Messaging',
      uploads: 'Multer File Handling',
      geolocation: 'OpenCage Geocoding'
    },
    endpoints: {
      users: '/api/users',
      listings: '/api/listings',
      bookings: '/api/bookings',
      messages: '/api/messages',
      payments: '/api/payments',
      admin: '/api/admin',
      health: '/api/health'
    },
    documentation: 'Check individual route files for endpoint details'
  });
});

// 404 handler for undefined routes - FIXED to avoid path-to-regexp error
app.use((req, res, next) => {
  const error = new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404);
  next(error);
});

// Global error handler
app.use(globalErrorHandler);

// Server configuration
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('🎉 StayBnB Backend Started Successfully!');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Docs: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  
  // Configuration status
  console.log('\n📋 Service Configuration:');
  console.log('🔐 JWT:', process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing');
  console.log('📧 Email:', process.env.EMAIL_USER ? '✅ Configured' : '❌ Missing');
  console.log('🔍 Google OAuth:', process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '⚠️  Optional');
  console.log('💳 PayMongo:', process.env.PAYMONGO_SECRET_KEY ? '✅ Configured' : '⚠️  Optional');
  console.log('🔒 PayMongo Webhook:', process.env.PAYMONGO_WEBHOOK_SECRET ? '✅ Configured' : '❌ Missing');
  console.log('🌍 Geocoding:', process.env.OPENCAGE_API_KEY ? '✅ Configured' : '⚠️  Optional');
  console.log('📦 Database:', 'Loading...');
  
  // Test database connection
  const pool = require('./db');
  pool.query('SELECT 1 as test')
    .then(() => console.log('💾 Database: ✅ Connected'))
    .catch(err => console.log('💾 Database: ❌ Connection failed -', err.message));
});

// Graceful shutdown handlers
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.log('🔄 Shutting down gracefully...');
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.log('🔄 Shutting down immediately...');
  process.exit(1);
});

// Graceful shutdown on SIGTERM (for deployment environments)
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = app;