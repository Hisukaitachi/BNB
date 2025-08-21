const pool = require('../db');

const logSecurityEvent = async (req, action, details = null) => {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    
    await pool.query(
      'INSERT INTO security_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, ipAddress, userAgent, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Security logging failed:', error.message);
  }
};

const securityLogger = (action) => {
  return (req, res, next) => {
    // Log the security event
    logSecurityEvent(req, action, {
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    next();
  };
};

module.exports = { logSecurityEvent, securityLogger };