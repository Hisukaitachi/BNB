// backend/routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check with database
router.get('/detailed', async (req, res) => {
  try {
    // Test database connection
    const [dbResult] = await pool.query('SELECT 1 as test');
    
    // Get basic stats
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [listingCount] = await pool.query('SELECT COUNT(*) as count FROM listings');
    const [bookingCount] = await pool.query('SELECT COUNT(*) as count FROM bookings');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        response_time: 'good'
      },
      statistics: {
        total_users: userCount[0].count,
        total_listings: listingCount[0].count,
        total_bookings: bookingCount[0].count
      },
      memory_usage: process.memoryUsage(),
      node_version: process.version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Readiness check for Kubernetes/Docker
router.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

// Liveness check for Kubernetes/Docker
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

module.exports = router;