const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");

// Report submission (Client/Host)
router.post("/", reportsController.submitReport);

// Admin view all reports
router.get("/admin/reports", reportsController.getAllReports);

// Admin take action
router.post("/admin/actions", reportsController.adminTakeAction);

router.get("/test", (req, res) => {
  res.send("Test route works!");
});

module.exports = router;
