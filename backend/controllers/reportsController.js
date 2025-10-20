const pool = require("../db");
const { createNotification } = require("./notificationsController");

/**
 * SUBMIT REPORT
 * Allows users to report other users for violations
 * Replaced: sp_submit_report stored procedure
 * 
 * Creates a report record that admins can review and act upon
 */
exports.submitReport = async (req, res) => {
  const { reporter_id, reported_user_id, booking_id, reason } = req.body;
  
  console.log('📩 Report submission received:');
  console.log('Data:', { reporter_id, reported_user_id, booking_id, reason });

  try {
    // Direct SQL INSERT - replaces sp_submit_report stored procedure
    await pool.query(
      "INSERT INTO reports (reporter_id, reported_user_id, booking_id, reason, created_at) VALUES (?, ?, ?, ?, NOW())",
      [reporter_id, reported_user_id, booking_id, reason]
    );

    console.log('✅ Report submitted successfully to database');

    res.status(201).json({ message: "Report submitted successfully." });
  } catch (err) {
    console.error("❌ Error submitting report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET ALL REPORTS
 * Retrieves all reports for admin review
 * Replaced: sp_get_all_reports stored procedure
 * 
 * Includes reporter and reported user information
 */
exports.getAllReports = async (req, res) => {
  try {
    // Direct SQL with LEFT JOINs - replaces sp_get_all_reports stored procedure
    const [reports] = await pool.query(`
      SELECT 
        r.id,
        r.reporter_id,
        r.reported_user_id,
        r.booking_id,
        r.reason,
        r.status,
        r.created_at,
        IFNULL(reporter.name, 'Unknown') AS reporter_name,
        IFNULL(reporter.email, 'No email') AS reporter_email,
        IFNULL(reported.name, 'Unknown') AS reported_user_name,
        IFNULL(reported.email, 'No email') AS reported_user_email
      FROM reports r
      LEFT JOIN users reporter ON r.reporter_id = reporter.id
      LEFT JOIN users reported ON r.reported_user_id = reported.id
      ORDER BY r.created_at DESC
    `);
    
    res.status(200).json({ reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getMyReports = async (req, res) => {
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
};

/**
 * ADMIN TAKE ACTION
 * Allows admin to act on a report (ban, warn, suspend, etc.)
 * Replaced: sp_take_admin_action stored procedure
 * 
 * Actions include: ban, warn, suspend, no_action, listing_removed, role_change
 * Uses transaction to ensure data integrity
 * Sends notifications to affected user and reporter
 */
exports.adminTakeAction = async (req, res) => {
  const { user_id, action_type, reason, report_id } = req.body;
  
  // Debug: Check what we're receiving
  console.log('req.user:', req.user);
  console.log('admin_id from req.user:', req.user?.id);
  
  // Validate admin authentication
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: Admin authentication required" });
  }
  
  const admin_id = req.user.id;

  const connection = await pool.getConnection();

  try {
    // Verify the admin exists and has admin role
    const [adminCheck] = await connection.query(
      'SELECT id, role FROM users WHERE id = ? AND role = "admin"',
      [admin_id]
    );
    
    if (adminCheck.length === 0) {
      await connection.release();
      return res.status(403).json({ error: "Forbidden: Admin privileges required" });
    }

    await connection.beginTransaction();

    // INSERT admin action log
    await connection.query(
      "INSERT INTO admin_actions (admin_id, user_id, action_type, reason, report_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [admin_id, user_id, action_type, reason, report_id]
    );

    // HANDLE DIFFERENT ACTION TYPES
    switch(action_type) {
      case 'ban':
        // Ban the user
        await connection.query(
          'UPDATE users SET is_banned = 1 WHERE id = ?',
          [user_id]
        );
        // Mark report as resolved
        await connection.query(
          'UPDATE reports SET status = "resolved" WHERE id = ?',
          [report_id]
        );
        break;
        
      case 'suspend':
        // Suspend user
        await connection.query(
          'UPDATE reports SET status = "resolved" WHERE id = ?',
          [report_id]
        );
        break;
        
      case 'warn':
        // Issue warning
        await connection.query(
          'UPDATE reports SET status = "resolved" WHERE id = ?',
          [report_id]
        );
        break;
        
      case 'no_action':
        // Dismiss report
        await connection.query(
          'UPDATE reports SET status = "dismissed" WHERE id = ?',
          [report_id]
        );
        break;
        
      default:
        // Other actions
        await connection.query(
          'UPDATE reports SET status = "resolved" WHERE id = ?',
          [report_id]
        );
    }

    await connection.commit();

    // SEND NOTIFICATIONS to affected user
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

    // Notify the reported user
    await createNotification({
      userId: user_id,
      message: notificationMessage,
      type: 'admin_action'
    });

    // Notify the reporter that action was taken
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
    await connection.rollback();
    console.error("Error taking action:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    connection.release();
  }
};