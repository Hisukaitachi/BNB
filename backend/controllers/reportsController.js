const pool = require("../db");

exports.submitReport = async (req, res) => {
  const { reporter_id, reported_user_id, booking_id, reason } = req.body;
  
  console.log('📩 Report submission received:');
  console.log('Data:', { reporter_id, reported_user_id, booking_id, reason });

  try {
    console.log('🔄 Calling stored procedure sp_submit_report...');
    
    const result = await pool.query("CALL sp_submit_report(?, ?, ?, ?)", [
      reporter_id,
      reported_user_id,
      booking_id,
      reason,
    ]);

    console.log('✅ Report submitted successfully to database');
    console.log('Database result:', result);

    res.status(201).json({ message: "Report submitted successfully." });
  } catch (err) {
    console.error("❌ Error submitting report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const [results] = await pool.query("CALL sp_get_all_reports()");
    const reports = results[0];
    res.status(200).json({ reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.adminTakeAction = async (req, res) => {
  const { admin_id, user_id, action_type, reason, report_id } = req.body;

  try {
    await pool.query("CALL sp_take_admin_action(?, ?, ?, ?, ?)", [
      admin_id,
      user_id,
      action_type,
      reason,
      report_id,
    ]);

    res.status(200).json({ message: "Action taken successfully." });
  } catch (err) {
    console.error("Error taking action:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
