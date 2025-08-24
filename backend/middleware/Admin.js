module.exports = function (req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      status: 'fail',
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      status: 'fail',
      message: 'Admin access required' 
    });
  }

  next();
};