const express = require('express');
const router = express.Router();
const Host = require('../middleware/Host');
const auth = require('../middleware/auth');

// Example: Only hosts can access this route
router.post('/host-only-action', auth, Host, (req, res) => {
  res.send('Host action performed');
});

router.get("/earnings/:hostId", verifyToken, getHostEarnings);

module.exports = router;