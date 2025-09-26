// cronJobs.js - Enhanced with Automated Payouts
const cron = require("node-cron");
const autoCompleteBookings = require("./utils/autoCompleteBookings");
const autoCompleteReservations = require("./utils/autoCompleteReservations");
const pool = require("./db");

async function processAutomaticPayouts() {
  try {
    console.log("💰 Processing automatic payouts...");
    
    // Get all hosts with auto-payout enabled and sufficient balance
    const [eligibleHosts] = await pool.query(`
      SELECT 
        u.id as host_id,
        u.email,
        u.name,
        u.auto_payout_enabled,
        u.auto_payout_method,
        u.auto_payout_details,
        SUM(p.host_earnings) as available_balance
      FROM users u
      JOIN payments p ON p.host_id = u.id
      WHERE u.role = 'host'
        AND u.auto_payout_enabled = 1
        AND p.status = 'succeeded'
        AND p.id NOT IN (
          SELECT payment_id FROM payout_items WHERE payment_id IS NOT NULL
        )
      GROUP BY u.id
      HAVING available_balance >= 500
    `);

    console.log(`Found ${eligibleHosts.length} hosts eligible for auto-payout`);

    for (const host of eligibleHosts) {
      try {
        // Create automatic payout request
        const [result] = await pool.query(
          `INSERT INTO payouts (host_id, amount, payment_method, bank_details, status, is_automatic, created_at) 
           VALUES (?, ?, ?, ?, 'pending', 1, NOW())`,
          [
            host.host_id,
            host.available_balance,
            host.auto_payout_method || 'bank_transfer',
            host.auto_payout_details || '{}'
          ]
        );

        const payoutId = result.insertId;

        // Link payments to payout
        await pool.query(`
          INSERT INTO payout_items (payout_id, payment_id, amount)
          SELECT 
            ?,
            p.id,
            p.host_earnings
          FROM payments p
          WHERE p.host_id = ? 
            AND p.status = 'succeeded'
            AND p.id NOT IN (
              SELECT payment_id FROM payout_items WHERE payment_id IS NOT NULL
            )
        `, [payoutId, host.host_id]);

        // Create notification
        await pool.query(
          `INSERT INTO notifications (user_id, message, type, created_at) 
           VALUES (?, ?, 'auto_payout', NOW())`,
          [host.host_id, `Automatic payout of ₱${host.available_balance.toLocaleString()} has been initiated.`]
        );

        console.log(`✅ Auto-payout created for host ${host.name} (₱${host.available_balance})`);
        
      } catch (error) {
        console.error(`Failed to create auto-payout for host ${host.host_id}:`, error);
      }
    }

    // Notify admins about pending auto-payouts
    const [pendingCount] = await pool.query(
      `SELECT COUNT(*) as count FROM payouts WHERE status = 'pending' AND is_automatic = 1`
    );

    if (pendingCount[0].count > 0) {
      const [admins] = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const admin of admins) {
        await pool.query(
          `INSERT INTO notifications (user_id, message, type, created_at) 
           VALUES (?, ?, 'admin_auto_payouts', NOW())`,
          [admin.id, `${pendingCount[0].count} automatic payouts are pending approval.`]
        );
      }
    }

  } catch (error) {
    console.error("Error processing automatic payouts:", error);
  }
}

async function cleanupOldPayouts() {
  try {
    console.log("🧹 Cleaning up old rejected payouts...");
    
    // Delete rejected payouts older than 30 days
    const [result] = await pool.query(`
      DELETE FROM payouts 
      WHERE status = 'rejected' 
        AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    console.log(`Cleaned up ${result.affectedRows} old rejected payouts`);
  } catch (error) {
    console.error("Error cleaning up payouts:", error);
  }
}

async function sendPayoutReminders() {
  try {
    console.log("📧 Sending payout reminders...");
    
    // Find hosts with available balance > 1000 who haven't requested payout in 30 days
    const [hostsToRemind] = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        SUM(p.host_earnings) as available_balance,
        MAX(po.created_at) as last_payout_date
      FROM users u
      JOIN payments p ON p.host_id = u.id
      LEFT JOIN payouts po ON po.host_id = u.id
      WHERE u.role = 'host'
        AND p.status = 'succeeded'
        AND p.id NOT IN (
          SELECT payment_id FROM payout_items WHERE payment_id IS NOT NULL
        )
      GROUP BY u.id
      HAVING available_balance >= 1000
        AND (last_payout_date IS NULL OR last_payout_date < DATE_SUB(NOW(), INTERVAL 30 DAY))
    `);

    for (const host of hostsToRemind) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, type, created_at) 
         VALUES (?, ?, 'payout_reminder', NOW())`,
        [host.id, `You have ₱${host.available_balance.toLocaleString()} available for payout. Request your earnings today!`]
      );
    }

    console.log(`Sent payout reminders to ${hostsToRemind.length} hosts`);
  } catch (error) {
    console.error("Error sending payout reminders:", error);
  }
}

function startCronJobs() {
  // Run every day at midnight (existing job)
  cron.schedule("0 0 * * *", async () => {
    console.log("🔔 Running auto-complete bookings job...");
    await autoCompleteBookings();
  });

  // Run every Monday at 9 AM for weekly auto-payouts
  cron.schedule("0 9 * * 1", async () => {
    console.log("🔔 Running weekly auto-payouts...");
    await processAutomaticPayouts();
  });

  // Run on the 1st of every month at 9 AM for monthly auto-payouts
  cron.schedule("0 9 1 * *", async () => {
    console.log("🔔 Running monthly auto-payouts...");
    await processAutomaticPayouts();
  });

  // Run every Sunday at midnight to clean up old data
  cron.schedule("0 0 * * 0", async () => {
    console.log("🔔 Running cleanup tasks...");
    await cleanupOldPayouts();
  });

  // Run every Friday at 10 AM to send payout reminders
  cron.schedule("0 10 * * 5", async () => {
    console.log("🔔 Sending payout reminders...");
    await sendPayoutReminders();
  });

  // New job: Auto-complete reservations daily at 1 AM
  cron.schedule("0 1 * * *", async () => {
    console.log("🔔 Running auto-complete reservations job...");
    await autoCompleteReservations();
});

  console.log("✅ All cron jobs scheduled successfully");
}

module.exports = startCronJobs;