const pool = require("../db");
const { createNotification } = require("./notificationsController");

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
  const { user_id, action_type, reason, report_id } = req.body;
  const admin_id = req.user?.id || 6; // Get from auth or fallback

  try {
    // Take the admin action
    await pool.query("CALL sp_take_admin_action(?, ?, ?, ?, ?)", [
      admin_id,
      user_id,
      action_type,
      reason,
      report_id,
    ]);

    // Send notification to the user
    let notificationMessage = '';
    switch(action_type) {
      case 'ban':
        notificationMessage = `Your account has been banned due to a report. Reason: ${reason}`;
        break;
      case 'warn':
        notificationMessage = `You have received a warning from administrators. Reason: ${reason}`;
        break;
      case 'suspend':
        notificationMessage = `Your account has been suspended. Reason: ${reason}`;
        break;
      case 'no_action':
        notificationMessage = `A report about your account has been reviewed and no action was taken.`;
        break;
      default:
        notificationMessage = `Administrative action taken on your account. Reason: ${reason}`;
    }

    // Create notification for the user
    await createNotification({
      userId: user_id,
      message: notificationMessage,
      type: 'admin_action'
    });

    // Also notify the reporter that action was taken
    const [reporterInfo] = await pool.query(
      'SELECT reporter_id FROM reports WHERE id = ?', 
      [report_id]
    );
    
    if (reporterInfo.length > 0) {
      await createNotification({
        userId: reporterInfo[0].reporter_id,
        message: `Action has been taken on your report #${report_id}. The reported user has been ${action_type === 'no_action' ? 'reviewed' : action_type}.`,
        type: 'report_update'
      });
    }

    res.status(200).json({ message: "Action taken successfully." });
  } catch (err) {
    console.error("Error taking action:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};