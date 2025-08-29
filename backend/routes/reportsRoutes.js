const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");
const { authenticateToken } = require('../middleware/auth'); // ADD THIS

// Report submission (Client/Host) - ADD AUTH
router.post("/", authenticateToken, reportsController.submitReport);

// ADD MISSING ROUTE - Get user's reports
router.get("/my-reports", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const [reports] = await require('../db').query(`
      SELECT r.*, u.name as reported_user_name
      FROM reports r
      LEFT JOIN users u ON r.reported_user_id = u.id
      WHERE r.reporter_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

    res.status(200).json({
      status: 'success',
      data: { reports }
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reports'
    });
  }
});

// Admin view all reports
router.get("/admin/reports", reportsController.getAllReports);

// Admin take action  
router.post("/admin/actions", reportsController.adminTakeAction);

module.exports = router;