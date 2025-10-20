const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");
const { authenticateToken } = require('../middleware/auth'); // ADD THIS

// Report submission (Client/Host) - ADD AUTH
router.post("/", authenticateToken, reportsController.submitReport);

// ADD MISSING ROUTE - Get user's reports
router.get("/my-reports", authenticateToken, reportsController.getMyReports);   

// Admin view all reports
router.get("/admin/reports",authenticateToken, reportsController.getAllReports);

// Admin take action  
router.post("/admin/actions",authenticateToken, reportsController.adminTakeAction);

module.exports = router;